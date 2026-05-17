import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = z.object({ blockedId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (parsed.data.blockedId === req.userId) {
    res.status(400).json({ error: 'Cannot block yourself' });
    return;
  }
  const block = await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: req.userId!, blockedId: parsed.data.blockedId } },
    create: { blockerId: req.userId!, blockedId: parsed.data.blockedId },
    update: {},
  });
  res.status(201).json(block);
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  const blocks = await prisma.block.findMany({
    where: { blockerId: req.userId },
    include: {
      blocked: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(blocks);
});

router.delete('/:blockedId', requireAuth, async (req: AuthRequest, res) => {
  await prisma.block.deleteMany({
    where: { blockerId: req.userId, blockedId: req.params.blockedId },
  });
  res.json({ ok: true });
});

export default router;
