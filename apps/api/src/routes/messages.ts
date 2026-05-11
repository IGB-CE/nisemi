import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';

const router = Router();

const sendSchema = z.object({
  tripId: z.string(),
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { tripId, receiverId, content } = parsed.data;

  if (receiverId === req.userId) { res.status(400).json({ error: 'Cannot message yourself' }); return; }

  const trip = await prisma.trip.findUnique({ where: { id: tripId }, select: { driverId: true, originCity: { select: { name: true } }, destCity: { select: { name: true } } } });
  if (!trip) { res.status(404).json({ error: 'Trip not found' }); return; }

  const isDriver = trip.driverId === req.userId;
  const otherIsDriver = trip.driverId === receiverId;
  if (!isDriver && !otherIsDriver) { res.status(403).json({ error: 'Conversation must involve the driver' }); return; }

  const sender = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true } });

  const message = await prisma.message.create({
    data: { tripId, senderId: req.userId!, receiverId, content: content.trim() },
  });

  const tokens = await prisma.pushToken.findMany({ where: { userId: receiverId }, select: { token: true } });
  void sendPushNotifications(
    tokens.map(t => t.token),
    `${sender?.firstName ?? 'Mesazh i ri'} ${sender?.lastName ?? ''}`.trim() + ' 💬',
    `${trip.originCity.name} → ${trip.destCity.name}: ${content.slice(0, 80)}`,
  );

  res.status(201).json(message);
});

router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      trip: { select: { id: true, originCity: { select: { name: true } }, destCity: { select: { name: true } }, departureAt: true } },
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  const seen = new Set<string>();
  const conversations: any[] = [];
  for (const m of messages) {
    const other = m.senderId === userId ? m.receiver : m.sender;
    const key = `${m.tripId}|${other.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const unread = await prisma.message.count({ where: { tripId: m.tripId, senderId: other.id, receiverId: userId, read: false } });
    conversations.push({
      tripId: m.tripId,
      trip: m.trip,
      otherUser: other,
      lastMessage: { content: m.content, createdAt: m.createdAt, fromMe: m.senderId === userId },
      unread,
    });
  }

  res.json(conversations);
});

router.get('/trip/:tripId/with/:userId', requireAuth, async (req: AuthRequest, res) => {
  const me = req.userId!;
  const { tripId, userId: other } = req.params;

  const messages = await prisma.message.findMany({
    where: {
      tripId,
      OR: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.message.updateMany({
    where: { tripId, senderId: other, receiverId: me, read: false },
    data: { read: true },
  });

  res.json(messages);
});

router.get('/unread-count', requireAuth, async (req: AuthRequest, res) => {
  const count = await prisma.message.count({ where: { receiverId: req.userId, read: false } });
  res.json({ count });
});

export default router;
