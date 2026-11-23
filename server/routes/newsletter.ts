import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { JWT_SECRET } from '../middleware/auth.js';

export const newsletterRouter = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/newsletter/subscribe (and alias /api/subscribe)
newsletterRouter.post('/subscribe', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, source = 'storefront_footer' } = req.body || {};

    // 1. Validate Email Input
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email address is required to subscribe.',
      });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address (e.g., name@example.com).',
      });
      return;
    }

    // 2. Role Restriction: Only Customers and Guest Shoppers can subscribe (Deny Admins and Delivery Agents)
    const authHeader = req.headers.authorization;
    let userId: number | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = jwt.verify(token, JWT_SECRET) as { id: string | number; role?: string };
        if (payload.role === 'admin' || payload.role === 'delivery_agent') {
          res.status(403).json({
            success: false,
            message: 'Newsletter subscription is reserved exclusively for customers and storefront shoppers.',
          });
          return;
        }
        if (payload.id && !isNaN(Number(payload.id))) {
          userId = Number(payload.id);
        }
      } catch {
        // Invalid or expired token - treat as guest
      }
    }

    // 3. Ensure Table Exists
    await query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        source VARCHAR(100) DEFAULT 'storefront_footer',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Duplicate Check
    const existing = await query(
      'SELECT id, email, created_at FROM newsletter_subscribers WHERE email = $1 LIMIT 1',
      [trimmedEmail]
    );

    if (existing.rows.length > 0) {
      res.status(200).json({
        success: true,
        alreadySubscribed: true,
        message: "You're already subscribed to our VIP insider club! Use code SPHERE20 for 20% off at checkout.",
        couponCode: 'SPHERE20',
        data: {
          email: trimmedEmail,
          subscribedAt: existing.rows[0].created_at,
        },
      });
      return;
    }

    // 5. Insert New Subscriber
    const inserted = await query(
      `INSERT INTO newsletter_subscribers (email, user_id, source)
       VALUES ($1, $2, $3)
       RETURNING id, email, source, status, created_at`,
      [trimmedEmail, userId, source]
    );

    res.status(201).json({
      success: true,
      alreadySubscribed: false,
      message: 'Welcome to the VIP Club! Your $15 VIP discount coupon code is SPHERE20.',
      couponCode: 'SPHERE20',
      data: inserted.rows[0],
    });
  } catch (err: any) {
    console.error('[Newsletter Subscribe Error]:', err);
    res.status(500).json({
      success: false,
      message: `Failed to process subscription: ${err.message || 'Internal server error'}`,
    });
  }
});

// GET /api/newsletter/subscribers (Admin View)
newsletterRouter.get('/subscribers', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Admin authentication required.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role?: string };
    if (payload.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Administrator privileges required.' });
      return;
    }

    const result = await query(
      `SELECT id, email, user_id, source, status, created_at 
       FROM newsletter_subscribers 
       ORDER BY created_at DESC 
       LIMIT 100`
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});
