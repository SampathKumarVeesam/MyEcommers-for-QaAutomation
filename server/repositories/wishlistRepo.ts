import { Product } from '../../src/types.js';
import { query } from '../db/pool.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';

export class WishlistRepository {
  async getWishlistByUser(userId: string | number): Promise<Product[]> {
    const rawUser = await userRepo.findRawById(userId);
    if (!rawUser) return [];

    const res = await query(
      `SELECT p.*
       FROM wishlist w
       JOIN product p ON w.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [rawUser.id]
    );

    return res.rows.map(mapProductRow);
  }

  async addToWishlist(userId: string | number, productId: string | number): Promise<boolean> {
    const rawUser = await userRepo.findRawById(userId);
    if (!rawUser) throw new Error(`User not found: ${userId}`);

    const internalProdId = await productRepo.getInternalProductId(productId);
    if (!internalProdId) throw new Error(`Product not found: ${productId}`);

    await query(
      `INSERT INTO wishlist (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [rawUser.id, internalProdId]
    );

    return true;
  }

  async removeFromWishlist(userId: string | number, productId: string | number): Promise<boolean> {
    const rawUser = await userRepo.findRawById(userId);
    if (!rawUser) return false;

    const internalProdId = await productRepo.getInternalProductId(productId);
    if (!internalProdId) return false;

    const res = await query(
      `DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2 RETURNING id`,
      [rawUser.id, internalProdId]
    );

    return res.rowCount !== null && res.rowCount > 0;
  }

  async clearWishlist(userId: string | number): Promise<void> {
    const rawUser = await userRepo.findRawById(userId);
    if (!rawUser) return;

    await query(`DELETE FROM wishlist WHERE user_id = $1`, [rawUser.id]);
  }
}

export const wishlistRepo = new WishlistRepository();
