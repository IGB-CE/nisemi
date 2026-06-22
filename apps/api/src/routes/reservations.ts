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
    res.status(404).json({ error: 'Udhëtimi nuk është i disponueshëm' });
    return;
  }
  if (trip.driverId === req.userId) {
    res.status(400).json({ error: 'Nuk mund të rezervoni udhëtimin tuaj' });
    return;
  }
  if (trip.seatsAvailable < seats) {
    res.status(400).json({ error: 'Nuk ka vende të mjaftueshme' });
    return;
  }

  if (trip.genderRestriction !== 'ANY') {
    const passenger = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { gender: true },
    });
    if (!passenger || passenger.gender === 'UNSPECIFIED') {
      res.status(400).json({
        error: 'Plotësoni gjininë në profilin tuaj për të rezervuar këtë udhëtim',
      });
      return;
    }
    const required = trip.genderRestriction === 'FEMALE_ONLY' ? 'FEMALE' : 'MALE';
    if (passenger.gender !== required) {
      res.status(400).json({ error: 'Ky udhëtim është i kufizuar për një gjini tjetër' });
      return;
    }
  }

  const hasPickup = pickupLat !== undefined && pickupLng !== undefined;
  const hasDropoff = dropoffLat !== undefined && dropoffLng !== undefined;
  if (hasPickup !== hasDropoff) {
    res.status(400).json({ error: 'Vendi i marrjes dhe i zbritjes duhen dhënë bashkë' });
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
    res.status(409).json({ error: 'Keni tashmë një rezervim aktiv për këtë udhëtim' });
    return;
  }

  if (!isAdmin(req.userRole)) {
    const overlapRes = await passengerHasOverlappingReservation(
      req.userId!,
      trip.departureAt,
      trip.routeDurationS,
    );
    if (overlapRes) {
      res.status(400).json({
        error: 'Keni një rezervim tjetër aktiv që mbivendoset me këtë udhëtim',
      });
      return;
    }
    const overlapOwn = await passengerHasOverlappingOwnTrip(
      req.userId!,
      trip.departureAt,
      trip.routeDurationS,
    );
    if (overlapOwn) {
      res.status(400).json({
        error: 'Keni një udhëtim të publikuar që mbivendoset me këtë udhëtim',
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

  const passenger = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { firstName: true, lastName: true },
  });
  const driverTokens = await prisma.pushToken.findMany({
    where: { userId: trip.driverId },
    select: { token: true },
  });
  void sendPushNotifications(
    driverTokens.map((t) => t.token),
    'Rezervim i ri 🎟️',
    `${`${passenger?.firstName ?? ''} ${passenger?.lastName ?? ''}`.trim() || 'Një pasagjer'} rezervoi ${seats} vend(e) — ${reservation.trip.originCity?.name ?? reservation.trip.originLabel ?? 'Origjina'} → ${reservation.trip.destCity?.name ?? reservation.trip.destLabel ?? 'Destinacioni'}`,
    { type: 'booking', tripId },
  );

  res.status(201).json(reservation);
});

router.get('/my', requireAuth, async (req: AuthRequest, res) => {
  const reservations = await prisma.reservation.findMany({
    where: {
      passengerId: req.userId,
      trip: { hiddenBy: { none: { userId: req.userId! } } },
    },
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
    res.status(404).json({ error: 'Rezervimi nuk u gjet' });
    return;
  }
  if (reservation.trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Nuk keni leje' });
    return;
  }
  if (reservation.status !== 'PENDING') {
    res.status(400).json({ error: 'Rezervimi nuk është në pritje' });
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
    { type: 'reservation', tripId: reservation.tripId },
  );

  res.json(updated);
});

router.patch('/:id/reject', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  if (!reservation) {
    res.status(404).json({ error: 'Rezervimi nuk u gjet' });
    return;
  }
  if (reservation.trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Nuk keni leje' });
    return;
  }
  if (reservation.status !== 'PENDING') {
    res.status(400).json({ error: 'Rezervimi nuk është në pritje' });
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
    { type: 'reservation', tripId: reservation.tripId },
  );

  res.json(updated);
});

router.patch('/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: {
      trip: { include: { originCity: true, destCity: true } },
      passenger: { select: { firstName: true, lastName: true } },
    },
  });
  if (!reservation) {
    res.status(404).json({ error: 'Rezervimi nuk u gjet' });
    return;
  }
  if (reservation.passengerId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Nuk keni leje' });
    return;
  }
  if (!['PENDING', 'ACCEPTED'].includes(reservation.status)) {
    res.status(400).json({ error: 'Ky rezervim nuk mund të anulohet' });
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

  const driverTokens = await prisma.pushToken.findMany({
    where: { userId: reservation.trip.driverId },
    select: { token: true },
  });
  void sendPushNotifications(
    driverTokens.map((t) => t.token),
    'Një rezervim u anulua',
    `${`${reservation.passenger.firstName} ${reservation.passenger.lastName}`.trim()} anuloi rezervimin — ${reservation.trip.originCity?.name ?? reservation.trip.originLabel ?? 'Origjina'} → ${reservation.trip.destCity?.name ?? reservation.trip.destLabel ?? 'Destinacioni'}`,
    { type: 'booking', tripId: reservation.tripId },
  );

  res.json(updated);
});

router.patch('/:id/remove', requireAuth, async (req: AuthRequest, res) => {
  const reservation = await prisma.reservation.findUnique({
    where: { id: req.params.id },
    include: { trip: { include: { originCity: true, destCity: true } } },
  });
  if (!reservation) {
    res.status(404).json({ error: 'Rezervimi nuk u gjet' });
    return;
  }
  if (reservation.trip.driverId !== req.userId && !isAdmin(req.userRole)) {
    res.status(403).json({ error: 'Nuk keni leje' });
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
    { type: 'reservation', tripId: reservation.tripId },
  );

  res.json(updated);
});

export default router;
