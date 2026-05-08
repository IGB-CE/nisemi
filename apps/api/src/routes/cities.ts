import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const cities = await prisma.city.findMany({ orderBy: { name: 'asc' } });
  res.json(cities);
});

export default router;
