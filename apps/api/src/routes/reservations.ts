import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';
import { matchesRoute } from '../lib/routeMatch.js';
import {
  isAdmin,
  isWithinCancelWindow,
  passengerHasOverlappingOwnTrip,
  passengerHasOverlappingReservation,
} from '../lib/tripRules.js';

const router = Router();

const bookSchema = z.object({
  tripId: z.string(),
  seats: z.number().int().min(1).max(8).default(1),
  pickupLat: z.number().min(-90).max(90).optional(),
  pickupLng: z.number().min(-180).max(180).optional(),
  pickupLabel: z.string().min(1).max(300).optional(),
  dropoffLat: z.number().min(-90).max(90).optional(),
  dropoffLng: z.number().min(-180).max(180).optional(),
  dropoffLabel: z.string().min(1).max(300).optional(),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = bookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { tripId, seats, pickupLat, pickupLng, pickupLabel, dropoffLat, dropoffLng, dropoffLabel } = parsed.data;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || trip.status !== 'SCHEDULED') {
    res.status(404).json({ error: 'Trip not available' });
    return;
  }
  if (trip.driverId === req.userId) {
    res.status(400).json({ error: 'Cannot book your own trip' });
    return;
  }
  if (trip.seatsAvailable < seats) {
    res.status(400).json({ error: 'Not enough seats available' });
    return;
  }

  const hasPickup = pickupLat !== undefined && pickupLng !== undefined;
  const hasDropoff = dropoffLat !== undefined && dropoffLng !== undefined;
  if (hasPickup !== hasDropoff) {
    res.status(400).json({ error: 'Pickup and dropoff must be provided together' });
    return;
  }
  if (hasPickup && trip.routePolyline) {
    const result = matchesRoute({
      routePolyline: trip.routePolyline,
      driverMaxDetourM: trip.maxDetourM,
      pickup: { lat: pickupLat!, lng: pickupLng! },
      dropoff: { lat: dropoffLat!, lng: dropoffLng! },
      passengerSearchRadiusM: trip.maxDetourM,
    });
    if (!result.matched) {
      const msg =
        result.reason === 'wrong_direction'
          ? 'Pikat e marrjes dhe lëshimit nuk janë në drejtimin e udhëtimit'
          : 'Pikat e marrjes ose lëshimit janë larg rrugës së udhëtimit';
      res.status(400).json({ error: msg, detail: result });
      return;
    }
  }

  const existing = await prisma.reservation.findFirst({
    where: { tripId, passengerId: req.userId, status: { in: ['PENDING', 'ACCEPTED'] } },
  });
  if (existing) {
    res.status(409).json({ error: 'Already have an active reservation for this trip' });
    return;
  }

  if (!isAdmin(req.userRole)) {
    const overlapRes = await passengerHasOverlappingReservation(req.userId!, trip.departureAt);
    if (overlapRes) {
      res.status(400).json({
        error: 'Keni një rezervim tjetër aktiv brenda 1 orë nga kjo orë nisjeje',
      });
      return;
    }
    const overlapOwn = await passengerHasOverlappingOwnTrip(req.userId!, trip.departureAt);
    if (overlapOwn) {
      res.status(400).json({
        error: 'Keni një udhëtim të publikuar brenda 1 orë nga kjo orë nisjeje',
      });
      return;
    }
  }

  const reservation = await prisma.reservation.create({
    data: {
      tripId,
      passengerId: req.userId!,
      seats,
      pickupLat,
      pickupLng,
      pickupLabel,
      dropoffLat,
      dropoffLng,
      dropoffLabel,
    },
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
          driver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              driverProfile: { select: { rating: true } },
            },
          },
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
  if (!reservation) {
    res.status(404).json({ error: 'Reservation not found' });
    return;
  }
  if (reservation.trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (reservation.status !== 'PENDING') {
    res.status(400).json({ error: 'Reservation is not pending' });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } }),
    prisma.trip.update({
      where: { id: reservation.tripId },
      data: { seatsAvailable: { decrement: reservation.seats } },
    }),
  ]);

  const tokens = await prisma.pushToken.findMany({
    where: { userId: reservation.passengerId },
    select: { token: true },
  });
  await sendPushNotifications(
    tokens.map((t) => t.token),
    'Rezervimi u pranua ✅',
    `Udhëtimi ${reservation.trip.originCity?.name ?? reservation.trip.originLabel ?? 'Origjina'} → ${reservation.trip.destCity?.name ?? reservation.trip.destLabel ?? 'Destinacioni'} u konfirmua.`,
  );

  res.json(updated);
});

router.patch('/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  if (!reservation) {
    res.status(404).json({ error: 'Reservation not found' });
    return;
  }
  if (reservation.trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (reservation.status !== 'PENDING') {
    res.status(400).json({ error: 'Reservation is not pending' });
    return;
  }

  const updated = await prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });

  const tokens = await prisma.pushToken.findMany({
    where: { userId: reservation.passengerId },
    select: { token: true },
  });
  await sendPushNotifications(
    tokens.map((t) => t.token),
    'Rezervimi u refuzua ❌',
    `Udhëtimi ${reservation.trip.originCity?.name ?? reservation.trip.originLabel ?? 'Origjina'} → ${reservation.trip.destCity?.name ?? reservation.trip.destLabel ?? 'Destinacioni'} u refuzua nga shoferi.`,
  );

  res.json(updated);
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({ where: { id: req.params.id }, include: { trip: true } });
  if (!reservation) {
    res.status(404).json({ error: 'Reservation not found' });
    return;
  }
  if (reservation.passengerId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (!['PENDING', 'ACCEPTED'].includes(reservation.status)) {
    res.status(400).json({ error: 'Cannot cancel this reservation' });
    return;
  }
  if (!isAdmin(req.userRole) && isWithinCancelWindow(reservation.trip.departureAt)) {
    res.status(400).json({
      error: 'Nuk mund të anuloni rezervimin më pak se 60 minuta para nisjes',
    });
    return;
  }

  const ops = [prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } })];
  if (reservation.status === 'ACCEPTED') {
    ops.push(
      prisma.trip.update({
        where: { id: reservation.tripId },
        data: { seatsAvailable: { increment: reservation.seats } },
      }) as never,
    );
  }
  const [updated] = await prisma.$transaction(ops);
  res.json(updated);
});

router.patch('/:id/remove', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  if (!reservation) {
    res.status(404).json({ error: 'Reservation not found' });
    return;
  }
  if (reservation.trip.driverId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (reservation.status !== 'ACCEPTED') {
    res.status(400).json({ error: 'Mund të hiqen vetëm pasagjerët e pranuar' });
    return;
  }
  if (!isAdmin(req.userRole) && isWithinCancelWindow(reservation.trip.departureAt)) {
    res.status(400).json({
      error: 'Nuk mund të hiqni pasagjer më pak se 60 minuta para nisjes',
    });
    return;
  }

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({ where: { id: req.params.id }, data: { status: 'REMOVED' } }),
    prisma.trip.update({
      where: { id: reservation.tripId },
      data: { seatsAvailable: { increment: reservation.seats } },
    }),
  ]);

  const tokens = await prisma.pushToken.findMany({
    where: { userId: reservation.passengerId },
    select: { token: true },
  });
  await sendPushNotifications(
    tokens.map((t) => t.token),
    'Shoferi ju hoqi nga udhëtimi',
    `Udhëtimi ${reservation.trip.originCity?.name ?? reservation.trip.originLabel ?? 'Origjina'} → ${reservation.trip.destCity?.name ?? reservation.trip.destLabel ?? 'Destinacioni'}`,
  );

  res.json(updated);
});

export default router;
