import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import { User } from '../../src/types.js';
import { db } from '../dbStore.js';
import { AuthenticatedRequest, generateToken, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/users/register (Creates new user, returns status 201)
authRouter.post('/register', (req: Request, res: Response): void => {
  const { name, email, password, phone, role } = req.body || {};

  const errors: Record<string, string> = {};
  if (!name || !name.trim()) {
    errors.name = 'Required field';
  }
  if (!email || !email.trim()) {
    errors.email = 'Required field';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Invalid email address format';
  }
  if (!password || !password.trim()) {
    errors.password = 'Required field';
  } else if (password.trim().length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      message: 'Validation failed. Please correct the highlighted errors.',
      errors,
    });
    return;
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    res.status(400).json({
      success: false,
      message: 'Email is already registered. Please login instead.',
      errors: { email: 'Email address already in use' },
    });
    return;
  }

  const newUser: User = {
    id: `user_${crypto.randomUUID().slice(0, 10)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: bcrypt.hashSync(password.trim(), 10),
    role: role === 'admin' ? 'admin' : 'customer',
    phone: phone ? phone.trim() : undefined,
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80`,
    createdAt: new Date().toISOString(),
  };

  const created = db.createUser(newUser);
  const token = generateToken(created);

  // Exclude password hash from response
  const { passwordHash: _, ...safeUser } = created;

  res.status(201).json({
    success: true,
    message: 'User account created successfully',
    data: {
      user: safeUser,
      token,
      expiresIn: '24h',
    },
  });
});

// POST /api/users/login (Authenticates user, returns 24h JWT Bearer token, status 200)
authRouter.post('/login', (req: Request, res: Response): void => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    res.status(400).json({
      success: false,
      message: 'Email and password are required',
      errors: {
        email: !email ? 'Required field' : undefined,
        password: !password ? 'Required field' : undefined,
      },
    });
    return;
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
    return;
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
    return;
  }

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;

  res.status(200).json({
    success: true,
    message: 'Authentication successful',
    data: {
      user: safeUser,
      token,
      expiresIn: '24h',
    },
  });
});

// POST /api/users/oauth (Google & Apple OAuth Login / Registration)
authRouter.post('/oauth', (req: Request, res: Response): void => {
  const { provider, email, name, avatar } = req.body || {};

  if (!provider || !['google', 'apple'].includes(provider)) {
    res.status(400).json({
      success: false,
      message: 'Provider must be "google" or "apple"',
    });
    return;
  }

  const oauthEmail =
    (email && email.trim()) ||
    (provider === 'google'
      ? 'google.user@practicesoftwaretesting.com'
      : 'apple.user@practicesoftwaretesting.com');

  const oauthName =
    (name && name.trim()) ||
    (provider === 'google' ? 'Google Customer' : 'Apple Customer');

  const oauthAvatar =
    avatar ||
    (provider === 'google'
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
      : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');

  let user = db.findUserByEmail(oauthEmail);
  if (!user) {
    const newUser: User = {
      id: `user_oauth_${crypto.randomUUID().slice(0, 8)}`,
      name: oauthName,
      email: oauthEmail.toLowerCase(),
      passwordHash: bcrypt.hashSync(`oauth_${provider}_${crypto.randomUUID()}`, 10),
      role: 'customer',
      avatar: oauthAvatar,
      provider: provider,
      createdAt: new Date().toISOString(),
    };
    user = db.createUser(newUser);
  } else if (!user.provider) {
    user.provider = provider;
  }

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;

  res.status(200).json({
    success: true,
    message: `Authenticated successfully with ${provider === 'google' ? 'Google' : 'Apple'}`,
    data: {
      user: safeUser,
      token,
      expiresIn: '24h',
    },
  });
});

// GET /api/users/me (Returns authenticated user profile details)
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { passwordHash: _, ...safeUser } = req.user;
  res.status(200).json({
    success: true,
    data: safeUser,
  });
});

// GET /api/users (Admin only, user management)
authRouter.get('/', (req: Request, res: Response): void => {
  const users = db.listUsers().map(({ passwordHash: _, ...u }) => u);
  res.status(200).json({
    success: true,
    data: users,
  });
});
