import { Router, type Response } from 'express';
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

// Conversations are identified by their context (a trip or a request) plus the
// other participant. The prefix keeps the two id spaces from colliding — without
// it every request conversation would collapse onto the key `null|<otherId>`.
function convKey(ctx: { tripId?: string | null; requestId?: string | null }, otherId: string): string {
  return ctx.requestId ? `r:${ctx.requestId}|${otherId}` : `t:${ctx.tripId}|${otherId}`;
}

// Returns a map keyed by convKey -> cutoff. Messages in that conversation
// created on or before the cutoff are hidden from the viewer.
async function getConversationDeletions(userId: string): Promise<Map<string, Date>> {
  const [tripDeletions, requestDeletions] = await Promise.all([
    prisma.conversationDeletion.findMany({
      where: { userId },
      select: { tripId: true, otherId: true, deletedAt: true },
    }),
    prisma.requestConversationDeletion.findMany({
      where: { userId },
      select: { requestId: true, otherId: true, deletedAt: true },
    }),
  ]);
  return new Map([
    ...tripDeletions.map((d) => [convKey({ tripId: d.tripId }, d.otherId), d.deletedAt] as const),
    ...requestDeletions.map(
      (d) => [convKey({ requestId: d.requestId }, d.otherId), d.deletedAt] as const,
    ),
  ]);
}

const sendSchema = z
  .object({
    tripId: z.string().optional(),
    requestId: z.string().optional(),
    receiverId: z.string(),
    content: z.string().min(1).max(2000),
  })
  .refine((v) => Boolean(v.tripId) !== Boolean(v.requestId), {
    message: 'Jepni ose tripId ose requestId',
  });

// A request conversation always runs between the passenger who published it and
// a driver answering it — there is no trip yet to derive permission from, so the
// pairing itself is the authorization rule.
async function sendRequestMessage(
  req: AuthRequest,
  res: Response,
  { requestId, receiverId, content }: { requestId: string; receiverId: string; content: string },
) {
  const request = await prisma.rideAlert.findUnique({
    where: { id: requestId },
    select: { id: true, passengerId: true, originLabel: true, destLabel: true, active: true },
  });
  if (!request) {
    res.status(404).json({ error: 'Kërkesa nuk u gjet' });
    return;
  }

  const me = req.userId!;
  const passengerId = request.passengerId;
  const iAmPassenger = passengerId === me;
  const otherIsPassenger = passengerId === receiverId;
  if (!iAmPassenger && !otherIsPassenger) {
    res.status(403).json({ error: 'Biseda duhet të përfshijë pasagjerin që publikoi kërkesën' });
    return;
  }

  // The non-passenger side must be a driver. Checked on the counterpart rather
  // than the sender so a passenger can always reply to a driver who wrote first.
  const driverId = iAmPassenger ? receiverId : me;
  const driver = await prisma.user.findUnique({
    where: { id: driverId },
    select: { role: true, status: true },
  });
  if (!driver || (driver.role !== 'DRIVER' && driver.role !== 'ADMIN') || driver.status !== 'ACTIVE') {
    res.status(403).json({ error: 'Vetëm shoferët mund t’i përgjigjen një kërkese' });
    return;
  }

  // A driver can only open a conversation while the request is live; once it's
  // going, either side can keep replying.
  if (!iAmPassenger && !request.active) {
    const existing = await prisma.message.findFirst({
      where: { requestId, OR: [{ senderId: me }, { receiverId: me }] },
      select: { id: true },
    });
    if (!existing) {
      res.status(403).json({ error: 'Kjo kërkesë nuk është më aktive' });
      return;
    }
  }

  const sender = await prisma.user.findUnique({
    where: { id: me },
    select: { firstName: true, lastName: true },
  });

  const message = await prisma.message.create({
    data: { requestId, senderId: me, receiverId, content: content.trim() },
  });

  const receiverBlock = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: receiverId, blockedId: me } },
    select: { id: true },
  });
  if (!receiverBlock) {
    const tokens = await prisma.pushToken.findMany({
      where: { userId: receiverId },
      select: { token: true },
    });
    void sendPushNotifications(
      tokens.map((t) => t.token),
      `${sender?.firstName ?? 'Mesazh i ri'} ${sender?.lastName ?? ''}`.trim() + ' 💬',
      `${request.originLabel} → ${request.destLabel}: ${content.slice(0, 80)}`,
      { type: 'message', requestId, senderId: me },
    );
  }

  res.status(201).json(message);
}

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { tripId, requestId, receiverId, content } = parsed.data;

  if (receiverId === req.userId) {
    res.status(400).json({ error: 'Nuk mund të dërgoni mesazh te vetja' });
    return;
  }

  if (requestId) {
    await sendRequestMessage(req, res, { requestId, receiverId, content });
    return;
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId! },
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
    data: { tripId: tripId!, senderId: req.userId!, receiverId, content: content.trim() },
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

