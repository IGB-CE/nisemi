import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.use(requireAdmin);

router.get('/stats', async (_req, res) => {
  const [users, drivers, trips, reservations] = await Promise.all([
    prisma.user.count(),
    prisma.driverProfile.count(),
    prisma.trip.count(),
    prisma.reservation.count(),
  ]);
  res.json({ users, drivers, trips, reservations });
});

router.get('/users', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = 20;
  const users = await prisma.user.findMany({
    skip: (page - 1) * limit,
    take: limit,
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, status: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.patch('/users/:id/block', async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'BLOCKED' }, select: { id: true, status: true } });
  res.json(user);
});

router.patch('/users/:id/unblock', async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' }, select: { id: true, status: true } });
  res.json(user);
});

router.patch('/users/:id/approve', async (req, res) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' }, select: { id: true, status: true } });
  res.json(user);
});

router.get('/trips', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = 20;
  const trips = await prisma.trip.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: { originCity: true, destCity: true, driver: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(trips);
});

router.get('/reservations', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = 20;
  const reservations = await prisma.reservation.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: {
      trip: { include: { originCity: true, destCity: true } },
      passenger: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reservations);
});

router.get('/reports', async (req, res) => {
  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true } },
      reported: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(reports);
});

router.patch('/reports/:id/resolve', async (req, res) => {
  const report = await prisma.report.update({ where: { id: req.params.id }, data: { status: 'RESOLVED' } });
  res.json(report);
});

router.patch('/reports/:id/dismiss', async (req, res) => {
  const report = await prisma.report.update({ where: { id: req.params.id }, data: { status: 'DISMISSED' } });
  res.json(report);
});

export default router;
