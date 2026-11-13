import { isDbConnected, query } from '../db/pool.js';

export interface Store {
  id: number;
  name: string;
  address: string;
  phone?: string;
  createdAt: string;
}

const DEFAULT_STORES: Store[] = [
  {
    id: 1,
    name: 'ShopSphere Austin Flagship',
    address: '742 Evergreen Terrace, Austin, TX 78701',
    phone: '+1 (555) 482-9102',
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'ShopSphere Silicon Valley Hub',
    address: '450 Tech Innovation Way, San Francisco, CA 94105',
    phone: '+1 (555) 019-2834',
    createdAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: 'ShopSphere Chicago Center',
    address: '1280 Michigan Avenue, Chicago, IL 60611',
    phone: '+1 (555) 839-1120',
    createdAt: new Date().toISOString(),
  },
];

export class StoreRepository {
  async getAllStores(): Promise<Store[]> {
    if (!isDbConnected()) {
      return DEFAULT_STORES;
    }

    try {
      const res = await query(`SELECT * FROM store ORDER BY id ASC`);
      return res.rows.map((row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        phone: row.phone || undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      return DEFAULT_STORES;
    }
  }

  async getStoreById(id: number): Promise<Store | null> {
    if (!isDbConnected()) {
      return DEFAULT_STORES.find(s => s.id === id) || null;
    }

    try {
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
    } catch (err) {
      return DEFAULT_STORES.find(s => s.id === id) || null;
    }
  }

  async createStore(data: { name: string; address: string; phone?: string }): Promise<Store> {
    if (!isDbConnected()) {
      const st: Store = {
        id: DEFAULT_STORES.length + 1,
        name: data.name,
        address: data.address,
        phone: data.phone,
        createdAt: new Date().toISOString(),
      };
      DEFAULT_STORES.push(st);
      return st;
    }

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
}

export const storeRepo = new StoreRepository();
