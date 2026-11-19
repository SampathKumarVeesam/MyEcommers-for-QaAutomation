import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DeliveryAgent, User } from '../../src/types.js';
import { userRepo } from '../repositories/userRepo.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'my-super-secret-jwt-key-24h-qa-testing-2026';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface AuthenticatedAgentRequest extends Request {
  agent?: DeliveryAgent;
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

export function generateAgentToken(agent: DeliveryAgent): string {
  return jwt.sign(
    {
      id: agent.id,
      email: agent.email,
      role: 'delivery_agent',
      name: agent.name,
      agentCode: agent.agentCode,
      mustChangePassword: agent.mustChangePassword,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
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

export async function requireAgentAuth(req: AuthenticatedAgentRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Delivery agent authentication token required (Bearer token missing)',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    const { agentRepo } = await import('../repositories/agentRepo.js');
    const agent = await agentRepo.findById(payload.id);
    if (!agent) {
      res.status(401).json({ success: false, message: 'Invalid or expired delivery agent session' });
      return;
    }
    req.agent = agent;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired delivery agent bearer token' });
    return;
  }
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const user = await userRepo.findById(payload.id);
    if (user) {
      req.user = user;
    }
  } catch (err) {
    // optional, proceed without req.user
  }
  next();
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
