import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';
import { endTripRoom } from '../realtime/index.js';
import { matchesRoute, validatePolylineEndpoints } from '../lib/routeMatch.js';
import { notifyMatchingAlerts } from '../lib/rideAlerts.js';

const router = Router();

const latLng = z
  .object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  })
  .strict();

const tripSchema = z.object({
  originCityId: z.string().optional(),
  destCityId: z.string().optional(),
  originLat: z.number().min(-90).max(90).optional(),
  originLng: z.number().min(-180).max(180).optional(),
  originLabel: z.string().min(1).max(300).optional(),
  destLat: z.number().min(-90).max(90).optional(),
  destLng: z.number().min(-180).max(180).optional(),
  destLabel: z.string().min(1).max(300).optional(),
  routePolyline: z.string().min(2).optional(),
  routeDistanceM: z.number().int().nonnegative().optional(),
  routeDurationS: z.number().int().nonnegative().optional(),
  routeAltIndex: z.number().int().min(0).max(5).optional(),
  tripType: z.enum(['INTERCITY', 'INTRACITY']).optional(),
  maxDetourM: z.number().int().min(50).max(5000).optional(),
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
  originLat: z.coerce.number().min(-90).max(90).optional(),
  originLng: z.coerce.number().min(-180).max(180).optional(),
  destLat: z.coerce.number().min(-90).max(90).optional(),
  destLng: z.coerce.number().min(-180).max(180).optional(),
  searchRadiusM: z.coerce.number().int().min(50).max(5000).optional().default(500),
  tripType: z.enum(['INTERCITY', 'INTRACITY']).optional(),
});

router.get('/', async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { from, to, date, seats, originLat, originLng, destLat, destLng, searchRadiusM, tripType } = parsed.data;

  const isGeoSearch =
    originLat !== undefined && originLng !== undefined && destLat !== undefined && destLng !== undefined;

  const where: Record<string, unknown> = {
    status: 'SCHEDULED',
    seatsAvailable: { gte: seats },
    departureAt: { gte: new Date() },
  };
  if (from) where.originCityId = from;
  if (to) where.destCityId = to;
  if (tripType) where.tripType = tripType;
  if (isGeoSearch) where.routePolyline = { not: null };
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

  let filtered = trips;
  if (isGeoSearch) {
    const pickup = { lat: originLat!, lng: originLng! };
    const dropoff = { lat: destLat!, lng: destLng! };
    filtered = trips.filter((t) => {
      if (!t.routePolyline) return false;
      const result = matchesRoute({
        routePolyline: t.routePolyline,
        driverMaxDetourM: t.maxDetourM,
        pickup,
        dropoff,
        passengerSearchRadiusM: searchRadiusM,
      });
      return result.matched;
    });
  }

  const now = Date.now();
  const sorted = [...filtered].sort((a, b) => {
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

  const data = parsed.data;

  if (!data.originCityId && (data.originLat === undefined || data.originLng === undefined)) {
    res.status(400).json({ error: 'Origin city or coordinates required' });
    return;
  }
  if (!data.destCityId && (data.destLat === undefined || data.destLng === undefined)) {
    res.status(400).json({ error: 'Destination city or coordinates required' });
    return;
  }

  if (
    data.routePolyline &&
    data.originLat !== undefined &&
    data.originLng !== undefined &&
    data.destLat !== undefined &&
    data.destLng !== undefined
  ) {
    const valid = validatePolylineEndpoints(
      data.routePolyline,
      { lat: data.originLat, lng: data.originLng },
      { lat: data.destLat, lng: data.destLng },
    );
    if (!valid) {
      res.status(400).json({ error: 'Route polyline endpoints do not match origin/destination' });
      return;
    }
  }

  const { totalSeats, ...rest } = data;
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
  notifyMatchingAlerts(trip.id).catch((e) => console.error('[rideAlert] notify failed', e));
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
  await endTripRoom(req.params.id);
  res.json(updated);
});

router.get('/:id/locations', requireAuth, async (req: AuthRequest, res) => {
  const trip = await prisma.trip.findUnique({ where: { id: req.params.id } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const isDriver = trip.driverId === req.userId;
  let isAcceptedPassenger = false;
  if (!isDriver) {
    const reservation = await prisma.reservation.findFirst({
      where: { tripId: req.params.id, passengerId: req.userId, status: 'ACCEPTED' },
    });
    isAcceptedPassenger = Boolean(reservation);
  }
  if (!isDriver && !isAcceptedPassenger && req.userRole !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const locations = await prisma.tripLocation.findMany({
    where: { tripId: req.params.id },
    orderBy: { recordedAt: 'asc' },
    select: {
      lat: true,
      lng: true,
      heading: true,
      speed: true,
      accuracy: true,
      recordedAt: true,
    },
  });
  res.json(locations);
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
  const wasInProgress = trip.status === 'IN_PROGRESS';
  const updated = await prisma.trip.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
  if (wasInProgress) {
    await endTripRoom(req.params.id);
  }
  res.json(updated);
});

export default router;
