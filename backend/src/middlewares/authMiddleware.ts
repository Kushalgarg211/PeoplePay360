import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { ENV } from '../config/env';
import { AuthRequest, JwtPayload } from '../types';

/**
 * Verifies the bearer token AND that it belongs to the account's one active
 * session.
 *
 * A JWT cannot be revoked once signed, so single-device login is enforced here:
 * every login rewrites users.active_session_id, and a token whose `sid` no
 * longer matches is refused. The cost is one primary-key read per request.
 *
 * Async by design — Express 4 ignores the returned promise, so every path is
 * wrapped: an unhandled rejection would take the process down.
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ success: false, message: 'Access token required' });
    return;
  }

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { activeSessionId: true, status: true },
    });

    // Deleted or deactivated — now takes effect immediately rather than
    // whenever the token happens to expire.
    if (!user || user.status === 'INACTIVE') {
      res.status(401).json({ success: false, message: 'Account is no longer active' });
      return;
    }

    // Either the token predates single-device login (no sid), or a newer login
    // on another device has taken the slot.
    if (!decoded.sid || decoded.sid !== user.activeSessionId) {
      res.status(401).json({
        success: false,
        code:    'SESSION_SUPERSEDED',
        message: 'You were signed out because your account was used to log in on another device.',
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (err) {
    // Database failure — a 500 is honest here; a 401 would wrongly tell the
    // client their credentials are bad and bounce them to the login page.
    next(err);
  }
};
