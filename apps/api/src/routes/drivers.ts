import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const driverSchema = z.object({
  carModel: z.string().min(1),
  carColor: z.string().min(1),
  carPlate: z.string().min(1),
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

router.get('/:userId', async (req, res) => {
  const profile = await prisma.driverProfile.findUnique({
    where: { userId: req.params.userId },
    include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, createdAt: true } } },
  });
  if (!profile) { res.status(404).json({ error: 'Driver profile not found' }); return; }
  res.json(profile);
});

export default router;
