import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { notifyMatchingRequests } from '../lib/rideAlerts.js';
import { isAdmin } from '../lib/tripRules.js';

const router = Router();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const createSchema = z.object({
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  originLabel: z.string().min(1).max(300),
  destLat: z.number().min(-90).max(90),
  destLng: z.number().min(-180).max(180),
  destLabel: z.string().min(1).max(300),
  date: z.string().datetime().optional(),
  searchRadiusM: z.number().int().min(50).max(5000).optional().default(500),
  tripType: z.enum(['INTERCITY', 'INTRACITY']).optional(),
  pricePerSeat: z.number().min(0).max(100_000).optional(),
  seats: z.number().int().min(1).max(8).optional().default(1),
  note: z.string().max(500).optional(),
});

function computeExpiresAt(dateStr: string | undefined): Date {
  if (dateStr) {
    const d = new Date(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return new Date(Date.now() + THIRTY_DAYS_MS);
}

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const alert = await prisma.rideAlert.create({
    data: {
      passengerId: req.userId!,
      originLat: data.originLat,
      originLng: data.originLng,
      originLabel: data.originLabel,
      destLat: data.destLat,
      destLng: data.destLng,
      destLabel: data.destLabel,
      date: data.date ? new Date(data.date) : null,
      searchRadiusM: data.searchRadiusM,
      tripType: data.tripType,
      expiresAt: computeExpiresAt(data.date),
      pricePerSeat: data.pricePerSeat,
      seats: data.seats,
      note: data.note,
      // Set explicitly rather than relying on the schema default, which stays
      // false to keep pre-existing private alerts out of the driver feed.
      visibleToDrivers: true,
    },
  });
  notifyMatchingRequests(alert.id).catch((e) => console.error('[rideAlert] driver notify failed', e));
  res.status(201).json(alert);
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const alerts = await prisma.rideAlert.findMany({
    where: { passengerId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(alerts);
});

const browseSchema = z.object({
  date: z.string().datetime().optional(),
  tripType: z.enum(['INTERCITY', 'INTRACITY']).optional(),
  take: z.coerce.number().int().min(1).max(100).optional().default(50),
  skip: z.coerce.number().int().min(0).optional().default(0),
});

// Driver-facing feed of open passenger requests.
router.get('/browse', requireAuth, async (req: AuthRequest, res) => {
  if (req.userRole !== 'DRIVER' && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Vetëm shoferët mund të shohin kërkesat' });
    return;
  }
  const parsed = browseSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { date, tripType, take, skip } = parsed.data;

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: req.userId }, { blockedId: req.userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedWith = blocks.map((b) => (b.blockerId === req.userId ? b.blockedId : b.blockerId));

  let dateFilter: { gte: Date; lte: Date } | undefined;
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  }

  const alerts = await prisma.rideAlert.findMany({
    where: {
      active: true,
      visibleToDrivers: true,
      expiresAt: { gt: new Date() },
      passengerId: { not: req.userId, notIn: blockedWith },
      // Requests from blocked or deleted accounts shouldn't surface to drivers.
      passenger: { status: 'ACTIVE' },
      ...(tripType ? { tripType } : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    take,
    skip,
    include: {
      passenger: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  // Boosted requests float to the top of the feed, same as boosted trips.
  const now = Date.now();
  const sorted = [...alerts].sort((a, b) => {
    const aBoosted = a.boostedUntil && a.boostedUntil.getTime() > now ? 1 : 0;
    const bBoosted = b.boostedUntil && b.boostedUntil.getTime() > now ? 1 : 0;
    if (aBoosted !== bBoosted) return bBoosted - aBoosted;
    return 0;
  });
  res.json(sorted);
});

router.post('/:id/boost', requireAuth, async (req: AuthRequest, res) => {
  const alert = await prisma.rideAlert.findUnique({ where: { id: req.params.id } });
  if (!alert || alert.passengerId !== req.userId) {
    res.status(404).json({ error: 'Kërkesa nuk u gjet' });
    return;
  }
  if (!alert.active || !alert.visibleToDrivers || alert.expiresAt <= new Date()) {
    res.status(400).json({ error: 'Vetëm kërkesat aktive dhe të dukshme mund të promovohen' });
    return;
  }
  const boostedUntil = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const updated = await prisma.rideAlert.update({
    where: { id: req.params.id },
    data: { boostedUntil },
  });
  res.json(updated);
});

const updateSchema = z.object({
  active: z.boolean().optional(),
  visibleToDrivers: z.boolean().optional(),
  pricePerSeat: z.number().min(0).max(100_000).nullable().optional(),
  seats: z.number().int().min(1).max(8).optional(),
  note: z.string().max(500).nullable().optional(),
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const alert = await prisma.rideAlert.findUnique({ where: { id: req.params.id } });
  if (!alert || alert.passengerId !== req.userId) {
    res.status(404).json({ error: 'Njoftimi nuk u gjet' });
    return;
  }
  const updated = await prisma.rideAlert.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  // Going public (or back on air) is the point at which drivers should hear
  // about it — a request made private at creation still reaches them on opt-in.
  if (updated.active && updated.visibleToDrivers) {
    notifyMatchingRequests(updated.id).catch((e) =>
      console.error('[rideAlert] driver notify failed', e),
    );
  }
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const alert = await prisma.rideAlert.findUnique({ where: { id: req.params.id } });
  if (!alert || alert.passengerId !== req.userId) {
    res.status(404).json({ error: 'Njoftimi nuk u gjet' });
    return;
  }
  // Messages and conversation-deletion rows cascade with the request, so any
  // chat a driver started about it disappears too. Warn in the UI before this.
  await prisma.rideAlert.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
