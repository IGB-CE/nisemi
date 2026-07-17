import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';
import { sendPushNotifications } from '../lib/push.js';

const router = Router();

async function getBlockedSenderCutoffs(blockerId: string): Promise<Map<string, Date>> {
  const blocks = await prisma.block.findMany({
    where: { blockerId },
    select: { blockedId: true, createdAt: true },
  });
  return new Map(blocks.map((b) => [b.blockedId, b.createdAt]));
}

function messageVisibleTo(
  msg: { senderId: string; createdAt: Date },
  viewerId: string,
  blockCutoffs: Map<string, Date>,
): boolean {
  if (msg.senderId === viewerId) return true;
  const blockedAt = blockCutoffs.get(msg.senderId);
  if (!blockedAt) return true;
  return msg.createdAt < blockedAt;
}

// Returns a map keyed by `${tripId}|${otherUserId}` -> cutoff. Messages in that
// conversation created on or before the cutoff are hidden from the viewer.
async function getConversationDeletions(userId: string): Promise<Map<string, Date>> {
  const deletions = await prisma.conversationDeletion.findMany({
    where: { userId },
    select: { tripId: true, otherId: true, deletedAt: true },
  });
  return new Map(deletions.map((d) => [`${d.tripId}|${d.otherId}`, d.deletedAt]));
}

const sendSchema = z.object({
  tripId: z.string(),
  receiverId: z.string(),
  content: z.string().min(1).max(2000),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { tripId, receiverId, content } = parsed.data;

  if (receiverId === req.userId) {
    res.status(400).json({ error: 'Nuk mund të dërgoni mesazh te vetja' });
    return;
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      driverId: true,
      originCity: { select: { name: true } },
      destCity: { select: { name: true } },
      originLabel: true,
      destLabel: true,
    },
  });
  if (!trip) {
    res.status(404).json({ error: 'Udhëtimi nuk u gjet' });
    return;
  }

  const isDriver = trip.driverId === req.userId;
  const otherIsDriver = trip.driverId === receiverId;
  if (!isDriver && !otherIsDriver) {
    res.status(403).json({ error: 'Biseda duhet të përfshijë shoferin' });
    return;
  }

  const sender = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { firstName: true, lastName: true },
  });

  const message = await prisma.message.create({
    data: { tripId, senderId: req.userId!, receiverId, content: content.trim() },
  });

  const receiverBlock = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: receiverId, blockedId: req.userId! } },
    select: { id: true },
  });
  if (!receiverBlock) {
    const tokens = await prisma.pushToken.findMany({ where: { userId: receiverId }, select: { token: true } });
    void sendPushNotifications(
      tokens.map((t) => t.token),
      `${sender?.firstName ?? 'Mesazh i ri'} ${sender?.lastName ?? ''}`.trim() + ' 💬',
      `${trip.originCity?.name ?? trip.originLabel ?? 'Origjina'} → ${trip.destCity?.name ?? trip.destLabel ?? 'Destinacioni'}: ${content.slice(0, 80)}`,
      { type: 'message', tripId, senderId: req.userId },
    );
  }

  res.status(201).json(message);
});

router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const blockCutoffs = await getBlockedSenderCutoffs(userId);
  const deletions = await getConversationDeletions(userId);

  const messages = await prisma.message.findMany({
    where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    orderBy: { createdAt: 'desc' },
    include: {
      trip: {
        select: {
          id: true,
          originCity: { select: { name: true } },
          destCity: { select: { name: true } },
          originLabel: true,
          destLabel: true,
          departureAt: true,
        },
      },
      sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
      receiver: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
    },
  });

  const visible = messages.filter((m) => messageVisibleTo(m, userId, blockCutoffs));

  const seen = new Set<string>();
  const conversations: any[] = [];
  for (const m of visible) {
    const other = m.senderId === userId ? m.receiver : m.sender;
    const key = `${m.tripId}|${other.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // `m` is the most recent message in this conversation. If it predates the
    // deletion cutoff, the whole conversation was deleted and stays hidden
    // until a newer message arrives.
    const deletedAt = deletions.get(key);
    if (deletedAt && m.createdAt <= deletedAt) continue;
    const blockedAt = blockCutoffs.get(other.id);
    const unread = await prisma.message.count({
      where: {
        tripId: m.tripId,
        senderId: other.id,
        receiverId: userId,
        read: false,
        ...(blockedAt || deletedAt
          ? { createdAt: { ...(blockedAt ? { lt: blockedAt } : {}), ...(deletedAt ? { gt: deletedAt } : {}) } }
          : {}),
      },
    });
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
  const blockCutoffs = await getBlockedSenderCutoffs(me);
  const blockedAt = blockCutoffs.get(other as string);
  const deletions = await getConversationDeletions(me);
  const deletedAt = deletions.get(`${tripId}|${other}`);

  const messages = await prisma.message.findMany({
    where: {
      tripId,
      ...(deletedAt ? { createdAt: { gt: deletedAt } } : {}),
      OR: [
        { senderId: me, receiverId: other },
        { senderId: other, receiverId: me, ...(blockedAt ? { createdAt: { lt: blockedAt } } : {}) },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  await prisma.message.updateMany({
    where: {
      tripId,
      senderId: other,
      receiverId: me,
      read: false,
      ...(blockedAt ? { createdAt: { lt: blockedAt } } : {}),
    },
    data: { read: true },
  });

  res.json(messages);
});

router.get('/unread-count', requireAuth, async (req: AuthRequest, res) => {
  const me = req.userId!;
  const blockCutoffs = await getBlockedSenderCutoffs(me);
  const deletions = await getConversationDeletions(me);
  if (blockCutoffs.size === 0 && deletions.size === 0) {
    const count = await prisma.message.count({ where: { receiverId: me, read: false } });
    res.json({ count });
    return;
  }
  const all = await prisma.message.findMany({
    where: { receiverId: me, read: false },
    select: { tripId: true, senderId: true, createdAt: true },
  });
  const count = all.filter((m) => {
    if (!messageVisibleTo({ senderId: m.senderId, createdAt: m.createdAt }, me, blockCutoffs)) return false;
    const deletedAt = deletions.get(`${m.tripId}|${m.senderId}`);
    return !deletedAt || m.createdAt > deletedAt;
  }).length;
  res.json({ count });
});

// Delete a conversation for the current user only. Records a cutoff so messages
// up to now are hidden; the chat reappears if the other person sends a new one.
router.delete('/trip/:tripId/with/:userId', requireAuth, async (req: AuthRequest, res) => {
  const me = req.userId!;
  const { tripId, userId: other } = req.params;
  await prisma.conversationDeletion.upsert({
    where: { userId_tripId_otherId: { userId: me, tripId, otherId: other } },
    create: { userId: me, tripId, otherId: other, deletedAt: new Date() },
    update: { deletedAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
