import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/auth.js';
import { supabase, DRIVER_DOCS_BUCKET } from '../lib/supabase.js';
import { sendPushNotifications } from '../lib/push.js';

async function notifyUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const tokens = await prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
  await sendPushNotifications(tokens.map((t) => t.token), title, body, data);
}

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
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

router.patch('/users/:id/block', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'BLOCKED' },
    select: { id: true, status: true },
  });
  res.json(user);
});

router.patch('/users/:id/unblock', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE' },
    select: { id: true, status: true },
  });
  res.json(user);
});

router.patch('/users/:id/approve', async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { status: 'ACTIVE' },
    select: { id: true, status: true },
  });
  res.json(user);
});

router.get('/drivers', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const limit = 20;
  const drivers = await prisma.driverProfile.findMany({
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Generate short-lived signed URLs so admins can view the private license images.
  const withLicense = await Promise.all(
    drivers.map(async ({ licenseUrl, ...d }) => {
      let licenseSignedUrl: string | null = null;
      if (licenseUrl) {
        const { data } = await supabase.storage
          .from(DRIVER_DOCS_BUCKET)
          .createSignedUrl(licenseUrl, 60 * 10);
        licenseSignedUrl = data?.signedUrl ?? null;
      }
      return { ...d, hasLicense: Boolean(licenseUrl), licenseSignedUrl };
    }),
  );
  res.json(withLicense);
});

router.patch('/drivers/:userId/verify', async (req, res) => {
  const profile = await prisma.driverProfile.update({
    where: { userId: req.params.userId },
    data: { verificationStatus: 'APPROVED', verifiedAt: new Date(), rejectionReason: null },
    select: { id: true, verificationStatus: true, verifiedAt: true },
  });
  void notifyUser(
    req.params.userId,
    'Llogaria u verifikua ✅',
    'Profili juaj si shofer u aprovua. Tani mund të publikoni udhëtime.',
    { type: 'verification' },
  );
  res.json(profile);
});

const rejectSchema = z.object({ reason: z.string().max(500).optional() });

router.patch('/drivers/:userId/reject', async (req, res) => {
  const parsed = rejectSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.driverProfile.update({
    where: { userId: req.params.userId },
    data: {
      verificationStatus: 'REJECTED',
      verifiedAt: null,
      rejectionReason: parsed.data.reason ?? null,
    },
    select: { id: true, verificationStatus: true, rejectionReason: true },
  });
  void notifyUser(
    req.params.userId,
    'Verifikimi u refuzua',
    parsed.data.reason
      ? `Profili juaj si shofer nuk u aprovua: ${parsed.data.reason}`
      : 'Profili juaj si shofer nuk u aprovua. Kontrolloni dokumentet dhe provoni përsëri.',
    { type: 'verification' },
  );
  res.json(profile);
});

router.patch('/drivers/:userId/demote', async (req, res) => {
  const { userId } = req.params;
  await prisma.$transaction([
    prisma.driverProfile.delete({ where: { userId } }),
    prisma.user.update({ where: { id: userId }, data: { role: 'PASSENGER' } }),
  ]);
  res.json({ ok: true });
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
