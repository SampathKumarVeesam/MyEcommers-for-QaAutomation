import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Request, Response, Router } from 'express';
import { AuthenticatedAgentRequest, generateAgentToken, requireAgentAuth } from '../middleware/auth.js';
import { agentRepo } from '../repositories/agentRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';
import { notificationRepo } from '../repositories/notificationRepo.js';
import {
  sendAgentTemporaryPasswordEmail,
  sendAgentVerificationEmail,
  sendOrderStatusUpdateEmail,
  sendPasswordResetOtpEmail,
  sendPasswordResetSuccessEmail,
} from '../services/emailService.js';
import { Gender } from '../../src/types.js';
import { agentAnalyticsController } from '../controllers/agentAnalyticsController.js';

export const agentRouter = Router();

// POST /api/agent/register (Delivery Agent Registration with gender and preset avatar)
agentRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, gender, vehicleType, deliveryZone, avatarUrl } = req.body || {};

    const errors: Record<string, string> = {};
    if (!name || !name.trim()) errors.name = 'Full name is required';
    if (!email || !email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Invalid email address format';
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({ success: false, message: 'Validation failed', errors });
      return;
    }

    const existing = await agentRepo.findByEmail(email);
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'A delivery agent with this email address already exists.',
        errors: { email: 'Email already registered' },
      });
      return;
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const placeholderHash = bcrypt.hashSync(`InitialSetup_${Date.now()}`, 10);

    const created = await agentRepo.createAgent({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      gender: (gender as Gender) || 'prefer_not_to_say',
      avatarUrl,
      vehicleType: vehicleType || 'Motorcycle',
      deliveryZone: deliveryZone || 'Central Hub',
      passwordHash: placeholderHash,
      verificationToken,
      isEmailVerified: false,
      mustChangePassword: true,
      commissionRate: 15.00,
    });

    // Dispatch verification OTP email to agent's registered email address
    try {
      await sendAgentVerificationEmail({ name: created.name, email: created.email }, verificationToken);
    } catch (e) {
      console.error('[Agent Verification Email Error]:', e);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! A 6-digit verification code has been sent to your registered email address. Please check your inbox and enter the code to verify your account.',
      data: {
        agent: created,
      },
    });
  } catch (error: any) {
    console.error('[Agent Register Error]:', error);
    res.status(500).json({ success: false, message: `Registration failed: ${error.message}` });
  }
});

// POST /api/agent/verify-email (Step 2: Verify email and issue temporary password)
agentRouter.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, token } = req.body || {};
    if (!email || !token) {
      res.status(400).json({ success: false, message: 'Email and verification token are required' });
      return;
    }

    const verifyResult = await agentRepo.verifyEmail(email, token);
    if (!verifyResult.success || !verifyResult.agent) {
      res.status(400).json(verifyResult);
      return;
    }

    // Generate secure temporary password
    const tempPassword = `ShopAgent_${Math.random().toString(36).slice(2, 6).toUpperCase()}!9`;
    const tempHash = bcrypt.hashSync(tempPassword, 10);
    const updated = await agentRepo.setTemporaryPassword(verifyResult.agent.id, tempHash);

    // Dispatch temporary password to verified email
    try {
      await sendAgentTemporaryPasswordEmail({ name: verifyResult.agent!.name, email: verifyResult.agent!.email }, tempPassword);
    } catch (e) {
      console.error('[Agent Temp Password Email Error]:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! A temporary login password has been sent to your registered email address. Please check your inbox and use it to sign in.',
      data: {
        agent: updated,
      },
    });
  } catch (error: any) {
    console.error('[Agent Verify Email Error]:', error);
    res.status(500).json({ success: false, message: `Email verification failed: ${error.message}` });
  }
});

