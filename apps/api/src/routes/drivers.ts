import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { supabase, CAR_PHOTOS_BUCKET } from '../lib/supabase.js';

const router = Router();

const driverSchema = z.object({
  carModel: z.string().min(1),
  carColor: z.string().min(1),
  carPlate: z.string().min(1),
});

const photoSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = driverSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const existing = await prisma.driverProfile.findUnique({ where: { userId: req.userId } });
  if (existing) { res.status(409).json({ error: 'Driver profile already exists' }); return; }

  const [profile] = await prisma.$transaction([
    prisma.driverProfile.create({ data: { ...parsed.data, userId: req.userId! } }),
    prisma.user.update({ where: { id: req.userId }, data: { role: 'DRIVER' } }),
  ]);
  res.status(201).json(profile);
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const profile = await prisma.driverProfile.findUnique({ where: { userId: req.userId } });
  if (!profile) { res.status(404).json({ error: 'Driver profile not found' }); return; }
  res.json(profile);
});

router.patch('/me', requireAuth, async (req: AuthRequest, res) => {
  const parsed = driverSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const profile = await prisma.driverProfile.update({ where: { userId: req.userId }, data: parsed.data });
  res.json(profile);
});

router.post('/me/car-photo', requireAuth, async (req: AuthRequest, res) => {
  const parsed = photoSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const profile = await prisma.driverProfile.findUnique({ where: { userId: req.userId } });
  if (!profile) { res.status(404).json({ error: 'Driver profile not found' }); return; }

  const ext = parsed.data.mimeType.split('/')[1];
  const path = `${req.userId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(parsed.data.base64, 'base64');

  if (profile.carPhotoUrl) {
    const old = profile.carPhotoUrl.split(`/${CAR_PHOTOS_BUCKET}/`)[1];
    if (old) await supabase.storage.from(CAR_PHOTOS_BUCKET).remove([old]).catch(() => {});
  }

  const { error } = await supabase.storage.from(CAR_PHOTOS_BUCKET).upload(path, buffer, {
    contentType: parsed.data.mimeType,
    upsert: true,
  });
  if (error) { res.status(500).json({ error: `Upload failed: ${error.message}` }); return; }

  const { data: pub } = supabase.storage.from(CAR_PHOTOS_BUCKET).getPublicUrl(path);
  const updated = await prisma.driverProfile.update({
    where: { userId: req.userId },
    data: { carPhotoUrl: pub.publicUrl },
  });
  res.json(updated);
});

router.get('/:userId', async (req, res) => {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: req.params.userId },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, createdAt: true } } },
  });
  if (!profile) { res.status(404).json({ error: 'Driver profile not found' }); return; }
  res.json(profile);
});

export default router;
