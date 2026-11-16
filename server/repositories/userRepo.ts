import bcrypt from 'bcryptjs';
import { Address, User } from '../../src/types.js';
import { query } from '../db/pool.js';

export function mapUserRow(row: any): User {
  return {
    id: row.user_code || String(row.id),
    name: row.name,
    email: row.email,
    passwordHash: row.password,
    role: row.role as 'admin' | 'customer',
    phone: row.phone || undefined,
    avatar: row.avatar || undefined,
    provider: (row.provider as 'local' | 'google' | 'apple') || 'local',
    providerId: row.provider_id || undefined,
    address: row.address_line_1
      ? {
          fullName: row.name,
          street: row.address_line_1,
          city: row.address_city || '',
          state: row.address_state || '',
          postalCode: row.address_postal_code || '',
          country: row.address_country || 'United States',
          phone: row.phone || '',
        }
      : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const normalized = email.trim().toLowerCase();
    const res = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalized]
    );
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const normalized = identifier.trim().toLowerCase();
    const res = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1) LIMIT 1`,
      [normalized]
    );
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  }

  async findByProvider(provider: string, providerId: string): Promise<User | null> {
    const res = await query(
      `SELECT * FROM users WHERE provider = $1 AND provider_id = $2 LIMIT 1`,
      [provider, providerId]
    );
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  }

  async linkProvider(
    userId: string | number,
    provider: string,
    providerId: string,
    avatar?: string
  ): Promise<User | null> {
    const isNum = !isNaN(Number(userId));
    const res = await query(
      `UPDATE users 
       SET provider = $1, provider_id = $2, avatar = COALESCE($3, avatar) 
       WHERE (user_code = $4 ${isNum ? 'OR id = $5' : ''})
       RETURNING *`,
      isNum ? [provider, providerId, avatar || null, String(userId), Number(userId)] : [provider, providerId, avatar || null, String(userId)]
    );
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  }

  async updatePassword(userId: string | number, newHash: string): Promise<void> {
    const isNum = !isNaN(Number(userId));
    await query(
      `UPDATE users SET password = $1 WHERE user_code = $2 ${isNum ? 'OR id = $3' : ''}`,
      isNum ? [newHash, String(userId), Number(userId)] : [newHash, String(userId)]
    );
  }

  async findById(id: string | number): Promise<User | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `SELECT * FROM users WHERE (user_code = $1 ${isNum ? 'OR id = $2' : ''}) LIMIT 1`,
      isNum ? [String(id), Number(id)] : [String(id)]
    );
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  }

  async findRawById(id: string | number): Promise<any | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `SELECT * FROM users WHERE (user_code = $1 ${isNum ? 'OR id = $2' : ''}) LIMIT 1`,
      isNum ? [String(id), Number(id)] : [String(id)]
    );
    return res.rows[0] || null;
  }

  /**
   * Automatically detects and returns the lowest missing integer primary key gap (1, 2, 3...)
   * Ensures deleted IDs (like ID 1 or gap IDs) are reused before jumping to higher numbers.
   */
  async getNextAvailableId(): Promise<number> {
    try {
      const res = await query(`
        SELECT COALESCE(
          (
            SELECT gap.id
            FROM (
              SELECT 1 AS id WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1)
              UNION ALL
              SELECT u.id + 1 AS id
              FROM users u
              WHERE NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.id = u.id + 1)
            ) gap
            ORDER BY gap.id ASC
            LIMIT 1
          ),
          1
        ) AS next_id
      `);
      return parseInt(res.rows[0]?.next_id || '1', 10);
    } catch {
      return 1;
    }
  }

  async create(user: {
    id?: string;
    explicitNumericId?: number;
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role?: 'admin' | 'customer';
    phone?: string;
    avatar?: string;
    provider?: 'local' | 'google' | 'apple' | string;
    providerId?: string;
    address?: Address;
  }): Promise<User> {
    let userCode = user.id || `user_${Date.now().toString(36)}`;
    const username = user.username || user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const role = user.role || 'customer';
    const provider = user.provider || 'local';
    const providerId = user.providerId || null;

    // Reuse lowest missing primary key ID gap (e.g. 1 if missing, or filling any deleted ID gap)
    let nextNumericId = user.explicitNumericId;
    if (nextNumericId) {
      const checkRes = await query('SELECT 1 FROM users WHERE id = $1', [nextNumericId]);
      if (checkRes.rows.length > 0) {
        nextNumericId = await this.getNextAvailableId();
      }
    } else {
      nextNumericId = await this.getNextAvailableId();
    }

    // Ensure unique user_code
    const codeCheck = await query('SELECT 1 FROM users WHERE user_code = $1', [userCode]);
    if (codeCheck.rows.length > 0) {
      userCode = `${userCode}_${Date.now().toString(36).slice(-4)}`;
    }

    const res = await query(
      `INSERT INTO users (
         id, user_code, name, username, email, password, role, phone, avatar,
         address_line_1, address_city, address_state, address_postal_code, address_country,
         provider, provider_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        nextNumericId,
        userCode,
        user.name,
        username,
        user.email.toLowerCase().trim(),
        user.passwordHash,
        role,
        user.phone || null,
        user.avatar || null,
        user.address?.street || null,
        user.address?.city || null,
        user.address?.state || null,
        user.address?.postalCode || null,
        user.address?.country || null,
        provider,
        providerId,
      ]
    );

    // Keep sequence synchronized with max id to prevent future duplicate key conflicts
    try {
      await query(`
        SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1))
      `);
    } catch {}

    return mapUserRow(res.rows[0]);
  }

  /**
   * Guarantees the admin user exists in PostgreSQL (even after TRUNCATE TABLE users)
   */
  async ensureAdminUser(): Promise<User> {
    const adminEmail = 'admin@practicesoftwaretesting.com';
    let existing = await this.findByEmail(adminEmail);
    if (!existing) {
      existing = await this.findByIdentifier('admin');
    }
    if (existing) {
      await this.updatePassword(existing.id, bcrypt.hashSync('Sampath@123', 10));
      return (await this.findById(existing.id))!;
    }

    const adminHash = bcrypt.hashSync('Sampath@123', 10);
    return await this.create({
      explicitNumericId: 1,
      id: 'user_admin_001',
      name: 'Sampath Kumar (admin)',
      username: 'admin',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
      phone: '+1 (555) 019-2834',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    });
  }

  /**
   * Restores essential QA seed accounts (Admin, Customer 1, Customer 2)
   */
  async ensureSeedUsers(): Promise<void> {
    await this.ensureAdminUser();

    const c1 = await this.findByEmail('customer@practicesoftwaretesting.com');
    if (!c1) {
      await this.create({
        explicitNumericId: 2,
        id: 'user_cust_001',
        name: 'Jane Customer (User 1)',
        username: 'customer',
        email: 'customer@practicesoftwaretesting.com',
        passwordHash: bcrypt.hashSync('User01', 10),
        role: 'customer',
        phone: '+1 (555) 482-9102',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
      });
    }

    const c2 = await this.findByEmail('customer2@practicesoftwaretesting.com');
    if (!c2) {
      await this.create({
        explicitNumericId: 3,
        id: 'user_cust_002',
        name: 'Alex Rivera (User 2)',
        username: 'customer2',
        email: 'customer2@practicesoftwaretesting.com',
        passwordHash: bcrypt.hashSync('User02', 10),
        role: 'customer',
        phone: '+1 (555) 839-1120',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      });
    }
  }

  async updateProfile(
    userId: string | number,
    updates: {
      name?: string;
      phone?: string;
      avatar?: string;
      address?: Address;
    }
  ): Promise<User | null> {
    const raw = await this.findRawById(userId);
    if (!raw) return null;

    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(updates.name.trim());
    }
    if (updates.phone !== undefined) {
      sets.push(`phone = $${idx++}`);
      values.push(updates.phone.trim());
    }
    if (updates.avatar !== undefined) {
      sets.push(`avatar = $${idx++}`);
      values.push(updates.avatar);
    }
    if (updates.address) {
      if (updates.address.street !== undefined) {
        sets.push(`address_line_1 = $${idx++}`);
        values.push(updates.address.street);
      }
      if (updates.address.city !== undefined) {
        sets.push(`address_city = $${idx++}`);
        values.push(updates.address.city);
      }
      if (updates.address.state !== undefined) {
        sets.push(`address_state = $${idx++}`);
        values.push(updates.address.state);
      }
      if (updates.address.postalCode !== undefined) {
        sets.push(`address_postal_code = $${idx++}`);
        values.push(updates.address.postalCode);
      }
      if (updates.address.country !== undefined) {
        sets.push(`address_country = $${idx++}`);
        values.push(updates.address.country);
      }
    }

    if (sets.length === 0) {
      return mapUserRow(raw);
    }

    values.push(raw.id);
    const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, values);
    return mapUserRow(res.rows[0]);
  }

  async listAll(): Promise<User[]> {
    const res = await query(`SELECT * FROM users ORDER BY id ASC`);
    return res.rows.map(mapUserRow);
  }

  async updateRole(id: string | number, role: 'admin' | 'customer'): Promise<User | null> {
    const raw = await this.findRawById(id);
    if (!raw) return null;
    const res = await query(`UPDATE users SET role = $1 WHERE id = $2 RETURNING *`, [role, raw.id]);
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
  }

  async deleteUser(id: string | number): Promise<boolean> {
    const raw = await this.findRawById(id);
    if (!raw) return false;
    const res = await query(`DELETE FROM users WHERE id = $1 RETURNING id`, [raw.id]);
    return (res.rowCount ?? 0) > 0;
  }
}

export const userRepo = new UserRepository();
