import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import appleSignin from 'apple-signin-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { albanianMobileSchema } from '../lib/phone.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  // Apple Guideline 5.1.1(v): phone must not be required to create an account.
  phone: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    albanianMobileSchema.optional(),
  ),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const googleSchema = z.object({
  idToken: z.string().min(20),
});

const appleSchema = z.object({
  identityToken: z.string().min(20),
  // Apple only returns the user's name on the very first authorization, via the
  // native credential — the client forwards it here so we can store it.
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const APPLE_AUDIENCE = process.env.APPLE_BUNDLE_ID ?? 'al.nisemi.app';

const GOOGLE_AUDIENCES = [
  process.env.GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_IOS_CLIENT_ID,
  process.env.GOOGLE_ANDROID_CLIENT_ID,
].filter((v): v is string => Boolean(v));

const googleClient = new OAuth2Client();

const userPublicFields = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
} as const;

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, firstName, lastName, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Ky email është tashmë në përdorim' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, phone },
      select: userPublicFields,
    });
  } catch (err) {
    // The email is pre-checked above, but phone is unique too — and either could
    // still collide on a race. Map the constraint to a clean 409 instead of a 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = err.meta?.target;
      const field = Array.isArray(target) ? target[0] : target;
      res.status(409).json({
        error:
          field === 'phone'
            ? 'Ky numër telefoni është tashmë në përdorim'
            : 'Ky email është tashmë në përdorim',
      });
      return;
    }
    throw err;
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Kredencialet nuk janë të sakta' });
    return;
  }
  if (user.status === 'BLOCKED') {
    res.status(403).json({ error: 'Llogaria juaj është bllokuar' });
    return;
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    },
  });
});

router.post('/google', async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (GOOGLE_AUDIENCES.length === 0) {
    res.status(500).json({ error: 'Identifikimi me Google nuk është konfiguruar në server' });
    return;
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: GOOGLE_AUDIENCES,
    });
    payload = ticket.getPayload();
  } catch {
    res.status(401).json({ error: 'Token-i i Google nuk është i vlefshëm' });
    return;
  }
  if (!payload || !payload.sub || !payload.email) {
    res.status(401).json({ error: 'Token-i i Google nuk është i vlefshëm' });
    return;
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const emailVerified = payload.email_verified === true;
  const fullName = payload.name ?? '';
  const firstName = payload.given_name || fullName.split(' ')[0] || 'Google';
  const lastName = payload.family_name || fullName.split(' ').slice(1).join(' ') || '';
  const avatarUrl = payload.picture ?? null;

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail && emailVerified) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId,
          avatarUrl: byEmail.avatarUrl ?? avatarUrl,
        },
      });
    } else if (byEmail && !emailVerified) {
      res.status(409).json({ error: 'Ky email është tashmë në përdorim' });
      return;
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          firstName,
          lastName,
          avatarUrl,
        },
      });
    }
  }

  if (user.status === 'BLOCKED') {
    res.status(403).json({ error: 'Llogaria juaj është bllokuar' });
    return;
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    },
  });
});

router.post('/apple', async (req, res) => {
  const parsed = appleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  let payload: Awaited<ReturnType<typeof appleSignin.verifyIdToken>>;
  try {
    payload = await appleSignin.verifyIdToken(parsed.data.identityToken, {
      audience: APPLE_AUDIENCE,
      ignoreExpiration: false,
    });
  } catch {
    res.status(401).json({ error: 'Token-i i Apple nuk është i vlefshëm' });
    return;
  }

  const appleId = payload.sub;
  if (!appleId) {
    res.status(401).json({ error: 'Token-i i Apple nuk është i vlefshëm' });
    return;
  }
  const email = payload.email ? payload.email.toLowerCase() : null;
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';

  let user = await prisma.user.findUnique({ where: { appleId } });

  if (!user) {
    // Link to an existing account if the (verified) email already exists.
    const byEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;
    if (byEmail && emailVerified) {
      user = await prisma.user.update({ where: { id: byEmail.id }, data: { appleId } });
    } else if (byEmail && !emailVerified) {
      res.status(409).json({ error: 'Ky email është tashmë në përdorim' });
      return;
    } else {
      // Apple always provides an email (real or private-relay) on first consent;
      // fall back to a deterministic placeholder only if it is genuinely absent.
      const finalEmail = email ?? `apple_${appleId}@privaterelay.nisemi.al`;
      user = await prisma.user.create({
        data: {
          email: finalEmail,
          appleId,
          firstName: parsed.data.firstName || 'Përdorues',
          lastName: parsed.data.lastName || '',
        },
      });
    }
  }

  if (user.status === 'BLOCKED') {
    res.status(403).json({ error: 'Llogaria juaj është bllokuar' });
    return;
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
    },
  });
});

export default router;