// Clients shipped before request messaging existed can't render a conversation
// with no trip, so they only get trip conversations. Newer builds opt in with
// ?includeRequests=1. Same gate on /unread-count, so the badge never counts a
// message the client has no screen to open.
function wantsRequests(req: AuthRequest): boolean {
  return req.query.includeRequests === '1' || req.query.includeRequests === 'true';
}

router.get('/conversations', requireAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const includeRequests = wantsRequests(req);
  const blockCutoffs = await getBlockedSenderCutoffs(userId);
  const deletions = await getConversationDeletions(userId);

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      ...(includeRequests ? {} : { tripId: { not: null } }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      request: {
        select: {
          id: true,
          originLabel: true,
          destLabel: true,
          date: true,
          pricePerSeat: true,
          seats: true,
        },
      },
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
    const key = convKey(m, other.id);
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
        ...(m.requestId ? { requestId: m.requestId } : { tripId: m.tripId }),
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
      requestId: m.requestId,
      request: m.request,
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
  const scope = { receiverId: me, read: false, ...(wantsRequests(req) ? {} : { tripId: { not: null } }) };
  const blockCutoffs = await getBlockedSenderCutoffs(me);
  const deletions = await getConversationDeletions(me);
  if (blockCutoffs.size === 0 && deletions.size === 0) {
    const count = await prisma.message.count({ where: scope });
    res.json({ count });
    return;
  }
  const all = await prisma.message.findMany({
    where: scope,
    select: { tripId: true, requestId: true, senderId: true, createdAt: true },
  });
  const count = all.filter((m) => {
    if (!messageVisibleTo({ senderId: m.senderId, createdAt: m.createdAt }, me, blockCutoffs)) return false;
    const deletedAt = deletions.get(convKey(m, m.senderId));
    return !deletedAt || m.createdAt > deletedAt;
  }).length;
  res.json({ count });
});

router.get('/request/:requestId/with/:userId', requireAuth, async (req: AuthRequest, res) => {
  const me = req.userId!;
  const { requestId, userId: other } = req.params;
  const blockCutoffs = await getBlockedSenderCutoffs(me);
  const blockedAt = blockCutoffs.get(other as string);
  const deletions = await getConversationDeletions(me);
  const deletedAt = deletions.get(convKey({ requestId }, other));

  const messages = await prisma.message.findMany({
    where: {
      requestId,
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
      requestId,
      senderId: other,
      receiverId: me,
      read: false,
      ...(blockedAt ? { createdAt: { lt: blockedAt } } : {}),
    },
    data: { read: true },
  });

  res.json(messages);
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

router.delete('/request/:requestId/with/:userId', requireAuth, async (req: AuthRequest, res) => {
  const me = req.userId!;
  const { requestId, userId: other } = req.params;
  await prisma.requestConversationDeletion.upsert({
    where: { userId_requestId_otherId: { userId: me, requestId, otherId: other } },
    create: { userId: me, requestId, otherId: other, deletedAt: new Date() },
    update: { deletedAt: new Date() },
  });
  res.json({ ok: true });
});

export default router;
