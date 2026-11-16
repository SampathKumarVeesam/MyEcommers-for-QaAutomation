import { query } from '../db/pool.js';

export interface Store {
  id: number;
  name: string;
  address: string;
  phone?: string;
  createdAt: string;
}

export class StoreRepository {
  async getAllStores(): Promise<Store[]> {
    const res = await query(`SELECT * FROM store ORDER BY id ASC`);
    return res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  }

  async getStoreById(id: number): Promise<Store | null> {
    const res = await query(`SELECT * FROM store WHERE id = $1 LIMIT 1`, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async createStore(data: { name: string; address: string; phone?: string }): Promise<Store> {
    const res = await query(
      `INSERT INTO store (name, address, phone) VALUES ($1, $2, $3) RETURNING *`,
      [data.name, data.address, data.phone || null]
    );
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }

  async updateStore(id: number, data: { name?: string; address?: string; phone?: string }): Promise<Store | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (data.name !== undefined) {
      sets.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.address !== undefined) {
      sets.push(`address = $${idx++}`);
      values.push(data.address);
    }
    if (data.phone !== undefined) {
      sets.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (sets.length === 0) {
      return this.getStoreById(id);
    }
    values.push(id);
    const sql = `UPDATE store SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`;
    const res = await query(sql, values);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone || undefined,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
  }
}

export const storeRepo = new StoreRepository();
