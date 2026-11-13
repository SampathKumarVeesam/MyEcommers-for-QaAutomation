import { User } from '../../src/types.js';
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
    address: row.address_line_1 ? {
      fullName: row.name,
      street: row.address_line_1,
      city: row.address_city || '',
      state: row.address_state || '',
      postalCode: row.address_postal_code || '',
      country: row.address_country || 'United States',
      phone: row.phone || '',
    } : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const res = await query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    if (res.rows.length === 0) return null;
    return mapUserRow(res.rows[0]);
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

  async create(user: {
    id?: string;
    name: string;
    username?: string;
    email: string;
    passwordHash: string;
    role?: 'admin' | 'customer';
    phone?: string;
    avatar?: string;
    address?: any;
  }): Promise<User> {
    const userCode = user.id || `user_${Date.now().toString(36)}`;
    const username = user.username || user.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
    const role = user.role || 'customer';

    const res = await query(
      `INSERT INTO users (
         user_code, name, username, email, password, role, phone, avatar,
         address_line_1, address_city, address_state, address_postal_code, address_country
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
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
      ]
    );

    return mapUserRow(res.rows[0]);
  }

  async listAll(): Promise<User[]> {
    const res = await query(`SELECT * FROM users ORDER BY id ASC`);
    return res.rows.map(mapUserRow);
  }
}

export const userRepo = new UserRepository();

