import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { getPassengerStat } from '../lib/passengerStats.js';

const router = Router();

const ratingSchema = z.object({
  tripId: z.string(),
  passengerId: z.string(),
  liked: z.boolean(),
});

// Driver rates (likes/dislikes) a passenger after a completed trip.
router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = ratingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { tripId, passengerId, liked } = parsed.data;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (trip.driverId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (trip.status !== 'COMPLETED') {
    res.status(400).json({ error: 'Mund të vlerësoni pasagjerët vetëm pas përfundimit të udhëtimit' });
    return;
  }

  const reservation = await prisma.reservation.findFirst({
    where: { tripId, passengerId, status: 'ACCEPTED' },
  });
  if (!reservation) {
    res.status(400).json({ error: 'Ky pasagjer nuk ishte pjesë e udhëtimit' });
    return;
  }

  const rating = await prisma.passengerRating.upsert({
    where: { tripId_passengerId: { tripId, passengerId } },
    create: { tripId, passengerId, driverId: req.userId!, liked },
    update: { liked },
  });

  res.status(201).json(rating);
});

// Aggregate reputation for a passenger (completed trips + like ratio).
router.get('/user/:userId', async (req, res) => {
  const stats = await getPassengerStat(req.params.userId);
  res.json(stats);
});

export default router;
