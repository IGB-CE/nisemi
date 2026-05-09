import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';

const router = Router();

const bookSchema = z.object({
  tripId: z.string(),
  seats: z.number().int().min(1).max(8).default(1),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { tripId, seats } = parsed.data;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.status !== 'SCHEDULED') { res.status(404).json({ error: 'Trip not available' }); return; }
  if (trip.driverId === req.userId) { res.status(400).json({ error: 'Cannot book your own trip' }); return; }
  if (trip.seatsAvailable < seats) { res.status(400).json({ error: 'Not enough seats available' }); return; }

  const existing = await prisma.reservation.findFirst({ where: { tripId, passengerId: req.userId, status: { in: ['PENDING', 'ACCEPTED'] } } });
  if (existing) { res.status(409).json({ error: 'Already have an active reservation for this trip' }); return; }

  const reservation = await prisma.reservation.create({
    data: { tripId, passengerId: req.userId!, seats },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  res.status(201).json(reservation);
});

router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const reservations = await prisma.reservation.findMany({
    where: { passengerId: req.userId },
    include: {
      trip: {
        include: {
          originCity: true,
          destCity: true,
          driver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, driverProfile: { select: { rating: true } } } },
          reviews: { where: { authorId: req.userId! }, select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations);
});

router.patch('/:id/accept', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  if (!reservation) { res.status(404).json({ error: 'Reservation not found' }); return; }
  if (reservation.trip.driverId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (reservation.status !== 'PENDING') { res.status(400).json({ error: 'Reservation is not pending' }); return; }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } }),
    prisma.trip.update({ where: { id: reservation.tripId }, data: { seatsAvailable: { decrement: reservation.seats } } }),
  ]);

  const tokens = await prisma.pushToken.findMany({ where: { userId: reservation.passengerId }, select: { token: true } });
  await sendPushNotifications(
    tokens.map(t => t.token),
    'Rezervimi u pranua ✅',
    `Udhëtimi ${reservation.trip.originCity.name} → ${reservation.trip.destCity.name} u konfirmua.`
  );

  res.json(updated);
});

router.patch('/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  if (!reservation) { res.status(404).json({ error: 'Reservation not found' }); return; }
  if (reservation.trip.driverId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (reservation.status !== 'PENDING') { res.status(400).json({ error: 'Reservation is not pending' }); return; }

  const updated = await prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });

  const tokens = await prisma.pushToken.findMany({ where: { userId: reservation.passengerId }, select: { token: true } });
  await sendPushNotifications(
    tokens.map(t => t.token),
    'Rezervimi u refuzua ❌',
    `Udhëtimi ${reservation.trip.originCity.name} → ${reservation.trip.destCity.name} u refuzua nga shoferi.`
  );

  res.json(updated);
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id }, include: { trip: true } });
  if (!reservation) { res.status(404).json({ error: 'Reservation not found' }); return; }
  if (reservation.passengerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
  if (!['PENDING', 'ACCEPTED'].includes(reservation.status)) { res.status(400).json({ error: 'Cannot cancel this reservation' }); return; }

  const ops = [prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } })];
  if (reservation.status === 'ACCEPTED') {
    ops.push(prisma.trip.update({ where: { id: reservation.tripId }, data: { seatsAvailable: { increment: reservation.seats } } }) as never);
  }
  const [updated] = await prisma.$transaction(ops);
  res.json(updated);
});

export default router;
