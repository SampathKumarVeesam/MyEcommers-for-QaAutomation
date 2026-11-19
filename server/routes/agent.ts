import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import { AuthenticatedAgentRequest, generateAgentToken, requireAgentAuth } from '../middleware/auth.js';
import { agentRepo } from '../repositories/agentRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';
import {
  sendAgentTemporaryPasswordEmail,
  sendAgentVerificationEmail,
  sendOrderStatusUpdateEmail,
} from '../services/emailService.js';
import { Gender } from '../../src/types.js';

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

    res.status(201).json({
      success: true,
      message: 'Registration successful! Verification token sent to your email address.',
      data: {
        agent: created,
        verificationToken, // Provided for instant QA testing
      },
    });

    // Send verification email in background
    setImmediate(async () => {
      try {
        await sendAgentVerificationEmail({ name: created.name, email: created.email }, verificationToken);
      } catch (e) {
        console.error('[Agent Verification Email Error]:', e);
      }
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

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! A temporary login password has been sent to your email.',
      data: {
        agent: updated,
        tempPassword, // Included for instant QA workflow verification
      },
    });

    // Dispatch temporary password to verified email
    setImmediate(async () => {
      try {
        await sendAgentTemporaryPasswordEmail({ name: verifyResult.agent!.name, email: verifyResult.agent!.email }, tempPassword);
      } catch (e) {
        console.error('[Agent Temp Password Email Error]:', e);
      }
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

    if (!agentWithCreds.isActive) {
      res.status(403).json({
        success: false,
        message: 'Your delivery agent account is inactive. Please contact the administrator.',
      });
      return;
    }

    const isMatch = bcrypt.compareSync(password, agentWithCreds.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

    const token = generateAgentToken(agentWithCreds);
    const { passwordHash: _, verificationToken: __, ...safeAgent } = agentWithCreds;

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
  } catch (error: any) {
    console.error('[Agent Login Error]:', error);
    res.status(500).json({ success: false, message: `Login failed: ${error.message}` });
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

// GET /api/agent/orders (Get assigned orders for authenticated agent)
agentRouter.get('/orders', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const orders = await orderRepo.getOrdersByAgent(req.agent!.id);
    res.status(200).json({ success: true, data: orders });
  } catch (error: any) {
    console.error('[Agent Get Orders Error]:', error);
    res.status(500).json({ success: false, message: `Failed to retrieve assigned orders: ${error.message}` });
  }
});

// POST /api/agent/orders/:id/verify-otp (Verify customer 6-digit delivery OTP)
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

// POST /api/agent/orders/:id/collect-payment (Settle Cash / UPI payment, mark DELIVERED & credit earnings)
agentRouter.post('/orders/:id/collect-payment', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body || {};
    if (paymentMethod !== 'cash' && paymentMethod !== 'upi') {
      res.status(400).json({ success: false, message: "paymentMethod must be either 'cash' or 'upi'" });
      return;
    }

    const result = await orderRepo.collectPayment(id, paymentMethod, req.agent!.id);
    if (!result.success || !result.order) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);

    // Send customer DELIVERED confirmation email in background
    setImmediate(async () => {
      try {
        await sendOrderStatusUpdateEmail(result.order!, 'delivered');
      } catch (e) {
        console.error('[Delivered Status Email Error]:', e);
      }
    });
  } catch (error: any) {
    console.error('[Agent Collect Payment Error]:', error);
    res.status(500).json({ success: false, message: `Payment settlement failed: ${error.message}` });
  }
});

// GET /api/agent/earnings (Get wallet earnings summary)
agentRouter.get('/earnings', requireAgentAuth, async (req: AuthenticatedAgentRequest, res: Response): Promise<void> => {
  try {
    const agent = await agentRepo.findById(req.agent!.id);
    res.status(200).json({
      success: true,
      data: {
        totalEarnings: agent?.totalEarnings || 0,
        deliveredOrdersCount: agent?.deliveredOrdersCount || 0,
        commissionRate: agent?.commissionRate || 15.00,
        currency: 'USD',
      },
    });
  } catch (error: any) {
    console.error('[Agent Get Earnings Error]:', error);
    res.status(500).json({ success: false, message: `Failed to retrieve earnings: ${error.message}` });
  }
});
