import type { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../lib/firebase.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const allowedUid = process.env.ALLOWED_UID ?? '';
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token' });
    return;
  }

  try {
    const token = header.slice('Bearer '.length);
    const decoded = await getAdminAuth().verifyIdToken(token);
    if (allowedUid && decoded.uid !== allowedUid) {
      res.status(403).json({ error: 'User not allowed' });
      return;
    }
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    console.error('verifyIdToken failed:', err instanceof Error ? err.message : err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { uid: string; email?: string };
    }
  }
}