// POST /api/agent/login (Delivery Agent Login)
agentRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const agentWithCreds = await agentRepo.findByEmail(email);
    if (!agentWithCreds) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    if (!agentWithCreds.isEmailVerified) {
      res.status(403).json({
        success: false,
        message: 'Your email address is not yet verified. Please verify your email with the token sent during registration.',
      });
      return;
    }

    const isMatch = bcrypt.compareSync(password, agentWithCreds.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    // Set online presence and join FIFO queue
    const loggedInAgent = await agentRepo.setLoginStatus(agentWithCreds.id, true);

    const token = generateAgentToken(agentWithCreds);
    const { passwordHash: _, verificationToken: __, ...safeAgent } = (loggedInAgent || agentWithCreds) as any;

    res.status(200).json({
      success: true,
      message: 'Delivery agent authenticated successfully',
      data: {
        agent: safeAgent,
        token,
        mustChangePassword: safeAgent.mustChangePassword,
        expiresIn: '24h',
      },
    });

    // Check if there are unassigned PROCESSED orders waiting for an active agent
    setImmediate(async () => {
      try {
        const { query } = await import('../db/pool.js');
        const waitingOrders = await query(
          `SELECT id FROM "order" 
           WHERE LOWER(status) = 'processed' 
             AND (assigned_agent_id IS NULL OR assignment_status = 'UNASSIGNED')
           ORDER BY created_at ASC LIMIT 1`
        );
        if (waitingOrders.rows.length > 0) {
          await orderRepo.assignNextActiveAgentFIFO(waitingOrders.rows[0].id);
        }
      } catch (err) {
        console.warn('[FIFO Post-Login Order Assignment Notice]:', err);
      }
    });
  } catch (error: any) {
    console.error('[Agent Login Error]:', error);
    res.status(500).json({ success: false, message: `Login failed: ${error.message}` });
  }
});

// POST /api/agent/forgot-password (Dispatches 6-digit OTP & Reset Link to registered agent email)
agentRouter.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (!email || !email.trim()) {
      res.status(400).json({ success: false, message: 'Please enter your registered delivery agent email address.' });
      return;
    }
    const normalized = email.trim().toLowerCase();
    const agent = await agentRepo.findByEmail(normalized);
    if (!agent) {
      res.status(404).json({ success: false, message: 'No delivery agent account found with this email address.' });
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await agentRepo.setPasswordResetOtp(agent.email, otp, token, expiresAt);

    const appUrl = (process.env.APP_URL || 'https://samecommers.netlify.app').replace(/\/$/, '');
    const resetLink = `${appUrl}/#agent?action=reset-password&email=${encodeURIComponent(agent.email)}&token=${token}`;

    setImmediate(async () => {
      try {
        await sendPasswordResetOtpEmail({
          name: agent.name,
          email: agent.email,
          otp,
          resetLink,
          userType: 'agent',
        });
      } catch (err) {
        console.error('[Agent Forgot Password Email Error]:', err);
      }
    });

    res.status(200).json({
      success: true,
      message: 'A 6-digit password reset OTP and reset link have been sent to your registered email address.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/agent/reset-password (Verifies OTP/Token and updates delivery agent password)
agentRouter.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, token, newPassword } = req.body || {};
    const otpOrToken = (otp || token || '').trim();

    if (!email || !email.trim()) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }
    if (!otpOrToken) {
      res.status(400).json({ success: false, message: 'Please enter the 6-digit OTP code or reset token from your email.' });
      return;
    }
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
      return;
    }

    const normalized = email.trim().toLowerCase();
    const newPasswordHash = bcrypt.hashSync(newPassword.trim(), 10);

    const result = await agentRepo.verifyAndResetPassword(normalized, otpOrToken, newPasswordHash);
    if (!result.success) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    setImmediate(async () => {
      try {
        await sendPasswordResetSuccessEmail({
          name: result.agent?.name || 'Delivery Partner',
          email: normalized,
          userType: 'agent',
        });
      } catch (err) {
        console.error('[Agent Reset Success Email Error]:', err);
      }
    });

    res.status(200).json({
      success: true,
      message: 'Your Delivery Agent password has been successfully reset! You can now log in.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/agent/logout (Delivery Agent Logout & queue release)
agentRouter.post('/logout', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const agentId = req.agent!.id;
    await agentRepo.setLoginStatus(agentId, false);

    // If agent had any PENDING_ACCEPTANCE order, release and rotate it immediately
    const { query } = await import('../db/pool.js');
    const pending = await query(
      `SELECT id FROM "order" WHERE assigned_agent_id = $1 AND assignment_status = 'PENDING_ACCEPTANCE'`,
      [agentId]
    );
    for (const p of pending.rows) {
      await orderRepo.rejectAssignment(p.id, agentId);
    }

    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('[Agent Logout Error]:', error);
    res.status(500).json({ success: false, message: `Logout failed: ${error.message}` });
  }
});

