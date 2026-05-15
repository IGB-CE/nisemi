import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';

const router = Router();

const tripSchema = z.object({
  originCityId: z.string(),
  destCityId: z.string(),
  departureAt: z.string().datetime(),
  pricePerSeat: z.number().positive(),
  totalSeats: z.number().int().min(1).max(8),
  notes: z.string().optional(),
});

const searchSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  date: z.string().optional(),
  seats: z.coerce.number().int().min(1).optional().default(1),
});

router.get('/', async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { from, to, date, seats } = parsed.data;

  const where: Record<string, unknown> = {
    status: 'SCHEDULED',
    seatsAvailable: { gte: seats },
    departureAt: { gte: new Date() },
  };
  if (from) where.originCityId = from;
  if (to) where.destCityId = to;
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    where.departureAt = { gte: d, lt: next };
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      originCity: true,
      destCity: true,
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          driverProfile: { select: { rating: true } },
        },
      },
    },
    orderBy: { departureAt: 'asc' },
  });

  const now = Date.now();
  const sorted = [...trips].sort((a, b) => {
    const aBoosted = a.boostedUntil && a.boostedUntil.getTime() > now ? 1 : 0;
    const bBoosted = b.boostedUntil && b.boostedUntil.getTime() > now ? 1 : 0;
    if (aBoosted !== bBoosted) return bBoosted - aBoosted;
    return a.departureAt.getTime() - b.departureAt.getTime();
  });
  res.json(sorted);
});

router.post('/:id/boost', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'SCHEDULED') {
    res.status(400).json({ error: 'Vetëm udhëtimet aktive mund të promovohen' });
    return;
  }
  const boostedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const updated = await prisma.trip.update({
    where: { id: req.params.id },
    data: { boostedUntil },
    select: { id: true, boostedUntil: true },
  });
  res.json(updated);
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = tripSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: req.userId } });
  if (!driverProfile) {
    res.status(403).json({ error: 'Must have a driver profile to publish trips' });
    return;
  }

  const { totalSeats, ...rest } = parsed.data;
  const trip = await prisma.trip.create({
    data: {
      ...rest,
      totalSeats,
      seatsAvailable: totalSeats,
      driverId: req.userId!,
      departureAt: new Date(rest.departureAt),
    },
    include: { originCity: true, destCity: true },
  });
  res.status(201).json(trip);
});

router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const trips = await prisma.trip.findMany({
    where: { driverId: req.userId },
    include: {
      originCity: true,
      destCity: true,
      reservations: {
        include: { passenger: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      },
    },
    orderBy: { departureAt: 'desc' },
  });
  res.json(trips);
});

router.get('/:id', async (req, res) => {
  const trip = await prisma.trip.findUnique({
    where: { id: req.params.id },
    include: {
      originCity: true,
      destCity: true,
      driver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, driverProfile: true } },
      reservations: {
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        select: {
          id: true,
          seats: true,
          status: true,
          passenger: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json(trip);
});

router.post('/:id/start', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'SCHEDULED') {
    res.status(400).json({ error: 'Udhëtimi nuk mund të fillojë në këtë gjendje' });
    return;
  }
  const updated = await prisma.trip.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  const accepted = await prisma.reservation.findMany({
    where: { tripId: req.params.id, status: 'ACCEPTED' },
    include: { passenger: { include: { pushTokens: true } } },
  });
  const tokens = accepted.flatMap((r) => r.passenger.pushTokens.map((t) => t.token));
  if (tokens.length) {
    await sendPushNotifications(
      tokens,
      'Udhëtimi nisi',
      'Shoferi nisi udhëtimin. Mund të ndiqni vendndodhjen në kohë reale.',
    );
  }

  res.json(updated);
});

router.post('/:id/end', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'IN_PROGRESS') {
    res.status(400).json({ error: 'Udhëtimi nuk është në vazhdim' });
    return;
  }
  const updated = await prisma.trip.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', endedAt: new Date() },
  });
  res.json(updated);
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const updated = await prisma.trip.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  res.json(updated);
});

export default router;
