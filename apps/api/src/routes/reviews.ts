import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const reviewSchema = z.object({
  tripId: z.string(),
  targetId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { tripId, targetId, rating, comment } = parsed.data;

  if (targetId === req.userId) {
    res.status(400).json({ error: 'Nuk mund të vlerësoni veten' });
    return;
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    res.status(404).json({ error: 'Udhëtimi nuk u gjet' });
    return;
  }

  try {
    const review = await prisma.review.create({
      data: { tripId, authorId: req.userId!, targetId, rating, comment },
    });

    const stats = await prisma.review.aggregate({ where: { targetId }, _avg: { rating: true }, _count: true });
    const driverProfile = await prisma.driverProfile.findUnique({ where: { userId: targetId } });
    if (driverProfile && stats._avg.rating) {
      await prisma.driverProfile.update({
        where: { userId: targetId },
        data: { rating: stats._avg.rating, totalTrips: stats._count },
      });
    }

    res.status(201).json(review);
  } catch {
    res.status(409).json({ error: 'E keni vlerësuar tashmë këtë udhëtim' });
  }
});

router.get('/user/:userId', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { targetId: req.params.userId },
    include: { author: { select: { firstName: true, lastName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reviews);
});

export default router;
