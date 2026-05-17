import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

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
    },
  });
  res.status(201).json(alert);
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const alerts = await prisma.rideAlert.findMany({
    where: { passengerId: req.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(alerts);
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ active: z.boolean() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const alert = await prisma.rideAlert.findUnique({ where: { id: req.params.id } });
  if (!alert || alert.passengerId !== req.userId) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  const updated = await prisma.rideAlert.update({
    where: { id: req.params.id },
    data: { active: parsed.data.active },
  });
  res.json(updated);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const alert = await prisma.rideAlert.findUnique({ where: { id: req.params.id } });
  if (!alert || alert.passengerId !== req.userId) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  await prisma.rideAlert.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
