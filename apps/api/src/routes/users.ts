import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase, CAR_PHOTOS_BUCKET } from '../lib/supabase.js';
import { albanianMobileSchema } from '../lib/phone.js';

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
    res.status(404).json({ error: 'User not found' });
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
    res.status(500).json({ error: `Upload failed: ${error.message}` });
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
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});

export default router;
