import { Basket, BasketItem } from '../../src/types.js';
import { query } from '../db/pool.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';

export class CartRepository {
  async getBasket(basketId: string): Promise<Basket> {
    const res = await query(
      `SELECT c.*, p.product_code, p.name, p.slug, p.price, p.compare_at_price,
              p.category, p.subcategory, p.description, p.image_url, p.images,
              p.variants, p.rating, p.reviews_count, p.stock, p.tags, p.specifications,
              p.color_options, p.size_options, p.scent_notes, p.featured
       FROM cart c
       JOIN product p ON c.product_id = p.id
       WHERE c.basket_id = $1
       ORDER BY c.id ASC`,
      [basketId]
    );

    const items: BasketItem[] = res.rows.map((row) => {
      const product = mapProductRow({
        id: row.product_id,
        product_code: row.product_code,
        name: row.name,
        slug: row.slug,
        price: row.price,
        compare_at_price: row.compare_at_price,
        category: row.category,
        subcategory: row.subcategory,
        description: row.description,
        image_url: row.image_url,
        images: row.images,
        variants: row.variants,
        rating: row.rating,
        reviews_count: row.reviews_count,
        stock: row.stock,
        tags: row.tags,
        specifications: row.specifications,
        color_options: row.color_options,
        size_options: row.size_options,
        scent_notes: row.scent_notes,
        featured: row.featured,
      });

      const options = typeof row.selected_options === 'string'
        ? JSON.parse(row.selected_options)
        : (row.selected_options || {});

      const unitPrice = product.price;
      const quantity = parseInt(row.quantity, 10);
      const totalPrice = parseFloat((unitPrice * quantity).toFixed(2));

      return {
        id: `bitem_${row.id}`,
        productId: product.id,
        product,
        quantity,
        unitPrice,
        totalPrice,
        selectedVariant: options.selectedVariant,
        selectedColor: options.selectedColor,
        selectedSize: options.selectedSize,
      };
    });

    let totalItemCount = 0;
    let subtotal = 0;
    for (const it of items) {
      totalItemCount += it.quantity;
      subtotal += it.totalPrice;
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    const estimatedTax = parseFloat((subtotal * 0.0825).toFixed(2));
    const shippingFee = subtotal > 75 || totalItemCount === 0 ? 0 : 9.99;
    const grandTotal = parseFloat((subtotal + estimatedTax + shippingFee).toFixed(2));

    const latestDate = res.rows.length > 0 && res.rows[0].updated_at
      ? new Date(res.rows[0].updated_at).toISOString()
      : new Date().toISOString();

    return {
      id: basketId,
      items,
      totalItemCount,
      subtotal,
      estimatedTax,
      shippingFee,
      grandTotal,
      createdAt: latestDate,
      updatedAt: latestDate,
    };
  }

  async addOrUpdateItem(
    basketId: string,
    productId: string | number,
    quantity: number = 1,
    options?: {
      selectedVariant?: string;
      selectedColor?: string;
      selectedSize?: string;
      storeId?: number;
      userId?: string | number;
    }
  ): Promise<{ basket: Basket; message: string }> {
    const internalProductId = await productRepo.getInternalProductId(productId);
    if (!internalProductId) {
      throw new Error(`Product not found with ID ${productId}`);
    }

    let internalUserId: number | null = null;
    if (options?.userId) {
      const rawUser = await userRepo.findRawById(options.userId);
      if (rawUser) internalUserId = rawUser.id;
    }

    const defaultStoreId = options?.storeId || 1; // Default to Flagship store

    // Check if matching item is in cart
    const existingRes = await query(
      `SELECT * FROM cart WHERE basket_id = $1 AND product_id = $2`,
      [basketId, internalProductId]
    );

    const matchingRow = existingRes.rows.find((row) => {
      const opts = typeof row.selected_options === 'string'
        ? JSON.parse(row.selected_options)
        : (row.selected_options || {});
      const varMatch = options?.selectedVariant ? opts.selectedVariant === options.selectedVariant : true;
      const colMatch = options?.selectedColor ? opts.selectedColor === options.selectedColor : true;
      const sizMatch = options?.selectedSize ? opts.selectedSize === options.selectedSize : true;
      return varMatch && colMatch && sizMatch;
    });

    let message = 'item added or updated';

    if (matchingRow) {
      const newQty = matchingRow.quantity + quantity;
      if (newQty <= 0) {
        await query(`DELETE FROM cart WHERE id = $1`, [matchingRow.id]);
        message = 'item removed from basket';
      } else {
        await query(
          `UPDATE cart SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [newQty, matchingRow.id]
        );
      }
    } else {
      if (quantity > 0) {
        const selectedOptions = {
          selectedVariant: options?.selectedVariant,
          selectedColor: options?.selectedColor,
          selectedSize: options?.selectedSize,
        };
        await query(
          `INSERT INTO cart (basket_id, user_id, product_id, store_id, quantity, selected_options)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [basketId, internalUserId, internalProductId, defaultStoreId, quantity, JSON.stringify(selectedOptions)]
        );
      }
    }

    const basket = await this.getBasket(basketId);
    return { basket, message };
  }

  async removeItem(basketId: string, productId: string | number, variant?: string): Promise<Basket> {
    const internalProductId = await productRepo.getInternalProductId(productId);
    if (!internalProductId) {
      return await this.getBasket(basketId);
    }

    if (variant) {
      const rows = await query(`SELECT id, selected_options FROM cart WHERE basket_id = $1 AND product_id = $2`, [basketId, internalProductId]);
      for (const row of rows.rows) {
        const opts = typeof row.selected_options === 'string' ? JSON.parse(row.selected_options) : row.selected_options;
        if (opts?.selectedVariant === variant) {
          await query(`DELETE FROM cart WHERE id = $1`, [row.id]);
        }
      }
    } else {
      await query(`DELETE FROM cart WHERE basket_id = $1 AND product_id = $2`, [basketId, internalProductId]);
    }

    return await this.getBasket(basketId);
  }

  async clearBasket(basketId: string): Promise<boolean> {
    await query(`DELETE FROM cart WHERE basket_id = $1`, [basketId]);
    return true;
  }
}

export const cartRepo = new CartRepository();