// POST /api/agent/heartbeat (Heartbeat every 60s from frontend to maintain active presence)
agentRouter.post('/heartbeat', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.body || {};
    const coords = (lat && lng) ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined;
    await agentRepo.heartbeat(req.agent!.id, coords);
    res.status(200).json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Heartbeat failed: ${error.message}` });
  }
});

// PATCH /api/agent/profile/password (Update password & clear must_change_password flag)
agentRouter.patch('/profile/password', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const agentWithCreds = await agentRepo.findByEmail(req.agent!.email);
    if (!agentWithCreds) {
      res.status(404).json({ success: false, message: 'Agent account not found' });
      return;
    }

    // If mustChangePassword is true, allow setting permanent password without current password check, or verify currentPassword
    if (currentPassword && !bcrypt.compareSync(currentPassword, agentWithCreds.passwordHash)) {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    const newHash = bcrypt.hashSync(newPassword.trim(), 10);
    await agentRepo.updatePassword(req.agent!.id, newHash);

    const updated = await agentRepo.findById(req.agent!.id);
    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now use your permanent password for all future logins.',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Agent Update Password Error]:', error);
    res.status(500).json({ success: false, message: `Failed to update password: ${error.message}` });
  }
});

// GET /api/agent/me (Fetch authenticated agent profile)
agentRouter.get('/me', requireAgentAuth, (req: AuthenticatedAgentRequest, res: Response): void => {
  res.status(200).json({ success: true, data: req.agent });
});

// PUT /api/agent/profile (Update agent profile details)
const handleAgentProfileUpdate = async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, gender, vehicleType, deliveryZone, avatarUrl } = req.body || {};
    const updated = await agentRepo.updateProfile(req.agent!.id, {
      name,
      phone,
      gender,
      vehicleType,
      deliveryZone,
      avatarUrl,
    });
    res.status(200).json({
      success: true,
      message: 'Delivery agent profile updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Update Agent Profile Error]:', error);
    res.status(500).json({ success: false, message: `Failed to update profile: ${error.message}` });
  }
};

agentRouter.put('/profile', requireAgentAuth, handleAgentProfileUpdate);
agentRouter.patch('/profile', requireAgentAuth, handleAgentProfileUpdate);

// POST /api/agent/profile/avatar (Upload JPG/PNG profile picture, max 5MB)
agentRouter.post('/profile/avatar', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { avatarDataUrl } = req.body || {};
    if (!avatarDataUrl || typeof avatarDataUrl !== 'string') {
      res.status(400).json({ success: false, message: 'avatarDataUrl (base64 string) is required' });
      return;
    }

    // Validate JPG / PNG
    const match = avatarDataUrl.match(/^data:image\/(jpeg|jpg|png);base64,/i);
    if (!match) {
      res.status(400).json({
        success: false,
        message: 'Invalid image format. Only JPG (.jpg, .jpeg) and PNG (.png) files are accepted.',
      });
      return;
    }

    // Validate max 5MB
    const base64Data = avatarDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const sizeInBytes = (base64Data.length * 3) / 4;
    if (sizeInBytes > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        message: 'File size exceeds maximum limit of 5MB. Please choose a smaller image.',
      });
      return;
    }

    const updated = await agentRepo.updateAvatar(req.agent!.id, avatarDataUrl);
    res.status(200).json({
      success: true,
      message: 'Agent avatar uploaded and updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (err: any) {
    console.error('[Agent Upload Avatar Error]:', err);
    res.status(500).json({ success: false, message: `Avatar upload failed: ${err.message}` });
  }
});

// GET /api/agent/orders (Get assigned orders for authenticated agent with Product Privacy Masking)
agentRouter.get('/orders', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const orders = await orderRepo.getOrdersByAgent(req.agent!.id);
    // Task 5: Privacy-Masked Delivery Agent View — Product IDs only, no titles, descriptions, or images
    const maskedOrders = orders.map(order => ({
      ...order,
      items: order.items.map(it => ({
        id: it.id,
        productId: it.productId,
        productCode: (it.product as any)?.productCode || `PROD-#${it.productId}`,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
    }));
    res.status(200).json({ success: true, data: maskedOrders });
  } catch (error: any) {
    console.error('[Agent Get Orders Error]:', error);
    res.status(500).json({ success: false, message: `Failed to retrieve assigned orders: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/accept (Accept assignment within 3-minute window)
agentRouter.post('/orders/:id/accept', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.acceptAssignment(id, req.agent!.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Accept Order Error]:', error);
    res.status(500).json({ success: false, message: `Failed to accept order: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/reject (Reject assignment and rotate to next FIFO agent)
agentRouter.post('/orders/:id/reject', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.rejectAssignment(id, req.agent!.id);
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Reject Order Error]:', error);
    res.status(500).json({ success: false, message: `Failed to reject order: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/verify-otp (Verify customer 6-digit delivery OTP for Prepaid & COD)
agentRouter.post('/orders/:id/verify-otp', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { otp } = req.body || {};
    if (!otp || typeof otp !== 'string') {
      res.status(400).json({ success: false, message: '6-digit Delivery OTP is required' });
      return;
    }

    const result = await orderRepo.verifyDeliveryOtp(id, otp);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Verify OTP Error]:', error);
    res.status(500).json({ success: false, message: `OTP verification failed: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/complete-delivery (Complete PREPAID delivery once OTP is verified)
agentRouter.post('/orders/:id/complete-delivery', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.completePrepaidDelivery(id, req.agent!.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Complete Prepaid Delivery Error]:', error);
    res.status(500).json({ success: false, message: `Failed to complete prepaid delivery: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/cod-qr-submitted (Customer scanned dynamic UPI QR and paid)
agentRouter.post('/orders/:id/cod-qr-submitted', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reference } = req.body || {};
    const result = await orderRepo.submitCodQrPayment(id, req.agent!.id, reference);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Submit COD QR Error]:', error);
    res.status(500).json({ success: false, message: `Failed to submit COD QR payment: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/cod-cash-collected (Customer paid via physical Cash — LOCKS agent until deposited)
agentRouter.post('/orders/:id/cod-cash-collected', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.collectCodCash(id, req.agent!.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Collect Cash Error]:', error);
    res.status(500).json({ success: false, message: `Failed to collect COD cash: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/mark-cash-deposited (Agent physically hands cash at Hyderabad Store)
agentRouter.post('/orders/:id/mark-cash-deposited', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.markCashDepositedAtStore(id, req.agent!.id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (error: any) {
    console.error('[Agent Mark Cash Deposited Error]:', error);
    res.status(500).json({ success: false, message: `Failed to mark cash deposited: ${error.message}` });
  }
});

// GET /api/agent/orders/:id/tracking - Single source of truth for agent view
agentRouter.get('/orders/:id/tracking', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tracking = await orderRepo.getOrderTracking(id);
    if (!tracking) {
      res.status(404).json({ success: false, message: `Order '${id}' not found.` });
      return;
    }
    res.status(200).json({ success: true, data: tracking });
  } catch (err: any) {
    console.error('[Agent Order Tracking Error]:', err);
    res.status(500).json({ success: false, message: `Failed to fetch tracking: ${err.message}` });
  }
});

// PATCH /api/agent/orders/:id/location & POST /api/agent/orders/:id/location - Update live moving rider coordinates
const handleAgentOrderLocation = async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body || {};
    if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
      res.status(400).json({ success: false, message: 'Valid lat and lng coordinates are required.' });
      return;
    }
    const result = await orderRepo.updateOrderLocation(id, Number(lat), Number(lng));
    if (!result.success) {
      res.status(404).json({ success: false, message: `Order '${id}' not found.` });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        agent_lat: Number(lat),
        agent_lng: Number(lng),
        location_updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Agent Update Location Error]:', err);
    res.status(500).json({ success: false, message: `Failed to update location: ${err.message}` });
  }
};
agentRouter.patch('/orders/:id/location', requireAgentAuth, handleAgentOrderLocation);
agentRouter.post('/orders/:id/location', requireAgentAuth, handleAgentOrderLocation);

// GET /api/agent/orders/:id/nearest-agent - Nearest agent for handoff preview
agentRouter.get('/orders/:id/nearest-agent', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const nearest = await orderRepo.findNearestActiveAgent(id, req.agent!.id);
    if (!nearest) {
      res.status(404).json({
        success: false,
        message: 'No nearby online delivery agents are currently available for transfer.',
      });
      return;
    }
    res.status(200).json({ success: true, data: nearest });
  } catch (err: any) {
    console.error('[Agent Nearest Agent Error]:', err);
    res.status(500).json({ success: false, message: `Failed to find nearest agent: ${err.message}` });
  }
});

// POST /api/agent/orders/:id/transfer - Emergency order transfer to nearest active delivery agent
agentRouter.post('/orders/:id/transfer', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transferReason, handoffCoords } = req.body || {};

    if (!transferReason || typeof transferReason !== 'string' || transferReason.trim().length < 15) {
      res.status(400).json({
        success: false,
        message: 'A valid transfer reason of at least 15 characters is required.',
      });
      return;
    }

    const result = await orderRepo.transferOrder(id, req.agent!.id, transferReason.trim(), handoffCoords);
    if (!result.success) {
      const status = result.message.includes('No nearby online delivery agents') ? 409 : 400;
      res.status(status).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Agent Transfer Order Error]:', err);
    res.status(500).json({ success: false, message: `Failed to transfer order: ${err.message}` });
  }
});

// POST /api/agent/cash-deposit/submit (Agent submits entire pending cash balance deposited at Hyderabad store)
agentRouter.post('/cash-deposit/submit', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const agent = await agentRepo.findById(req.agent!.id);
    if (!agent) {
      res.status(404).json({ success: false, message: 'Delivery agent not found' });
      return;
    }
    if ((agent.pendingCashAmount || 0) <= 0 && !agent.hasPendingCashDeposit) {
      res.status(400).json({ success: false, message: 'No pending cash deposit required for your account' });
      return;
    }
    const result = await orderRepo.submitAgentCashDeposit(req.agent!.id);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('[Agent Submit Cash Deposit Error]:', error);
    res.status(500).json({ success: false, message: `Failed to submit store cash deposit: ${error.message}` });
  }
});

// GET /api/agent/notifications (Retrieve real-time alerts for the authenticated delivery agent)
agentRouter.get('/notifications', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const notifications = await notificationRepo.listForAgent(req.agent!.id, 50);
    const unreadCount = await notificationRepo.getUnreadCountForAgent(req.agent!.id);
    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error: any) {
    console.error('[Agent Notifications Error]:', error);
    res.status(500).json({ success: false, message: `Failed to retrieve notifications: ${error.message}` });
  }
});

// PATCH /api/agent/notifications/:id/read (Mark a single agent alert as read)
agentRouter.patch('/notifications/:id/read', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ok = await notificationRepo.markAsRead(id);
    res.status(200).json({ success: ok, message: ok ? 'Alert marked as read' : 'Notification not found' });
  } catch (error: any) {
    console.error('[Agent Mark Alert Read Error]:', error);
    res.status(500).json({ success: false, message: `Failed to update notification: ${error.message}` });
  }
});

// PATCH /api/agent/notifications/mark-all-read (Mark all agent alerts as read)
agentRouter.patch('/notifications/mark-all-read', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    await notificationRepo.markAllAsReadForAgent(req.agent!.id);
    res.status(200).json({ success: true, message: 'All alerts marked as read' });
  } catch (error: any) {
    console.error('[Agent Mark All Alerts Read Error]:', error);
    res.status(500).json({ success: false, message: `Failed to mark alerts read: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/collect-payment (Backward compatibility alias for settlement)
agentRouter.post('/orders/:id/collect-payment', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body || {};
    if (paymentMethod === 'cash') {
      const result = await orderRepo.collectCodCash(id, req.agent!.id);
      res.status(result.success ? 200 : 400).json(result);
    } else {
      const result = await orderRepo.submitCodQrPayment(id, req.agent!.id);
      res.status(result.success ? 200 : 400).json(result);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Payment settlement failed: ${error.message}` });
  }
});

// GET /api/agent/my-analytics (Agent self-service performance, earnings, COD liability & heatmap)
agentRouter.get('/my-analytics', requireAgentAuth, agentAnalyticsController.getMyAnalytics);

// GET /api/agent/earnings (Get wallet earnings summary in INR with Cash Deposit Lock status)
agentRouter.get('/earnings', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const agent = await agentRepo.findById(req.agent!.id);
    res.status(200).json({
      success: true,
      data: {
        totalEarnings: agent?.totalEarnings || 0,
        deliveredOrdersCount: agent?.deliveredOrdersCount || 0,
        commissionRate: agent?.commissionRate || 15.00,
        currency: 'INR',
        hasPendingCashDeposit: agent?.hasPendingCashDeposit || false,
        pendingCashAmount: agent?.pendingCashAmount || 0.00,
      },
    });
  } catch (error: any) {
    console.error('[Agent Get Earnings Error]:', error);
    res.status(500).json({ success: false, message: `Failed to retrieve earnings: ${error.message}` });
  }
});
