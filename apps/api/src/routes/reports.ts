import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const reportSchema = z.object({
  reportedId: z.string(),
  reason: z.string().min(10, 'Arsyeja duhet të jetë të paktën 10 karaktere').max(500),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { reportedId, reason } = parsed.data;

  if (reportedId === req.userId) {
    res.status(400).json({ error: 'Nuk mund të raportoni veten' });
    return;
  }

  const reported = await prisma.user.findUnique({ where: { id: reportedId } });
  if (!reported) {
    res.status(404).json({ error: 'Përdoruesi nuk u gjet' });
    return;
  }

  const report = await prisma.report.create({
    data: { reporterId: req.userId!, reportedId, reason },
  });
  res.status(201).json(report);
});

export default router;
