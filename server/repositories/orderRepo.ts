import { Address, BasketItem, Order, OrderStatus, PaymentMethod } from '../../src/types.js';
import { getClient, query } from '../db/pool.js';
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

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const rawUser = await userRepo.findRawById(data.userId);
      const internalUserId = rawUser ? rawUser.id : null;

      // 1. Insert order header into public."order"
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
          data.shippingAddress?.street || '742 Evergreen Terrace',
          data.shippingAddress?.postalCode || '78701',
          data.shippingAddress?.city || 'Austin',
          data.shippingAddress?.state || 'TX',
          data.shippingAddress?.country || 'United States',
        ]
      );

      const createdOrderRow = orderRes.rows[0];
      const insertedOrderId = createdOrderRow.id;

      // 2. Insert line items into public.order_item and atomically decrement stock
      for (const item of data.items) {
        const internalProdId = await productRepo.getInternalProductId(item.productId);
        if (!internalProdId) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        await client.query(
          `INSERT INTO order_item (
             order_id, product_id, user_id, price, quantity,
             selected_variant, selected_color, selected_size
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            insertedOrderId,
            internalProdId,
            internalUserId,
            item.unitPrice,
            item.quantity,
            item.selectedVariant || null,
            item.selectedColor || null,
            item.selectedSize || null,
          ]
        );

        // Decrement stock in store inventory
        await inventoryRepo.decrementStock(internalProdId, item.quantity);
      }

      // 3. Clear customer basket items from public.cart
      if (internalUserId) {
        await client.query(
          `DELETE FROM cart WHERE basket_id = $1 OR user_id = $2`,
          [data.basketId, internalUserId]
        );
      } else {
        await client.query(
          `DELETE FROM cart WHERE basket_id = $1`,
          [data.basketId]
        );
      }

      await client.query('COMMIT');
      return mapOrderRow(createdOrderRow, data.items);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[PostgreSQL Order Transaction Error]: Transaction rolled back:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async getOrderItems(orderId: number): Promise<BasketItem[]> {
    const res = await query(
      `SELECT oi.*, p.product_code, p.name, p.slug, p.price as p_price, p.compare_at_price,
              p.category, p.subcategory, p.description, p.image_url, p.images,
              p.variants, p.rating, p.reviews_count, p.stock, p.tags, p.specifications
       FROM order_item oi
       JOIN product p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id ASC`,
      [orderId]
    );

    return res.rows.map((row) => {
      const unitPrice = parseFloat(row.price);
      const quantity = parseInt(row.quantity, 10);
      const product = mapProductRow({
        id: row.product_id,
        product_code: row.product_code,
        name: row.name,
        slug: row.slug,
        price: row.p_price,
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
      });

      return {
        id: `oi_${row.id}`,
        productId: row.product_code || String(row.product_id),
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

  async updateOrderStatus(id: string | number, newStatus: string): Promise<Order | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `UPDATE "order" 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})
       RETURNING *`,
      isNum ? [newStatus, String(id), Number(id)] : [newStatus, String(id)]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return mapOrderRow(row, items);
  }
}

export const orderRepo = new OrderRepository();
