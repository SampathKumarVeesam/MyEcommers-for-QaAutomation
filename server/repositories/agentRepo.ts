import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { DeliveryAgent, Gender } from '../../src/types.js';
import { query } from '../db/pool.js';

export function mapAgentRow(row: any): DeliveryAgent {
  return {
    id: String(row.id),
    agentCode: row.agent_code || `AGT-${row.id}`,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    gender: (row.gender as Gender) || 'prefer_not_to_say',
    avatarUrl: row.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    role: 'delivery_agent',
    vehicleType: row.vehicle_type || 'Motorcycle',
    deliveryZone: row.delivery_zone || 'Hitech City / Madhapur, Hyderabad',
    isEmailVerified: Boolean(row.is_email_verified),
    mustChangePassword: Boolean(row.must_change_password),
    isActive: Boolean(row.is_active),
    isLoggedIn: Boolean(row.is_logged_in),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at).toISOString() : new Date().toISOString(),
    fifoQueueJoinedAt: row.fifo_queue_joined_at ? new Date(row.fifo_queue_joined_at).toISOString() : new Date().toISOString(),
    hasPendingCashDeposit: Boolean(row.has_pending_cash_deposit),
    pendingCashAmount: parseFloat(row.pending_cash_amount || '0.00'),
    cashDepositStatus: (row.cash_deposit_status as any) || 'NONE',
    depositRejectionReason: row.deposit_rejection_reason || null,
    currentLat: row.current_lat ? parseFloat(row.current_lat) : 17.4486,
    currentLng: row.current_lng ? parseFloat(row.current_lng) : 78.3908,
    commissionRate: parseFloat(row.commission_rate || '15.00'),
    totalEarnings: parseFloat(row.total_earnings || '0.00'),
    deliveredOrdersCount: parseInt(row.delivered_orders_count || '0', 10),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export class AgentRepository {
  async findByEmail(email: string): Promise<(DeliveryAgent & { passwordHash: string; verificationToken?: string }) | null> {
    const res = await query(
      `SELECT * FROM delivery_agents WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      ...mapAgentRow(row),
      passwordHash: row.password_hash,
      verificationToken: row.email_verification_token,
    };
  }

  async findById(id: string): Promise<DeliveryAgent | null> {
    const res = await query(
      `SELECT * FROM delivery_agents WHERE id = $1 OR agent_code = $1 LIMIT 1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async createAgent(data: {
    name: string;
    email: string;
    phone?: string;
    gender?: Gender;
    avatarUrl?: string;
    vehicleType?: string;
    deliveryZone?: string;
    passwordHash: string;
    verificationToken?: string;
    isEmailVerified?: boolean;
    mustChangePassword?: boolean;
    commissionRate?: number;
  }): Promise<DeliveryAgent> {
    const id = `agent_${crypto.randomUUID().slice(0, 10)}`;
    const agentCode = `AGT-${Math.floor(1000 + Math.random() * 9000)}`;

    const res = await query(
      `INSERT INTO delivery_agents (
         id, agent_code, name, email, password_hash, phone, gender,
         avatar_url, role, vehicle_type, delivery_zone, is_email_verified,
         email_verification_token, must_change_password, is_active,
         commission_rate, total_earnings, delivered_orders_count
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        id,
        agentCode,
        data.name.trim(),
        data.email.trim().toLowerCase(),
        data.passwordHash,
        data.phone?.trim() || null,
        data.gender || 'prefer_not_to_say',
        data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        'delivery_agent',
        data.vehicleType || 'Motorcycle',
        data.deliveryZone || 'Central Hub',
        data.isEmailVerified ?? false,
        data.verificationToken || null,
        data.mustChangePassword ?? true,
        true,
        data.commissionRate || 15.00,
        0.00,
        0,
      ]
    );

    return mapAgentRow(res.rows[0]);
  }

  async verifyEmail(email: string, token: string): Promise<{ success: boolean; message: string; agent?: DeliveryAgent }> {
    const agent = await this.findByEmail(email);
    if (!agent) {
      return { success: false, message: 'Delivery agent account not found' };
    }
    if (agent.isEmailVerified) {
      return { success: true, message: 'Email is already verified', agent };
    }
    if (agent.verificationToken && agent.verificationToken !== token.trim()) {
      return { success: false, message: 'Invalid verification token or code' };
    }

    const res = await query(
      `UPDATE delivery_agents
       SET is_email_verified = TRUE, email_verification_token = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [agent.id]
    );

    return {
      success: true,
      message: 'Email successfully verified',
      agent: mapAgentRow(res.rows[0]),
    };
  }

  async setTemporaryPassword(agentId: string, tempPasswordHash: string): Promise<DeliveryAgent | null> {
    const res = await query(
      `UPDATE delivery_agents
       SET password_hash = $1, must_change_password = TRUE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [tempPasswordHash, agentId]
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async updatePassword(agentId: string, newPasswordHash: string): Promise<boolean> {
    const res = await query(
      `UPDATE delivery_agents
       SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, agentId]
    );
    return (res.rowCount || 0) > 0;
  }

  async setPasswordResetOtp(email: string, otp: string, token: string, expiresAt: Date): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    const res = await query(
      `UPDATE delivery_agents
       SET reset_password_otp = $1, reset_password_token = $2, reset_password_expires_at = $3, otp_verified = FALSE, updated_at = NOW()
       WHERE LOWER(email) = LOWER($4)
       RETURNING id`,
      [otp, token, expiresAt, normalized]
    );
    return (res.rowCount || 0) > 0;
  }

  async verifyResetOtp(email: string, otp: string): Promise<{ success: boolean; message: string; token?: string }> {
    const normalized = email.trim().toLowerCase();
    const cleanCode = otp.trim();

    const agentRes = await query(
      `SELECT * FROM delivery_agents WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalized]
    );
    if (agentRes.rows.length === 0) {
      return { success: false, message: 'No delivery agent account found with this email address.' };
    }

    const row = agentRes.rows[0];
    if (!row.reset_password_otp) {
      return { success: false, message: 'No active password reset request found. Please request a new OTP.' };
    }

    if (row.reset_password_expires_at && new Date() > new Date(row.reset_password_expires_at)) {
      return { success: false, message: 'Password reset OTP has expired. Please request a new code.' };
    }

    if (String(row.reset_password_otp).trim() !== cleanCode) {
      return { success: false, message: 'Invalid verification OTP. Please check the 6-digit code and try again.' };
    }

    await query(
      `UPDATE delivery_agents SET otp_verified = TRUE WHERE id = $1`,
      [row.id]
    );

    return {
      success: true,
      message: 'OTP verified successfully.',
      token: row.reset_password_token || undefined,
    };
  }

  async verifyAndResetPassword(email: string, otpOrToken: string, newPasswordHash: string): Promise<{ success: boolean; message: string; agent?: DeliveryAgent }> {
    const normalized = email.trim().toLowerCase();
    const cleanCode = otpOrToken.trim();

    const agentRes = await query(
      `SELECT * FROM delivery_agents WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalized]
    );
    if (agentRes.rows.length === 0) {
      return { success: false, message: 'Delivery agent account not found with this email address.' };
    }

    const row = agentRes.rows[0];
    if (!row.reset_password_otp && !row.reset_password_token && !row.otp_verified) {
      return { success: false, message: 'No active password reset request found. Please request a new OTP.' };
    }

    if (row.reset_password_expires_at && new Date() > new Date(row.reset_password_expires_at)) {
      return { success: false, message: 'Password reset OTP has expired. Please request a new code.' };
    }

    const matchesOtp = row.reset_password_otp && String(row.reset_password_otp).trim() === cleanCode;
    const matchesToken = row.reset_password_token && String(row.reset_password_token).trim() === cleanCode;
    const isAlreadyVerified = Boolean(row.otp_verified);

    if (!matchesOtp && !matchesToken && !isAlreadyVerified) {
      return { success: false, message: 'Invalid verification OTP or reset token. Please check and try again.' };
    }

    const updateRes = await query(
      `UPDATE delivery_agents
       SET password_hash = $1, must_change_password = FALSE, reset_password_otp = NULL, reset_password_token = NULL, reset_password_expires_at = NULL, otp_verified = FALSE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newPasswordHash, row.id]
    );

    return {
      success: true,
      message: 'Agent password reset successfully.',
      agent: mapAgentRow(updateRes.rows[0]),
    };
  }

  async updateProfile(
    agentId: string,
    data: {
      name?: string;
      phone?: string;
      gender?: Gender;
      vehicleType?: string;
      deliveryZone?: string;
      avatarUrl?: string;
    }
  ): Promise<DeliveryAgent | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(data.name.trim());
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${idx++}`);
      values.push(data.phone.trim());
    }
    if (data.gender !== undefined) {
      updates.push(`gender = $${idx++}`);
      values.push(data.gender);
    }
    if (data.vehicleType !== undefined) {
      updates.push(`vehicle_type = $${idx++}`);
      values.push(data.vehicleType.trim());
    }
    if (data.deliveryZone !== undefined) {
      updates.push(`delivery_zone = $${idx++}`);
      values.push(data.deliveryZone.trim());
    }
    if (data.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      values.push(data.avatarUrl);
    }

    if (updates.length === 0) {
      return this.findById(agentId);
    }

    updates.push(`updated_at = NOW()`);
    values.push(agentId);

    const res = await query(
      `UPDATE delivery_agents SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async updateAvatar(agentId: string, avatarUrl: string): Promise<DeliveryAgent | null> {
    const res = await query(
      `UPDATE delivery_agents SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [avatarUrl, agentId]
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async creditEarnings(agentId: string, amount: number): Promise<DeliveryAgent | null> {
    const res = await query(
      `UPDATE delivery_agents
       SET total_earnings = total_earnings + $1,
           delivered_orders_count = delivered_orders_count + 1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amount, agentId]
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async listAll(): Promise<DeliveryAgent[]> {
    return this.listAllWithRank();
  }

  async setLoginStatus(agentId: string, isLoggedIn: boolean): Promise<DeliveryAgent | null> {
    const res = await query(
      `UPDATE delivery_agents
       SET is_logged_in = $1,
           is_active = $1,
           last_active_at = NOW(),
           fifo_queue_joined_at = CASE WHEN $1 = TRUE THEN NOW() ELSE fifo_queue_joined_at END,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [isLoggedIn, agentId]
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async heartbeat(agentId: string, coords?: { lat: number; lng: number }): Promise<void> {
    if (coords && coords.lat && coords.lng) {
      await query(
        `UPDATE delivery_agents
         SET last_active_at = NOW(),
             current_lat = $1,
             current_lng = $2,
             is_logged_in = TRUE,
             is_active = TRUE,
             updated_at = NOW()
         WHERE id = $3`,
        [coords.lat, coords.lng, agentId]
      );
    } else {
      await query(
        `UPDATE delivery_agents
         SET last_active_at = NOW(),
             is_logged_in = TRUE,
             is_active = TRUE,
             updated_at = NOW()
         WHERE id = $1`,
        [agentId]
      );
    }
  }

  async updateCoordinates(agentId: string, lat: number, lng: number): Promise<void> {
    await query(
      `UPDATE delivery_agents
       SET current_lat = $1,
           current_lng = $2,
           last_active_at = NOW(),
           updated_at = NOW()
       WHERE id = $3`,
      [lat, lng, agentId]
    );
  }

  async recordCashCollection(agentId: string, amount: number): Promise<void> {
    await query(
      `UPDATE delivery_agents
       SET has_pending_cash_deposit = TRUE,
           pending_cash_amount = pending_cash_amount + $1,
           cash_deposit_status = 'PENDING_STORE_DEPOSIT',
           deposit_rejection_reason = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [amount, agentId]
    );
  }

  async submitCashDeposit(agentId: string): Promise<void> {
    await query(
      `UPDATE delivery_agents
       SET cash_deposit_status = 'DEPOSIT_SUBMITTED_FOR_APPROVAL',
           deposit_rejection_reason = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [agentId]
    );
  }

  async approveCashDeposit(agentId: string): Promise<void> {
    await query(
      `UPDATE delivery_agents
       SET has_pending_cash_deposit = FALSE,
           pending_cash_amount = 0.00,
           cash_deposit_status = 'APPROVED',
           deposit_rejection_reason = NULL,
           fifo_queue_joined_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [agentId]
    );
  }

  async rejectCashDeposit(agentId: string, reason: string): Promise<void> {
    await query(
      `UPDATE delivery_agents
       SET has_pending_cash_deposit = TRUE,
           cash_deposit_status = 'REJECTED_RESUBMIT_REQUIRED',
           deposit_rejection_reason = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [reason || 'Cash deposit not received at Hyderabad store', agentId]
    );
  }

  async confirmCashDeposit(agentId: string): Promise<void> {
    await this.approveCashDeposit(agentId);
  }

  async resetFifoQueue(agentId: string): Promise<void> {
    await query(
      `UPDATE delivery_agents
       SET fifo_queue_joined_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [agentId]
    );
  }

  async findEligibleFIFOAgent(excludedAgentIds: string[] = []): Promise<DeliveryAgent | null> {
    let queryStr = `
      SELECT * FROM delivery_agents
      WHERE is_email_verified = TRUE
        AND is_logged_in = TRUE
        AND last_active_at >= NOW() - INTERVAL '15 minutes'
        AND has_pending_cash_deposit = FALSE
    `;
    const params: any[] = [];

    if (excludedAgentIds.length > 0) {
      queryStr += ` AND id NOT IN (${excludedAgentIds.map((_, i) => `$${i + 1}`).join(', ')})`;
      params.push(...excludedAgentIds);
    }

    queryStr += ` ORDER BY fifo_queue_joined_at ASC, id ASC LIMIT 1`;

    const res = await query(queryStr, params);
    if (res.rows.length === 0) {
      if (excludedAgentIds.length > 0) {
        const fallbackRes = await query(
          `SELECT * FROM delivery_agents
           WHERE is_email_verified = TRUE
             AND is_logged_in = TRUE
             AND last_active_at >= NOW() - INTERVAL '15 minutes'
             AND has_pending_cash_deposit = FALSE
           ORDER BY fifo_queue_joined_at ASC, id ASC LIMIT 1`
        );
        if (fallbackRes.rows.length > 0) {
          return mapAgentRow(fallbackRes.rows[0]);
        }
      }
      return null;
    }

    return mapAgentRow(res.rows[0]);
  }

  async listAllWithRank(): Promise<DeliveryAgent[]> {
    const res = await query(`
      SELECT *,
        CASE
          WHEN is_email_verified = TRUE
           AND is_logged_in = TRUE
           AND last_active_at >= NOW() - INTERVAL '15 minutes'
           AND has_pending_cash_deposit = FALSE
          THEN ROW_NUMBER() OVER (
            PARTITION BY (
              is_email_verified = TRUE
              AND is_logged_in = TRUE
              AND last_active_at >= NOW() - INTERVAL '15 minutes'
              AND has_pending_cash_deposit = FALSE
            )
            ORDER BY fifo_queue_joined_at ASC, id ASC
          )
          ELSE NULL
        END as fifo_rank
      FROM delivery_agents
      ORDER BY created_at DESC
    `);
    return res.rows.map(r => ({
      ...mapAgentRow(r),
      fifoRank: r.fifo_rank ? parseInt(r.fifo_rank, 10) : undefined,
    }));
  }

  async findLeastLoadedActive(): Promise<DeliveryAgent | null> {
    return this.findEligibleFIFOAgent();
  }

  async updateStatusOrCommission(
    agentId: string,
    data: { isActive?: boolean; commissionRate?: number }
  ): Promise<DeliveryAgent | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(data.isActive);
    }
    if (data.commissionRate !== undefined) {
      updates.push(`commission_rate = $${idx++}`);
      values.push(data.commissionRate);
    }

    if (updates.length === 0) return this.findById(agentId);

    updates.push(`updated_at = NOW()`);
    values.push(agentId);

    const res = await query(
      `UPDATE delivery_agents SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
  }

  async ensureSeedAgent(): Promise<DeliveryAgent> {
    const existing = await this.findByEmail('agent.alex@shopsphere.test');
    if (existing) {
      // Ensure seed agent is active, logged in, and set to Hyderabad with synced Agent@123 hash
      const hash123 = bcrypt.hashSync('Agent@123', 10);
      await query(
        `UPDATE delivery_agents
         SET password_hash = $1,
             is_active = TRUE,
             is_logged_in = TRUE,
             must_change_password = FALSE,
             is_email_verified = TRUE,
             last_active_at = NOW(),
             phone = COALESCE(phone, '+91 98490 88776'),
             delivery_zone = 'Hitech City / Madhapur, Hyderabad',
             current_lat = 17.4486,
             current_lng = 78.3908
         WHERE id = $2`,
        [hash123, existing.id]
      );
      await this.ensureUdayAgent();
      return existing;
    }

    const hash = bcrypt.hashSync('Agent@123', 10);
    const agent = await this.createAgent({
      name: 'Alex Rivers',
      email: 'agent.alex@shopsphere.test',
      phone: '+91 98490 88776',
      gender: 'non_binary',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      vehicleType: 'Electric Motorcycle',
      deliveryZone: 'Hitech City / Madhapur, Hyderabad',
      passwordHash: hash,
      isEmailVerified: true,
      mustChangePassword: false,
      commissionRate: 15.00,
    });

    await query(
      `UPDATE delivery_agents
       SET is_logged_in = TRUE,
           last_active_at = NOW(),
           current_lat = 17.4486,
           current_lng = 78.3908
       WHERE id = $1`,
      [agent.id]
    );

    await this.ensureUdayAgent();
    return agent;
  }

  async ensureUdayAgent(): Promise<void> {
    try {
      const udayExisting = await this.findByEmail('agent.uday@shopsphere.test');
      const hashUday = bcrypt.hashSync('Agent@123', 10);
      if (!udayExisting) {
        await query(
          `INSERT INTO delivery_agents (
             id, agent_code, name, email, password_hash, phone, gender,
             avatar_url, role, vehicle_type, delivery_zone, is_email_verified,
             email_verification_token, must_change_password, is_active, is_logged_in,
             commission_rate, total_earnings, delivered_orders_count, current_lat, current_lng
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NULL, FALSE, TRUE, TRUE, 15.00, 60.00, 4, 17.4486, 78.3908)
           ON CONFLICT (email) DO NOTHING`,
          [
            'agent_uday_hyderabad',
            'AGT-6787',
            'Uday',
            'agent.uday@shopsphere.test',
            hashUday,
            '+91 98985 89680',
            'male',
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
            'delivery_agent',
            'Motorcycle',
            'Downtown, Hyderabad',
          ]
        );
      } else {
        await query(
          `UPDATE delivery_agents
           SET password_hash = $1,
               agent_code = 'AGT-6787',
               is_active = TRUE,
               is_logged_in = TRUE,
               must_change_password = FALSE,
               is_email_verified = TRUE,
               total_earnings = 60.00,
               delivered_orders_count = 4,
               delivery_zone = 'Downtown, Hyderabad'
           WHERE id = $2`,
          [hashUday, udayExisting.id]
        );
      }
    } catch (e: any) {
      console.warn('[Ensure Uday Agent]:', e.message);
    }
  }
}

export const agentRepo = new AgentRepository();
