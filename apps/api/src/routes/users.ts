import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase, CAR_PHOTOS_BUCKET, DRIVER_DOCS_BUCKET } from '../lib/supabase.js';
import { albanianMobileSchema } from '../lib/phone.js';
import { sendPushNotifications } from '../lib/push.js';

const router = Router();

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: albanianMobileSchema.optional(),
  avatarUrl: z.string().url().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']).optional(),
});

const photoSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatarUrl: true,
      role: true,
      status: true,
      gender: true,
      createdAt: true,
      driverProfile: true,
    },
  });
  if (!user) {
    res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    return;
  }
  res.json(user);
});

router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        gender: true,
      },
    });
    res.json(user);
  } catch (err) {
    // A duplicate phone trips the unique constraint; report it as a clean 409
    // instead of letting it bubble up as an unhandled 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'Ky numër telefoni është tashmë në përdorim' });
      return;
    }
    throw err;
  }
});

router.post('/me/password', requireAuth, async (req: AuthRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    return;
  }
  if (!user.passwordHash) {
    res.status(400).json({ error: 'Llogaria përdor identifikim social — nuk ka fjalëkalim për të ndryshuar' });
    return;
  }
  const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: 'Fjalëkalimi aktual nuk është i saktë' });
    return;
  }
  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  res.json({ ok: true });
});

router.post('/me/avatar', requireAuth, async (req: AuthRequest, res) => {
  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const current = await prisma.user.findUnique({ where: { id: req.userId }, select: { avatarUrl: true } });
  const ext = parsed.data.mimeType.split('/')[1];
  const path = `avatars/${req.userId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(parsed.data.base64, 'base64');

  if (current?.avatarUrl) {
    const old = current.avatarUrl.split(`/${CAR_PHOTOS_BUCKET}/`)[1];
    if (old)
      await supabase.storage
        .from(CAR_PHOTOS_BUCKET)
        .remove([old])
        .catch(() => {});
  }

  const { error } = await supabase.storage.from(CAR_PHOTOS_BUCKET).upload(path, buffer, {
    contentType: parsed.data.mimeType,
    upsert: true,
  });
  if (error) {
    res.status(500).json({ error: `Ngarkimi dështoi: ${error.message}` });
    return;
  }

  const { data: pub } = supabase.storage.from(CAR_PHOTOS_BUCKET).getPublicUrl(path);
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { avatarUrl: pub.publicUrl },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, role: true },
  });
  res.json(user);
});

// Permanently delete the current user's account. We keep the User row but strip
// every piece of personal data and destroy all login paths (one-way anonymize),
// which satisfies Apple 5.1.1(v) and Google Play deletion rules while leaving
// other users' trip/review history intact. Re-registering creates a fresh
// account because the email/phone/googleId are released.
router.delete('/me', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      avatarUrl: true,
      driverProfile: { select: { carPhotoUrl: true, licenseUrl: true } },
    },
  });
  if (!user) {
    res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    return;
  }

  // Seats held by the user's accepted reservations must be returned to those
  // trips before the reservations are cancelled.
  const acceptedReservations = await prisma.reservation.findMany({
    where: { passengerId: userId, status: 'ACCEPTED' },
    select: { tripId: true, seats: true },
  });

  // The user's own upcoming/active trips will be cancelled below; collect their
  // passengers' push tokens now so we can warn them afterwards.
  const cancelledTrips = await prisma.trip.findMany({
    where: { driverId: userId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
    include: {
      originCity: true,
      destCity: true,
      reservations: {
        where: { status: { in: ['PENDING', 'ACCEPTED'] } },
        include: { passenger: { include: { pushTokens: true } } },
      },
    },
  });

  await prisma.$transaction([
    ...acceptedReservations.map((r) =>
      prisma.trip.update({
        where: { id: r.tripId },
        data: { seatsAvailable: { increment: r.seats } },
      }),
    ),
    prisma.reservation.updateMany({
      where: { passengerId: userId, status: { in: ['PENDING', 'ACCEPTED'] } },
      data: { status: 'CANCELLED' },
    }),
    // Cancel the user's own upcoming/active trips so passengers aren't left
    // waiting on a ghost trip.
    prisma.trip.updateMany({
      where: { driverId: userId, status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      data: { status: 'CANCELLED' },
    }),
    // Drop records that are purely personal to this user.
    prisma.message.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
    prisma.pushToken.deleteMany({ where: { userId } }),
    prisma.rideAlert.deleteMany({ where: { passengerId: userId } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } }),
    prisma.conversationDeletion.deleteMany({ where: { userId } }),
    prisma.tripHistoryHidden.deleteMany({ where: { userId } }),
    prisma.driverProfile.deleteMany({ where: { userId } }),
    // Scrub the surviving row: remove all PII and any credential that could log
    // back in. Reviews, ratings and completed trips stay, now shown as a
    // generic deleted user.
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@deleted.nisemi.al`,
        phone: null,
        firstName: 'Përdorues',
        lastName: 'i fshirë',
        passwordHash: null,
        googleId: null,
        avatarUrl: null,
        gender: 'UNSPECIFIED',
        status: 'DELETED',
      },
    }),
  ]);

  // Best-effort storage purge (outside the DB transaction). carPhoto/avatar are
  // public URLs; licenseUrl is the raw object path in the private docs bucket.
  const avatarPath = user.avatarUrl?.split(`/${CAR_PHOTOS_BUCKET}/`)[1];
  if (avatarPath) await supabase.storage.from(CAR_PHOTOS_BUCKET).remove([avatarPath]).catch(() => {});
  const carPhotoPath = user.driverProfile?.carPhotoUrl?.split(`/${CAR_PHOTOS_BUCKET}/`)[1];
  if (carPhotoPath) await supabase.storage.from(CAR_PHOTOS_BUCKET).remove([carPhotoPath]).catch(() => {});
  const licensePath = user.driverProfile?.licenseUrl;
  if (licensePath) await supabase.storage.from(DRIVER_DOCS_BUCKET).remove([licensePath]).catch(() => {});

  // Warn passengers whose trips were cancelled by this account's deletion.
  for (const trip of cancelledTrips) {
    const tokens = trip.reservations.flatMap((r) => r.passenger.pushTokens.map((t) => t.token));
    if (!tokens.length) continue;
    void sendPushNotifications(
      tokens,
      'Udhëtimi u anulua',
      `Shoferi anuloi udhëtimin ${trip.originCity?.name ?? trip.originLabel ?? 'Origjina'} → ${trip.destCity?.name ?? trip.destLabel ?? 'Destinacioni'}.`,
      { type: 'reservation', tripId: trip.id },
    );
  }

  res.json({ ok: true });
});

router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      driverProfile: true,
      reviewsReceived: {
        select: {
          rating: true,
          comment: true,
          createdAt: true,
          author: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
  });
  if (!user) {
    res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    return;
  }
  res.json(user);
});

export default router;
