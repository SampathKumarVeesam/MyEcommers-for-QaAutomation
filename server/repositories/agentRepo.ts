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
    deliveryZone: row.delivery_zone || 'Central Hub',
    isEmailVerified: Boolean(row.is_email_verified),
    mustChangePassword: Boolean(row.must_change_password),
    isActive: Boolean(row.is_active),
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
    const res = await query(`SELECT * FROM delivery_agents ORDER BY created_at DESC`);
    return res.rows.map(mapAgentRow);
  }

  async findLeastLoadedActive(): Promise<DeliveryAgent | null> {
    const res = await query(
      `SELECT * FROM delivery_agents
       WHERE is_active = TRUE AND is_email_verified = TRUE
       ORDER BY delivered_orders_count ASC, created_at ASC
       LIMIT 1`
    );
    if (res.rows.length === 0) return null;
    return mapAgentRow(res.rows[0]);
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
    if (existing) return existing;

    const hash = bcrypt.hashSync('Agent@123', 10);
    return await this.createAgent({
      name: 'Alex Rivers',
      email: 'agent.alex@shopsphere.test',
      phone: '+1 (555) 789-0123',
      gender: 'non_binary',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      vehicleType: 'Electric Motorcycle',
      deliveryZone: 'Central Hub',
      passwordHash: hash,
      isEmailVerified: true,
      mustChangePassword: false,
      commissionRate: 15.00,
    });
  }
}

export const agentRepo = new AgentRepository();
