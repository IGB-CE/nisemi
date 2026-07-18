import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase, CAR_PHOTOS_BUCKET } from '../lib/supabase.js';
import { albanianMobileSchema } from '../lib/phone.js';
import { deleteUserAccount } from '../lib/deleteUser.js';

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
  const ok = await deleteUserAccount(req.userId!);
  if (!ok) {
    res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    return;
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
