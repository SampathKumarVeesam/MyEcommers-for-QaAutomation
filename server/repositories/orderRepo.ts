import crypto from 'node:crypto';
import { Address, BasketItem, Order, OrderStatus, PaymentMethod } from '../../src/types.js';
import { getClient, query } from '../db/pool.js';
import { cartRepo } from './cartRepo.js';
import { inventoryRepo } from './inventoryRepo.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';

export function mapOrderRow(row: any, items: BasketItem[] = []): Order {
  const address: Address = {
    fullName: row.user_name || 'Customer',
    street: row.address_line_1 || '',
    city: row.address_city || '',
    state: row.address_state || '',
    postalCode: row.address_postal_code || '',
    country: row.address_country || 'United States',
    phone: '',
  };

  return {
    id: String(row.id),
    orderNumber: row.order_number,
    userId: String(row.user_id || row.user_email),
    userEmail: row.user_email || '',
    userName: row.user_name || '',
    basketId: row.basket_id || '',
    items,
    shippingAddress: address,
    shippingMethod: row.shipping_method as 'standard' | 'express' | 'priority',
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status as 'paid' | 'pending' | 'cod_pending',
    orderStatus: row.status as OrderStatus,
    subtotal: parseFloat(row.subtotal),
    tax: parseFloat(row.tax),
    shippingFee: parseFloat(row.shipping_fee),
    grandTotal: parseFloat(row.total_amount),
    trackingNumber: row.tracking_id || '',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

export class OrderRepository {
  async createOrder(data: {
    userId: string | number;
    userEmail: string;
    userName: string;
    basketId: string;
    items: BasketItem[];
    shippingAddress: Address;
    shippingMethod: 'standard' | 'express' | 'priority';
    paymentMethod: PaymentMethod;
  }): Promise<Order> {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const rawUser = await userRepo.findRawById(data.userId);
      const internalUserId = rawUser ? rawUser.id : null;

      const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}-SP`;
      const trackingId = `TRK-${(data.shippingMethod || 'standard').toUpperCase()}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

      let subtotal = 0;
      for (const item of data.items) {
        subtotal += item.totalPrice;
      }
      subtotal = parseFloat(subtotal.toFixed(2));
      const tax = parseFloat((subtotal * 0.0825).toFixed(2));
      const shippingFee = subtotal > 75 ? 0 : data.shippingMethod === 'express' ? 14.99 : 9.99;
      const totalAmount = parseFloat((subtotal + tax + shippingFee).toFixed(2));
      const paymentStatus = data.paymentMethod === 'cod' ? 'cod_pending' : 'paid';

      const orderRes = await client.query(
        `INSERT INTO "order" (
           order_number, user_id, user_email, user_name, basket_id, tracking_id,
           status, total_amount, subtotal, tax, shipping_fee, shipping_method,
           payment_method, payment_status, address_line_1, address_postal_code,
           address_city, address_state, address_country
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
         RETURNING *`,
        [
          orderNumber,
          internalUserId,
          data.userEmail,
          data.userName,
          data.basketId,
          trackingId,
          'processing',
          totalAmount,
          subtotal,
          tax,
          shippingFee,
          data.shippingMethod,
          data.paymentMethod,
          paymentStatus,
          data.shippingAddress.street,
          data.shippingAddress.postalCode,
          data.shippingAddress.city,
          data.shippingAddress.state,
          data.shippingAddress.country,
        ]
      );

      const insertedOrder = orderRes.rows[0];

      // Insert Order Items and decrement stock
      for (const item of data.items) {
        const pId = await productRepo.getInternalProductId(item.productId);
        if (pId) {
          await client.query(
            `INSERT INTO order_item (
               order_id, product_id, user_id, price, quantity, selected_variant, selected_color, selected_size
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              insertedOrder.id,
              pId,
              internalUserId,
              item.unitPrice,
              item.quantity,
              item.selectedVariant || null,
              item.selectedColor || null,
              item.selectedSize || null,
            ]
          );

          // Decrement stock in transaction
          await inventoryRepo.decrementStock(pId, item.quantity, undefined, client);
        }
      }

      // Clear the cart
      await client.query(`DELETE FROM cart WHERE basket_id = $1`, [data.basketId]);

      await client.query('COMMIT');
      return mapOrderRow(insertedOrder, data.items);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Order Creation Error]: Transaction rolled back', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getOrderItems(orderId: number): Promise<BasketItem[]> {
    const res = await query(
      `SELECT oi.*, p.product_code, p.name, p.slug, p.price as current_price,
              p.category, p.subcategory, p.description, p.image_url, p.images,
              p.variants, p.rating, p.reviews_count, p.stock, p.tags, p.specifications
       FROM order_item oi
       JOIN product p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [orderId]
    );

    return res.rows.map((row) => {
      const product = mapProductRow({
        id: row.product_id,
        product_code: row.product_code,
        name: row.name,
        slug: row.slug,
        price: row.price,
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
      });

      const unitPrice = parseFloat(row.price);
      const quantity = parseInt(row.quantity, 10);

      return {
        id: `bitem_${row.id}`,
        productId: product.id,
        product,
        quantity,
        unitPrice,
        totalPrice: parseFloat((unitPrice * quantity).toFixed(2)),
        selectedVariant: row.selected_variant || undefined,
        selectedColor: row.selected_color || undefined,
        selectedSize: row.selected_size || undefined,
      };
    });
  }

  async getOrderById(id: string | number): Promise<Order | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `SELECT * FROM "order" WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''}) LIMIT 1`,
      isNum ? [String(id), Number(id)] : [String(id)]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return mapOrderRow(row, items);
  }

  async getOrdersByUser(userId: string | number): Promise<Order[]> {
    const rawUser = await userRepo.findRawById(userId);
    const internalUserId = rawUser ? rawUser.id : null;

    let res;
    if (internalUserId) {
      res = await query(
        `SELECT * FROM "order" WHERE user_id = $1 OR user_email = $2 ORDER BY created_at DESC`,
        [internalUserId, rawUser.email]
      );
    } else {
      res = await query(
        `SELECT * FROM "order" WHERE user_id::text = $1 OR user_email = $1 ORDER BY created_at DESC`,
        [String(userId)]
      );
    }

    const orders: Order[] = [];
    for (const row of res.rows) {
      const items = await this.getOrderItems(row.id);
      orders.push(mapOrderRow(row, items));
    }
    return orders;
  }

  async getAllOrders(): Promise<Order[]> {
    const res = await query(`SELECT * FROM "order" ORDER BY created_at DESC`);
    const orders: Order[] = [];
    for (const row of res.rows) {
      const items = await this.getOrderItems(row.id);
      orders.push(mapOrderRow(row, items));
    }
    return orders;
  }
}

export const orderRepo = new OrderRepository();
