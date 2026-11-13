import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../../src/types.js';
import { userRepo } from '../repositories/userRepo.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-jwt-key-24h-qa-testing-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      provider: user.provider || 'local',
    },
    JWT_SECRET,
    { expiresIn: '24h' } // 24-hour token expiration
  );
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token required (Bearer token missing)',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = await userRepo.findById(payload.id);
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid or expired token user session' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired bearer token' });
    return;
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Administrator privileges required.',
      });
      return;
    }
    next();
  });
}
