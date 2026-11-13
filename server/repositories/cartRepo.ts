import crypto from 'node:crypto';
import { Basket, BasketItem } from '../../src/types.js';
import { isDbConnected, query } from '../db/pool.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';

const memoryBaskets = new Map<string, Basket>();

export class CartRepository {
  async getBasket(basketId: string, userId?: string | number): Promise<Basket> {
    if (!isDbConnected()) {
      let b = memoryBaskets.get(basketId);
      if (!b) {
        b = {
          id: basketId,
          userId: userId ? String(userId) : undefined,
          items: [],
          totalItemCount: 0,
          subtotal: 0,
          estimatedTax: 0,
          shippingFee: 0,
          grandTotal: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        memoryBaskets.set(basketId, b);
      }
      return { ...b };
    }

    try {
      let rawUserId: number | null = null;
      if (userId) {
        const raw = await userRepo.findRawById(userId);
        rawUserId = raw ? raw.id : null;
      }

      const res = await query(
        `SELECT c.*, p.product_code, p.name, p.slug, p.price, p.compare_at_price,
                p.category, p.subcategory, p.description, p.image_url, p.images,
                p.variants, p.rating, p.reviews_count, p.stock, p.tags, p.specifications,
                p.color_options, p.size_options, p.scent_notes, p.featured
         FROM cart c
         JOIN product p ON c.product_id = p.id
         WHERE c.basket_id = $1 ${rawUserId ? 'OR c.user_id = $2' : ''}
         ORDER BY c.id ASC`,
        rawUserId ? [basketId, rawUserId] : [basketId]
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
        userId: rawUserId ? String(rawUserId) : undefined,
        items,
        totalItemCount,
        subtotal,
        estimatedTax,
        shippingFee,
        grandTotal,
        createdAt: latestDate,
        updatedAt: latestDate,
      };
    } catch (err: any) {
      console.warn('[CartRepo Notice]: Operating in resilient cloud mode:', err.message);
      let b = memoryBaskets.get(basketId);
      if (!b) {
        b = {
          id: basketId,
          items: [],
          totalItemCount: 0,
          subtotal: 0,
          estimatedTax: 0,
          shippingFee: 0,
          grandTotal: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        memoryBaskets.set(basketId, b);
      }
      return { ...b };
    }
  }

  async getUserCart(userId: string | number): Promise<Basket> {
    if (!isDbConnected()) {
      return this.getBasket(`basket_u_${userId}`, userId);
    }

    try {
      const rawUser = await userRepo.findRawById(userId);
      if (!rawUser) {
        return this.getBasket(`basket_u_${userId}`, userId);
      }

      const res = await query(
        `SELECT c.*, p.product_code, p.name, p.slug, p.price, p.compare_at_price,
                p.category, p.subcategory, p.description, p.image_url, p.images,
                p.variants, p.rating, p.reviews_count, p.stock, p.tags, p.specifications,
                p.color_options, p.size_options, p.scent_notes, p.featured
         FROM cart c
         JOIN product p ON c.product_id = p.id
         WHERE c.user_id = $1
         ORDER BY c.id ASC`,
        [rawUser.id]
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

      const basketId = res.rows[0]?.basket_id || `basket_u_${rawUser.id}`;

      return {
        id: basketId,
        userId: String(rawUser.id),
        items,
        totalItemCount,
        subtotal,
        estimatedTax,
        shippingFee,
        grandTotal,
        createdAt: latestDate,
        updatedAt: latestDate,
      };
    } catch (err: any) {
      return this.getBasket(`basket_u_${userId}`, userId);
    }
  }

  async addOrUpdateItem(
    basketId: string,
    productId: string | number,
    quantity: number,
    options?: {
      selectedVariant?: string;
      selectedColor?: string;
      selectedSize?: string;
      storeId?: number;
      userId?: string | number;
    }
  ): Promise<{ message: string; basket: Basket }> {
    if (!isDbConnected()) {
      let b = await this.getBasket(basketId, options?.userId);
      const product = await productRepo.getProductById(productId);
      if (!product) throw new Error(`Product not found: ${productId}`);

      const existingIndex = b.items.findIndex(
        i => i.productId === String(productId) && i.selectedVariant === options?.selectedVariant
      );

      if (existingIndex > -1) {
        b.items[existingIndex].quantity += quantity;
        b.items[existingIndex].totalPrice = parseFloat(
          (b.items[existingIndex].unitPrice * b.items[existingIndex].quantity).toFixed(2)
        );
      } else {
        const unitPrice = product.price;
        b.items.push({
          id: `bitem_${Date.now()}`,
          productId: String(productId),
          product,
          quantity,
          unitPrice,
          totalPrice: parseFloat((unitPrice * quantity).toFixed(2)),
          selectedVariant: options?.selectedVariant,
          selectedColor: options?.selectedColor,
          selectedSize: options?.selectedSize,
        });
      }

      b.totalItemCount = b.items.reduce((sum, it) => sum + it.quantity, 0);
      b.subtotal = parseFloat(b.items.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
      b.estimatedTax = parseFloat((b.subtotal * 0.0825).toFixed(2));
      b.shippingFee = b.subtotal > 75 || b.totalItemCount === 0 ? 0 : 9.99;
      b.grandTotal = parseFloat((b.subtotal + b.estimatedTax + b.shippingFee).toFixed(2));
      b.updatedAt = new Date().toISOString();
      memoryBaskets.set(basketId, b);

      return {
        message: 'item added or updated',
        basket: b,
      };
    }

    const internalProdId = await productRepo.getInternalProductId(productId);
    if (!internalProdId) {
      throw new Error(`Product not found: ${productId}`);
    }

    let internalUserId: number | null = null;
    if (options?.userId) {
      const rawUser = await userRepo.findRawById(options.userId);
      internalUserId = rawUser ? rawUser.id : null;
    }

    const optsJson = JSON.stringify({
      selectedVariant: options?.selectedVariant || null,
      selectedColor: options?.selectedColor || null,
      selectedSize: options?.selectedSize || null,
    });

    let existing;
    if (internalUserId) {
      existing = await query(
        `SELECT id, quantity FROM cart
         WHERE (user_id = $1 OR basket_id = $2) AND product_id = $3
           AND selected_options::text = $4
         LIMIT 1`,
        [internalUserId, basketId, internalProdId, optsJson]
      );
    } else {
      existing = await query(
        `SELECT id, quantity FROM cart
         WHERE basket_id = $1 AND product_id = $2
           AND selected_options::text = $3
         LIMIT 1`,
        [basketId, internalProdId, optsJson]
      );
    }

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].quantity + quantity;
      await query(
        `UPDATE cart
         SET quantity = $1, user_id = COALESCE($2, user_id), updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newQty, internalUserId, existing.rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO cart (
           basket_id, user_id, product_id, store_id, quantity, selected_options, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          basketId,
          internalUserId,
          internalProdId,
          options?.storeId || 1,
          quantity,
          optsJson,
        ]
      );
    }

    const updatedBasket = await this.getBasket(basketId, internalUserId || undefined);
    return {
      message: 'item added or updated in PostgreSQL',
      basket: updatedBasket,
    };
  }

  async updateItemQuantity(
    basketId: string,
    productId: string | number,
    quantity: number,
    options?: {
      selectedVariant?: string;
      userId?: string | number;
    }
  ): Promise<Basket> {
    if (!isDbConnected()) {
      let b = await this.getBasket(basketId, options?.userId);
      if (quantity <= 0) {
        b.items = b.items.filter(i => !(i.productId === String(productId) && i.selectedVariant === options?.selectedVariant));
      } else {
        const item = b.items.find(i => i.productId === String(productId) && i.selectedVariant === options?.selectedVariant);
        if (item) {
          item.quantity = quantity;
          item.totalPrice = parseFloat((item.unitPrice * quantity).toFixed(2));
        }
      }
      b.totalItemCount = b.items.reduce((sum, it) => sum + it.quantity, 0);
      b.subtotal = parseFloat(b.items.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
      b.estimatedTax = parseFloat((b.subtotal * 0.0825).toFixed(2));
      b.shippingFee = b.subtotal > 75 || b.totalItemCount === 0 ? 0 : 9.99;
      b.grandTotal = parseFloat((b.subtotal + b.estimatedTax + b.shippingFee).toFixed(2));
      b.updatedAt = new Date().toISOString();
      memoryBaskets.set(basketId, b);
      return b;
    }

    const internalProdId = await productRepo.getInternalProductId(productId);
    if (!internalProdId) {
      throw new Error(`Product not found: ${productId}`);
    }

    let internalUserId: number | null = null;
    if (options?.userId) {
      const rawUser = await userRepo.findRawById(options.userId);
      internalUserId = rawUser ? rawUser.id : null;
    }

    if (quantity <= 0) {
      await this.removeItem(basketId, productId, options?.selectedVariant, internalUserId || undefined);
    } else {
      let whereClause = `WHERE product_id = $1 AND (basket_id = $2 ${internalUserId ? 'OR user_id = $4' : ''})`;
      const params: any[] = [internalProdId, basketId, quantity];
      if (internalUserId) params.push(internalUserId);

      if (options?.selectedVariant) {
        whereClause += ` AND selected_options->>'selectedVariant' = $${params.length + 1}`;
        params.push(options.selectedVariant);
      }

      await query(
        `UPDATE cart SET quantity = $3, updated_at = CURRENT_TIMESTAMP ${whereClause}`,
        params
      );
    }

    return await this.getBasket(basketId, internalUserId || undefined);
  }

  async removeItem(
    basketId: string,
    productId: string | number,
    variant?: string,
    userId?: string | number
  ): Promise<void> {
    if (!isDbConnected()) {
      let b = await this.getBasket(basketId, userId);
      b.items = b.items.filter(i => !(i.productId === String(productId) && i.selectedVariant === variant));
      b.totalItemCount = b.items.reduce((sum, it) => sum + it.quantity, 0);
      b.subtotal = parseFloat(b.items.reduce((sum, it) => sum + it.totalPrice, 0).toFixed(2));
      b.estimatedTax = parseFloat((b.subtotal * 0.0825).toFixed(2));
      b.shippingFee = b.subtotal > 75 || b.totalItemCount === 0 ? 0 : 9.99;
      b.grandTotal = parseFloat((b.subtotal + b.estimatedTax + b.shippingFee).toFixed(2));
      b.updatedAt = new Date().toISOString();
      memoryBaskets.set(basketId, b);
      return;
    }

    const internalProdId = await productRepo.getInternalProductId(productId);
    if (!internalProdId) return;

    let internalUserId: number | null = null;
    if (userId) {
      const rawUser = await userRepo.findRawById(userId);
      internalUserId = rawUser ? rawUser.id : null;
    }

    let whereSql = `WHERE product_id = $1 AND (basket_id = $2 ${internalUserId ? 'OR user_id = $3' : ''})`;
    const params: any[] = [internalProdId, basketId];
    if (internalUserId) params.push(internalUserId);

    if (variant) {
      whereSql += ` AND selected_options->>'selectedVariant' = $${params.length + 1}`;
      params.push(variant);
    }

    await query(`DELETE FROM cart ${whereSql}`, params);
  }

  async clearBasket(basketId: string, userId?: string | number): Promise<void> {
    if (!isDbConnected()) {
      memoryBaskets.delete(basketId);
      return;
    }

    let internalUserId: number | null = null;
    if (userId) {
      const rawUser = await userRepo.findRawById(userId);
      internalUserId = rawUser ? rawUser.id : null;
    }

    if (internalUserId) {
      await query(`DELETE FROM cart WHERE basket_id = $1 OR user_id = $2`, [basketId, internalUserId]);
    } else {
      await query(`DELETE FROM cart WHERE basket_id = $1`, [basketId]);
    }
  }

  async mergeBasket(basketId: string, userId: string | number): Promise<Basket> {
    if (!isDbConnected()) {
      return await this.getBasket(basketId, userId);
    }

    const rawUser = await userRepo.findRawById(userId);
    if (!rawUser) {
      return await this.getBasket(basketId);
    }

    await query(
      `UPDATE cart
       SET user_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE basket_id = $2`,
      [rawUser.id, basketId]
    );

    return await this.getUserCart(rawUser.id);
  }
}

export const cartRepo = new CartRepository();
