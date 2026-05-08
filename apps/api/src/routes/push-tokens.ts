import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const tokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = tokenSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const pushToken = await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    update: { userId: req.userId! },
    create: { ...parsed.data, userId: req.userId! },
  });
  res.json(pushToken);
});

export default router;
