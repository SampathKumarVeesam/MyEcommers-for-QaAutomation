import pg from 'pg';
import { query } from '../db/pool.js';
import { productRepo } from './productRepo.js';

export interface InventoryItem {
  productId: number;
  productCode?: string;
  storeId: number;
  storeName?: string;
  stockAvailable: number;
}

export class InventoryRepository {
  async getInventoryByProduct(productId: number | string): Promise<InventoryItem[]> {
    const internalId = await productRepo.getInternalProductId(productId);
    if (!internalId) return [];

    const res = await query(
      `SELECT inv.product_id, p.product_code, inv.store_id, s.name as store_name, inv.stock_available
       FROM inventory inv
       JOIN product p ON inv.product_id = p.id
       JOIN store s ON inv.store_id = s.id
       WHERE inv.product_id = $1
       ORDER BY inv.store_id ASC`,
      [internalId]
    );

    return res.rows.map((row) => ({
      productId: row.product_id,
      productCode: row.product_code,
      storeId: row.store_id,
      storeName: row.store_name,
      stockAvailable: parseInt(row.stock_available, 10),
    }));
  }

  async getStock(productId: number, storeId: number): Promise<number> {
    const res = await query(
      `SELECT stock_available FROM inventory WHERE product_id = $1 AND store_id = $2`,
      [productId, storeId]
    );
    if (res.rows.length === 0) return 0;
    return parseInt(res.rows[0].stock_available, 10);
  }

  async setStock(productId: number | string, storeId: number, stock: number): Promise<void> {
    const internalId = await productRepo.getInternalProductId(productId);
    if (!internalId) throw new Error(`Product not found: ${productId}`);

    await query(
      `INSERT INTO inventory (product_id, store_id, stock_available)
       VALUES ($1, $2, $3)
       ON CONFLICT (product_id, store_id)
       DO UPDATE SET stock_available = EXCLUDED.stock_available`,
      [internalId, storeId, stock]
    );

    // Also update aggregated stock on product table
    await query(
      `UPDATE product
       SET stock = (
         SELECT COALESCE(SUM(stock_available), 0)
         FROM inventory
         WHERE product_id = $1
       )
       WHERE id = $1`,
      [internalId]
    );
  }

  async decrementStock(
    productId: number,
    quantity: number,
    storeId?: number,
    client?: pg.PoolClient
  ): Promise<void> {
    const executeQuery = (sql: string, params: any[]) => {
      if (client) {
        return client.query(sql, params);
      }
      return query(sql, params);
    };

    if (storeId) {
      await executeQuery(
        `UPDATE inventory
         SET stock_available = GREATEST(0, stock_available - $1)
         WHERE product_id = $2 AND store_id = $3`,
        [quantity, productId, storeId]
      );
    } else {
      await executeQuery(
        `UPDATE inventory
         SET stock_available = GREATEST(0, stock_available - $1)
         WHERE (product_id, store_id) IN (
           SELECT product_id, store_id FROM inventory
           WHERE product_id = $2
           ORDER BY stock_available DESC LIMIT 1
         )`,
        [quantity, productId]
      );
    }

    // Keep product.stock in sync with inventory sum
    await executeQuery(
      `UPDATE product
       SET stock = (
         SELECT COALESCE(SUM(stock_available), 0)
         FROM inventory
         WHERE product_id = $1
       )
       WHERE id = $1`,
      [productId]
    );
  }
}

export const inventoryRepo = new InventoryRepository();
