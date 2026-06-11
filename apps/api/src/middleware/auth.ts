import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';

// Express 5's `@types/express-serve-static-core` types route params as
// `string | string[]`, which makes every `req.params.x` read fail against
// Prisma's string inputs. Route params are always strings here, so narrow them.
export interface AuthRequest<P = Record<string, string>> extends Request<P> {
  userId?: string;
  userRole?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  });
}
