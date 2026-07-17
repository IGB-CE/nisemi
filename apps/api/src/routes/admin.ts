import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAdmin, type AuthRequest } from '../middleware/auth.js';
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

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
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

router.get('/drivers', async (_req, res) => {
  const drivers = await prisma.driverProfile.findMany({
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

router.get('/trips', async (_req, res) => {
  const trips = await prisma.trip.findMany({
    include: {
      originCity: true,
      destCity: true,
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          driverProfile: {
            select: { carModel: true, carColor: true, carPlate: true, rating: true, verificationStatus: true },
          },
        },
      },
      reservations: {
        include: { passenger: { select: { id: true, firstName: true, lastName: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(trips);
});

router.get('/reservations', async (_req, res) => {
  // Grouped by trip: each trip carries the passengers who reserved it.
  const trips = await prisma.trip.findMany({
    where: { reservations: { some: {} } },
    include: {
      originCity: { select: { name: true } },
      destCity: { select: { name: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      reservations: {
        include: { passenger: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { departureAt: 'desc' },
  });
  res.json(trips);
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

// --- Broadcast push notifications -----------------------------------------

type Audience = 'ALL' | 'DRIVERS' | 'PASSENGERS';

function audienceWhere(audience: Audience) {
  if (audience === 'DRIVERS') return { user: { is: { role: 'DRIVER' as const } } };
  if (audience === 'PASSENGERS') return { user: { is: { role: 'PASSENGER' as const } } };
  return undefined;
}

// Counts of users/devices reachable for each audience, used to show the admin
// how many people a broadcast would reach before sending.
router.get('/broadcast/recipients', async (_req, res) => {
  const rows = await prisma.pushToken.findMany({
    select: { userId: true, user: { select: { role: true } } },
  });
  const tally = (pred: (role: string) => boolean) => {
    const users = new Set<string>();
    let devices = 0;
    for (const r of rows) {
      if (pred(r.user.role)) {
        users.add(r.userId);
        devices++;
      }
    }
    return { users: users.size, devices };
  };
  res.json({
    all: tally(() => true),
    drivers: tally((role) => role === 'DRIVER'),
    passengers: tally((role) => role === 'PASSENGER'),
  });
});

router.get('/broadcasts', async (_req, res) => {
  const broadcasts = await prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(broadcasts);
});

const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  audience: z.enum(['ALL', 'DRIVERS', 'PASSENGERS']),
});

router.post('/broadcast', async (req: AuthRequest, res) => {
  const parsed = broadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { title, body, audience } = parsed.data;

  const tokens = await prisma.pushToken.findMany({
    where: audienceWhere(audience),
    select: { token: true, userId: true },
  });
  const recipientCount = new Set(tokens.map((t) => t.userId)).size;

  const admin = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { firstName: true, lastName: true },
  });
  const broadcast = await prisma.broadcast.create({
    data: {
      title,
      body,
      audience,
      recipientCount,
      sentById: req.userId!,
      sentByName: `${admin?.firstName ?? ''} ${admin?.lastName ?? ''}`.trim() || 'Admin',
    },
  });

  // Fire-and-forget so the request returns immediately; sending is batched.
  void sendPushNotifications(
    tokens.map((t) => t.token),
    title,
    body,
    { type: 'announcement' },
  );

  res.status(201).json({ broadcast, recipientCount, deviceCount: tokens.length });
});

export default router;
