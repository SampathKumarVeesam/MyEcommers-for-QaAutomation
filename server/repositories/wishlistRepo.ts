import { Product } from '../../src/types.js';
import { isDbConnected, query } from '../db/pool.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';

const memoryWishlists: Record<string, Product[]> = {};

export class WishlistRepository {
  async getWishlistByUser(userId: string | number): Promise<Product[]> {
    if (!isDbConnected()) {
      return memoryWishlists[String(userId)] || [];
    }

    try {
      const rawUser = await userRepo.findRawById(userId);
      if (!rawUser) return memoryWishlists[String(userId)] || [];

      const res = await query(
        `SELECT p.*
         FROM wishlist w
         JOIN product p ON w.product_id = p.id
         WHERE w.user_id = $1
         ORDER BY w.created_at DESC`,
        [rawUser.id]
      );

      return res.rows.map(mapProductRow);
    } catch (err) {
      return memoryWishlists[String(userId)] || [];
    }
  }

  async addToWishlist(userId: string | number, productId: string | number): Promise<boolean> {
    if (!isDbConnected()) {
      const p = await productRepo.getProductById(productId);
      if (p) {
        if (!memoryWishlists[String(userId)]) memoryWishlists[String(userId)] = [];
        if (!memoryWishlists[String(userId)].some(item => item.id === p.id)) {
          memoryWishlists[String(userId)].unshift(p);
        }
      }
      return true;
    }

    try {
      const rawUser = await userRepo.findRawById(userId);
      if (!rawUser) return false;

      const internalProdId = await productRepo.getInternalProductId(productId);
      if (!internalProdId) return false;

      await query(
        `INSERT INTO wishlist (user_id, product_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, product_id) DO NOTHING`,
        [rawUser.id, internalProdId]
      );

      return true;
    } catch (err) {
      const p = await productRepo.getProductById(productId);
      if (p) {
        if (!memoryWishlists[String(userId)]) memoryWishlists[String(userId)] = [];
        if (!memoryWishlists[String(userId)].some(item => item.id === p.id)) {
          memoryWishlists[String(userId)].unshift(p);
        }
      }
      return true;
    }
  }

  async removeFromWishlist(userId: string | number, productId: string | number): Promise<boolean> {
    if (!isDbConnected()) {
      if (memoryWishlists[String(userId)]) {
        memoryWishlists[String(userId)] = memoryWishlists[String(userId)].filter(p => p.id !== String(productId));
      }
      return true;
    }

    try {
      const rawUser = await userRepo.findRawById(userId);
      if (!rawUser) return false;

      const internalProdId = await productRepo.getInternalProductId(productId);
      if (!internalProdId) return false;

      const res = await query(
        `DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2 RETURNING id`,
        [rawUser.id, internalProdId]
      );

      return res.rowCount !== null && res.rowCount > 0;
    } catch (err) {
      if (memoryWishlists[String(userId)]) {
        memoryWishlists[String(userId)] = memoryWishlists[String(userId)].filter(p => p.id !== String(productId));
      }
      return true;
    }
  }

  async clearWishlist(userId: string | number): Promise<void> {
    if (!isDbConnected()) {
      memoryWishlists[String(userId)] = [];
      return;
    }

    try {
      const rawUser = await userRepo.findRawById(userId);
      if (!rawUser) return;

      await query(`DELETE FROM wishlist WHERE user_id = $1`, [rawUser.id]);
    } catch (err) {
      memoryWishlists[String(userId)] = [];
    }
  }
}

export const wishlistRepo = new WishlistRepository();
