import { Address, AmountHandlingSummary, BasketItem, DeliveryAgent, NearestAgentInfo, Order, OrderStatus, OrderTrackingInfo, OrderTransfer, PaymentMethod } from '../../src/types.js';
import { getClient, query } from '../db/pool.js';
import { agentRepo } from './agentRepo.js';
import { inventoryRepo } from './inventoryRepo.js';
import { notificationRepo } from './notificationRepo.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';
import { STORE_COORDS, calculateHaversineDistance, calculateRouteDuration, resolveCoordinatesForAddress } from '../services/routingService.js';

export function mapOrderRow(row: any, items: BasketItem[] = [], assignedAgent: DeliveryAgent | null = null): Order {
  const address: Address = {
    fullName: row.user_name || 'Customer',
    street: row.address_line_1 || 'Road No. 36, Jubilee Hills',
    city: row.address_city || 'Hyderabad',
    state: row.address_state || 'Telangana',
    postalCode: row.address_postal_code || '500033',
    country: row.address_country || 'India',
    phone: row.user_phone || '+91 98765 43210',
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
    assignedAgentId: row.assigned_agent_id ? String(row.assigned_agent_id) : null,
    assignedAgent,
    assignmentStatus: (row.assignment_status as any) || (row.assigned_agent_id ? 'ACCEPTED' : 'UNASSIGNED'),
    assignedAt: row.assigned_at ? new Date(row.assigned_at).toISOString() : null,
    acceptanceDeadline: row.acceptance_deadline ? new Date(row.acceptance_deadline).toISOString() : null,
    rejectedOrExpiredAgentIds: Array.isArray(row.rejected_or_expired_agent_ids) ? row.rejected_or_expired_agent_ids : [],
    paymentMode: (row.payment_mode as any) || (row.payment_method === 'cod' ? 'COD' : 'PREPAID'),
    codCollectionMethod: row.cod_collection_method || null,
    paymentSettlementStatus: row.payment_settlement_status || (row.payment_method === 'cod' ? 'PENDING' : 'PAID_ONLINE'),
    deliveryLat: (() => {
      const resolved = resolveCoordinatesForAddress(address);
      const isDefault = !row.delivery_lat || (Math.abs(parseFloat(row.delivery_lat) - 17.4375) < 0.001 && Math.abs(parseFloat(row.delivery_lng || '78.4482') - 78.4482) < 0.001);
      return isDefault && resolved.lat ? resolved.lat : (row.delivery_lat ? parseFloat(row.delivery_lat) : (row.customer_lat ? parseFloat(row.customer_lat) : resolved.lat));
    })(),
    deliveryLng: (() => {
      const resolved = resolveCoordinatesForAddress(address);
      const isDefault = !row.delivery_lng || (Math.abs(parseFloat(row.delivery_lng) - 78.4482) < 0.001 && Math.abs(parseFloat(row.delivery_lat || '17.4375') - 17.4375) < 0.001);
      return isDefault && resolved.lng ? resolved.lng : (row.delivery_lng ? parseFloat(row.delivery_lng) : (row.customer_lng ? parseFloat(row.customer_lng) : resolved.lng));
    })(),
    customerLat: (() => {
      const resolved = resolveCoordinatesForAddress(address);
      const isDefault = !row.customer_lat || (Math.abs(parseFloat(row.customer_lat) - 17.4375) < 0.001 && Math.abs(parseFloat(row.customer_lng || '78.4482') - 78.4482) < 0.001);
      return isDefault && resolved.lat ? resolved.lat : (row.customer_lat ? parseFloat(row.customer_lat) : (row.delivery_lat ? parseFloat(row.delivery_lat) : resolved.lat));
    })(),
    customerLng: (() => {
      const resolved = resolveCoordinatesForAddress(address);
      const isDefault = !row.customer_lng || (Math.abs(parseFloat(row.customer_lng) - 78.4482) < 0.001 && Math.abs(parseFloat(row.customer_lat || '17.4375') - 17.4375) < 0.001);
      return isDefault && resolved.lng ? resolved.lng : (row.customer_lng ? parseFloat(row.customer_lng) : (row.delivery_lng ? parseFloat(row.delivery_lng) : resolved.lng));
    })(),
    agentLat: row.agent_lat ? parseFloat(row.agent_lat) : 17.4486,
    agentLng: row.agent_lng ? parseFloat(row.agent_lng) : 78.3908,
    locationUpdatedAt: row.location_updated_at ? new Date(row.location_updated_at).toISOString() : null,
    orderProceededAt: row.order_proceeded_at ? new Date(row.order_proceeded_at).toISOString() : null,
    estimatedDurationSeconds: row.estimated_duration_seconds ? parseInt(row.estimated_duration_seconds, 10) : 1200,
    estimatedDeliveryAt: row.estimated_delivery_at ? new Date(row.estimated_delivery_at).toISOString() : null,
    isDelayed: Boolean(row.is_delayed),
    delayStartedAt: row.delay_started_at ? new Date(row.delay_started_at).toISOString() : null,
    extraDelaySeconds: row.extra_delay_seconds ? parseInt(row.extra_delay_seconds, 10) : 0,
    transferReason: row.transfer_reason || null,
    transferredFromAgentName: row.transferred_from_agent_name || null,
    transferredFromAgentId: row.transferred_from_agent_id ? String(row.transferred_from_agent_id) : null,
    assignmentTier: (row.assignment_tier as any) || null,
    deliveryFee: row.delivery_fee ? parseFloat(row.delivery_fee) : 15.00,
    codPaymentMethod: row.cod_payment_method || null,
    cod_payment_method: row.cod_payment_method || null,
    codPaymentStatus: row.cod_payment_status || (row.payment_method === 'cod' ? (row.payment_status === 'paid' ? 'paid' : 'pending') : null),
    deliveryOtp: row.delivery_otp || null,
    delivery_otp: row.delivery_otp || null,
    otpVerified: Boolean(row.otp_verified || row.is_otp_verified),
    isOtpVerified: Boolean(row.is_otp_verified || row.otp_verified),
    is_otp_verified: Boolean(row.is_otp_verified || row.otp_verified),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
    depositSubmittedAt: row.deposit_submitted_at ? new Date(row.deposit_submitted_at).toISOString() : null,
    depositVerifiedAt: row.deposit_verified_at ? new Date(row.deposit_verified_at).toISOString() : null,
    depositRejectionNote: row.deposit_rejection_note || null,
    feedbackStatus: row.feedback_status || 'pending',
    nextFeedbackReminderAt: row.next_feedback_reminder_at ? new Date(row.next_feedback_reminder_at).toISOString() : null,
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

      // Newly placed order starts in processing without an agent assigned yet
      const assignedAgentId = null;
      const deliveryFee = 15.00;
      const paymentMode = data.paymentMethod === 'cod' ? 'COD' : 'PREPAID';
      const paymentSettlementStatus = data.paymentMethod === 'cod' ? 'PENDING' : 'PAID_ONLINE';
      
      // Dynamic Customer Coordinates & Route ETA
      const resolvedCoords = resolveCoordinatesForAddress(data.shippingAddress);
      const customerLat = (data as any).customerLat || (data.shippingAddress as any)?.lat || resolvedCoords.lat;
      const customerLng = (data as any).customerLng || (data.shippingAddress as any)?.lng || resolvedCoords.lng;
      const agentLat = STORE_COORDS.lat;
      const agentLng = STORE_COORDS.lng;

      const { durationSeconds } = await calculateRouteDuration(STORE_COORDS, { lat: customerLat, lng: customerLng });
      const estimatedDurationSeconds = durationSeconds;

      // 1. Insert order header into public."order"
      const orderRes = await client.query(
        `INSERT INTO "order" (
           order_number, user_id, user_email, user_name, basket_id, tracking_id,
           status, total_amount, subtotal, tax, shipping_fee, shipping_method,
           payment_method, payment_status, address_line_1, address_postal_code,
           address_city, address_state, address_country, assigned_agent_id,
           delivery_fee, cod_payment_status, feedback_status, assignment_status,
           payment_mode, payment_settlement_status, delivery_lat, delivery_lng,
           customer_lat, customer_lng, agent_lat, agent_lng, location_updated_at,
           estimated_duration_seconds
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, NOW(), $33)
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
          data.shippingAddress?.street || 'Road No. 36, Jubilee Hills',
          data.shippingAddress?.postalCode || '500033',
          data.shippingAddress?.city || 'Hyderabad',
          data.shippingAddress?.state || 'Telangana',
          data.shippingAddress?.country || 'India',
          assignedAgentId,
          deliveryFee,
          data.paymentMethod === 'cod' ? 'pending' : 'paid',
          'pending',
          'UNASSIGNED',
          paymentMode,
          paymentSettlementStatus,
          customerLat,
          customerLng,
          customerLat,
          customerLng,
          agentLat,
          agentLng,
          estimatedDurationSeconds,
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
    const normStatus = newStatus.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const isDelivered = normStatus === 'delivered' || normStatus === 'completed';
    const isOutForDelivery = normStatus === 'out_for_delivery' || normStatus === 'shipped';

    const current = await this.getOrderById(id);
    if (!current) return null;

    let deliveryOtp = current.deliveryOtp;
    if (isOutForDelivery && !deliveryOtp) {
      deliveryOtp = Math.floor(100000 + Math.random() * 900000).toString();
    }

    let assignedAgentId = current.assignedAgentId;
    if ((isOutForDelivery || normStatus === 'processed') && !assignedAgentId) {
      try {
        const leastLoaded = await agentRepo.findLeastLoadedActive();
        if (leastLoaded) {
          assignedAgentId = leastLoaded.id;
        }
      } catch {}
    }

    let sql = `
      UPDATE "order" 
      SET status = $1,
          assigned_agent_id = COALESCE($2, assigned_agent_id),
          delivery_otp = COALESCE($3, delivery_otp)
    `;
    const params: any[] = [normStatus, assignedAgentId || null, deliveryOtp || null];
    let idx = 4;

    if (isDelivered) {
      sql += `, payment_status = 'paid', cod_payment_status = 'paid', delivered_at = NOW(),
                next_feedback_reminder_at = NOW() + INTERVAL '15 minutes', feedback_status = 'pending'`;
    }

    sql += ` WHERE (order_number = $${idx++} ${isNum ? `OR id = $${idx++}` : ''}) RETURNING *`;
    params.push(String(id));
    if (isNum) params.push(Number(id));

    const res = await query(sql, params);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // When status changes to processed, trigger FIFO auto-assignment to the #1 active agent
    if (normStatus === 'processed') {
      setTimeout(() => {
        this.assignNextActiveAgentFIFO(row.id).catch(err => console.warn('[FIFO Trigger Error]:', err));
      }, 0);
    }

    // If delivered, credit the assigned agent automatically
    if (isDelivered && row.assigned_agent_id) {
      try {
        const fee = parseFloat(row.delivery_fee || '15.00');
        await agentRepo.creditEarnings(row.assigned_agent_id, fee);
      } catch (err) {
        console.warn('[Credit Agent Warning]:', err);
      }
    }

    const items = await this.getOrderItems(row.id);
    let agent: DeliveryAgent | null = null;
    if (row.assigned_agent_id) {
      agent = await agentRepo.findById(row.assigned_agent_id);
    }
    return mapOrderRow(row, items, agent);
  }

  async markPaidToDeliveryBoy(id: string | number): Promise<Order | null> {
    const isNum = !isNaN(Number(id));
    const res = await query(
      `UPDATE "order" 
       SET payment_status = 'paid_to_delivery_agent', cod_payment_status = 'paid_to_delivery_agent'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(id), Number(id)] : [String(id)]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return mapOrderRow(row, items);
  }

  async getOrdersByAgent(agentId: string): Promise<Order[]> {
    const res = await query(
      `SELECT * FROM "order" WHERE assigned_agent_id = $1 ORDER BY created_at DESC`,
      [agentId]
    );
    const agent = await agentRepo.findById(agentId);
    const orders: Order[] = [];
    for (const row of res.rows) {
      const items = await this.getOrderItems(row.id);
      orders.push(mapOrderRow(row, items, agent));
    }
    return orders;
  }

  /**
   * Guarantees an active delivery agent has orders in their queue upon sign-in.
   * If they have 0 assigned active orders:
   * 1. Checks for unassigned orders in "order" table and assigns up to 2 of them.
   * 2. If no unassigned orders exist, auto-provisions 2 demonstration orders in their zone.
   */
  async ensureAgentHasOrders(agentId: string | number, agentName: string, deliveryZone?: string): Promise<Order[]> {
    const idStr = String(agentId);
    let existing = await this.getOrdersByAgent(idStr);
    const activeOrders = existing.filter(o => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled');
    if (activeOrders.length > 0) {
      return existing;
    }

    try {
      // 1. Look for unassigned or processed orders in PostgreSQL
      const unassignedRes = await query(
        `SELECT id, order_number FROM "order" 
         WHERE (assigned_agent_id IS NULL OR assigned_agent_id = '' OR assigned_agent_id = 'unassigned')
           AND status IN ('processed', 'processing', 'confirmed', 'pending')
         ORDER BY id ASC LIMIT 2`
      );

      if (unassignedRes.rows.length > 0) {
        for (const row of unassignedRes.rows) {
          await query(
            `UPDATE "order" 
             SET assigned_agent_id = $1, 
                 assignment_status = 'ACCEPTED',
                 status = 'processing',
                 assigned_at = NOW()
             WHERE id = $2`,
            [idStr, row.id]
          );
        }
        return await this.getOrdersByAgent(idStr);
      }

      // 2. If no unassigned orders exist, auto-create 2 realistic active orders for this agent
      const zone = deliveryZone || 'Kukatpally, Hyderabad';
      const ordNum1 = `ORD-${Math.floor(100000 + Math.random() * 900000)}-SP`;
      const ordNum2 = `ORD-${Math.floor(100000 + Math.random() * 900000)}-SP`;
      const tracking1 = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const tracking2 = `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`;
      const otp1 = `${Math.floor(1000 + Math.random() * 9000)}`;
      const otp2 = `${Math.floor(1000 + Math.random() * 9000)}`;

      // Fetch a product ID to attach as item
      const prodRes = await query(`SELECT id, title, price, code FROM product LIMIT 2`);
      const prod1 = prodRes.rows[0] || { id: 1, title: 'Luxury Leather Wallet', price: 99.00, code: 'PROD-WAL-01' };
      const prod2 = prodRes.rows[1] || prod1;

      // Order 1: Cash on Delivery (COD), Processing
      const ins1 = await query(
        `INSERT INTO "order" (
           order_number, user_id, user_email, user_name, user_phone,
           status, total_amount, subtotal, tax, shipping_fee, shipping_method,
           payment_method, payment_status, address_line_1, address_postal_code,
           address_city, address_state, address_country, assigned_agent_id,
           delivery_fee, cod_payment_status, assignment_status, payment_mode,
           payment_settlement_status, tracking_id, delivery_otp, created_at, assigned_at
         ) VALUES (
           $1, 'cust_demo_1', 'customer@practicesoftwaretesting.com', 'Pramod Kumar', '+91 98765 43210',
           'processing', $2, $3, $4, 15.00, 'standard',
           'cod', 'pending', $5, '500072',
           'Hyderabad', 'Telangana', 'India', $6,
           15.00, 'pending', 'ACCEPTED', 'COD',
           'PENDING', $7, $8, NOW() - INTERVAL '15 minutes', NOW()
         ) RETURNING id`,
        [
          ordNum1,
          (Number(prod1.price) + 15.00).toFixed(2),
          Number(prod1.price).toFixed(2),
          (Number(prod1.price) * 0.18).toFixed(2),
          `Flat 402, Cyber Heights, ${zone}`,
          idStr,
          tracking1,
          otp1
        ]
      );

      if (ins1.rows[0]) {
        await query(
          `INSERT INTO order_item (order_id, product_id, price, quantity)
           VALUES ($1, $2, $3, 1) ON CONFLICT DO NOTHING`,
          [ins1.rows[0].id, prod1.id, prod1.price]
        );
      }

      // Order 2: Prepaid Online, Out for Delivery
      const ins2 = await query(
        `INSERT INTO "order" (
           order_number, user_id, user_email, user_name, user_phone,
           status, total_amount, subtotal, tax, shipping_fee, shipping_method,
           payment_method, payment_status, address_line_1, address_postal_code,
           address_city, address_state, address_country, assigned_agent_id,
           delivery_fee, cod_payment_status, assignment_status, payment_mode,
           payment_settlement_status, tracking_id, delivery_otp, created_at, assigned_at
         ) VALUES (
           $1, 'cust_demo_2', 'customer2@practicesoftwaretesting.com', 'Alex Rivera', '+91 98765 87654',
           'out_for_delivery', $2, $3, $4, 15.00, 'express',
           'credit_card', 'paid', $5, '500081',
           'Hyderabad', 'Telangana', 'India', $6,
           15.00, 'paid', 'ACCEPTED', 'PREPAID',
           'PAID_ONLINE', $7, $8, NOW() - INTERVAL '45 minutes', NOW()
         ) RETURNING id`,
        [
          ordNum2,
          (Number(prod2.price) + 15.00).toFixed(2),
          Number(prod2.price).toFixed(2),
          (Number(prod2.price) * 0.18).toFixed(2),
          `Villa 12, Rainbow Vistas, ${zone}`,
          idStr,
          tracking2,
          otp2
        ]
      );

      if (ins2.rows[0]) {
        await query(
          `INSERT INTO order_item (order_id, product_id, price, quantity)
           VALUES ($1, $2, $3, 1) ON CONFLICT DO NOTHING`,
          [ins2.rows[0].id, prod2.id, prod2.price]
        );
      }

      return await this.getOrdersByAgent(idStr);
    } catch (err) {
      console.error('[ensureAgentHasOrders Error]:', err);
      return existing;
    }
  }

  async assignAgent(orderId: string | number, agentId: string | null): Promise<Order | null> {
    const isNum = !isNaN(Number(orderId));
    let sql: string;
    let params: any[];

    if (agentId) {
      sql = `UPDATE "order"
             SET assigned_agent_id = $1,
                 assignment_status = 'PENDING_ACCEPTANCE',
                 assigned_at = NOW(),
                 acceptance_deadline = NOW() + INTERVAL '3 minutes'
             WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})
             RETURNING *`;
      params = isNum ? [agentId, String(orderId), Number(orderId)] : [agentId, String(orderId)];
    } else {
      sql = `UPDATE "order"
             SET assigned_agent_id = NULL,
                 assignment_status = 'UNASSIGNED',
                 acceptance_deadline = NULL
             WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
             RETURNING *`;
      params = isNum ? [String(orderId), Number(orderId)] : [String(orderId)];
    }

    const res = await query(sql, params);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    const agent = agentId ? await agentRepo.findById(agentId) : null;
    return mapOrderRow(row, items, agent);
  }

  async assignNextActiveAgentFIFO(orderId: string | number): Promise<Order | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    const normStatus = String(order.orderStatus).toLowerCase().replace(/[\s-]+/g, '_');
    if (normStatus !== 'processed') {
      return order;
    }
    if (order.assignmentStatus === 'ACCEPTED') {
      return order;
    }

    const excludedIds = Array.isArray(order.rejectedOrExpiredAgentIds) ? order.rejectedOrExpiredAgentIds : [];
    const nextAgent = await agentRepo.findEligibleFIFOAgent(excludedIds);

    const isNum = !isNaN(Number(orderId));
    if (nextAgent) {
      const res = await query(
        `UPDATE "order"
         SET assigned_agent_id = $1,
             assignment_status = 'PENDING_ACCEPTANCE',
             assigned_at = NOW(),
             acceptance_deadline = NOW() + INTERVAL '3 minutes'
         WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})
         RETURNING *`,
        isNum ? [nextAgent.id, String(orderId), Number(orderId)] : [nextAgent.id, String(orderId)]
      );
      const row = res.rows[0];
      const items = await this.getOrderItems(row.id);
      return mapOrderRow(row, items, nextAgent);
    } else {
      const res = await query(
        `UPDATE "order"
         SET assigned_agent_id = NULL,
             assignment_status = 'UNASSIGNED',
             acceptance_deadline = NULL
         WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
         RETURNING *`,
        isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
      );
      const row = res.rows[0];
      const items = await this.getOrderItems(row.id);
      return mapOrderRow(row, items, null);
    }
  }

  async acceptAssignment(orderId: string | number, agentId: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (order.assignedAgentId && String(order.assignedAgentId) !== String(agentId)) {
      return { success: false, message: 'This order is assigned to another delivery agent' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const isNum = !isNaN(Number(orderId));

    const res = await query(
      `UPDATE "order"
       SET assignment_status = 'ACCEPTED',
           status = 'out_for_delivery',
           delivery_otp = $1,
           otp_verified = FALSE,
           assigned_agent_id = $2,
           order_proceeded_at = COALESCE(order_proceeded_at, NOW()),
           estimated_delivery_at = COALESCE(estimated_delivery_at, NOW() + (COALESCE(estimated_duration_seconds, 1200) * INTERVAL '1 second')),
           is_delayed = FALSE
       WHERE (order_number = $3 ${isNum ? 'OR id = $4' : ''})
       RETURNING *`,
      isNum ? [otp, agentId, String(orderId), Number(orderId)] : [otp, agentId, String(orderId)]
    );

    if (res.rows.length === 0) return { success: false, message: 'Failed to accept order' };
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    const agent = await agentRepo.findById(agentId);
    const updated = mapOrderRow(row, items, agent);

    try {
      const { sendOrderStatusUpdateEmail } = await import('../services/emailService.js');
      await sendOrderStatusUpdateEmail(updated, 'out_for_delivery');
    } catch (err) {
      console.warn('[Dispatch Email Warning]:', err);
    }

    return {
      success: true,
      message: 'Order accepted! Status changed to OUT FOR DELIVERY and 6-digit OTP dispatched to customer.',
      order: updated,
    };
  }

  async rejectAssignment(orderId: string | number, agentId: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const isNum = !isNaN(Number(orderId));
    const currentList = Array.isArray(order.rejectedOrExpiredAgentIds) ? order.rejectedOrExpiredAgentIds : [];
    if (!currentList.includes(agentId)) {
      currentList.push(agentId);
    }

    await agentRepo.resetFifoQueue(agentId);

    await query(
      `UPDATE "order"
       SET assigned_agent_id = NULL,
           assignment_status = 'UNASSIGNED',
           acceptance_deadline = NULL,
           rejected_or_expired_agent_ids = $1
       WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})`,
      isNum ? [JSON.stringify(currentList), String(orderId), Number(orderId)] : [JSON.stringify(currentList), String(orderId)]
    );

    const reassigned = await this.assignNextActiveAgentFIFO(orderId);

    return {
      success: true,
      message: 'Assignment rejected. Order rotated to next active FIFO agent.',
      order: reassigned || undefined,
    };
  }

  async checkAndRotateExpiredAssignments(): Promise<void> {
    const res = await query(
      `SELECT id, order_number, assigned_agent_id, rejected_or_expired_agent_ids
       FROM "order"
       WHERE LOWER(status) = 'processed'
         AND assignment_status = 'PENDING_ACCEPTANCE'
         AND acceptance_deadline IS NOT NULL
         AND acceptance_deadline < NOW()`
    );

    for (const row of res.rows) {
      const expiredAgentId = row.assigned_agent_id;
      const currentList: string[] = Array.isArray(row.rejected_or_expired_agent_ids)
        ? row.rejected_or_expired_agent_ids
        : [];
      if (expiredAgentId && !currentList.includes(expiredAgentId)) {
        currentList.push(expiredAgentId);
      }

      if (expiredAgentId) {
        await agentRepo.resetFifoQueue(expiredAgentId);
      }

      await query(
        `UPDATE "order"
         SET assigned_agent_id = NULL,
             assignment_status = 'UNASSIGNED',
             acceptance_deadline = NULL,
             rejected_or_expired_agent_ids = $1
         WHERE id = $2`,
        [JSON.stringify(currentList), row.id]
      );

      await this.assignNextActiveAgentFIFO(row.id);
    }
  }

  async completePrepaidDelivery(orderId: string | number, agentId: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (!order.otpVerified) {
      return { success: false, message: 'Cannot complete delivery before 6-digit Delivery OTP is verified' };
    }

    if (order.paymentMode === 'COD') {
      return { success: false, message: 'This is a COD order. Please collect payment via UPI QR or Cash.' };
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET status = 'delivered',
           payment_status = 'paid',
           payment_settlement_status = 'SETTLED',
           delivered_at = NOW(),
           next_feedback_reminder_at = NOW() + INTERVAL '15 minutes',
           feedback_status = 'pending'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    const fee = parseFloat(row.delivery_fee || '15.00');
    await agentRepo.creditEarnings(agentId, fee);

    const items = await this.getOrderItems(row.id);
    const agent = await agentRepo.findById(agentId);
    const updated = mapOrderRow(row, items, agent);

    try {
      const { sendOrderStatusUpdateEmail } = await import('../services/emailService.js');
      await sendOrderStatusUpdateEmail(updated, 'delivered');
    } catch {}

    return {
      success: true,
      message: 'Delivery completed successfully! Agent commission credited.',
      order: updated,
    };
  }

  async submitCodQrPayment(orderId: string | number, agentId: string, reference?: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (!order.otpVerified) {
      return { success: false, message: 'Customer 6-digit Delivery OTP must be verified before payment submission' };
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET cod_collection_method = 'UPI_QR',
           payment_settlement_status = 'QR_PAID_AWAITING_ADMIN',
           cod_payment_method = 'upi'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    const agent = await agentRepo.findById(agentId);
    const updated = mapOrderRow(row, items, agent);

    // Notify Admin of COD UPI QR payment
    try {
      await notificationRepo.createNotification({
        recipientRole: 'ADMIN',
        orderId: updated.orderNumber,
        agentId: agent?.id,
        type: 'COD_QR_COLLECTED',
        title: 'UPI QR Payment Collected',
        message: `Order #${updated.orderNumber}: Agent ${agent?.name || 'Partner'} reported ₹${updated.grandTotal.toFixed(2)} received via UPI QR. Please verify and confirm.`,
        amount: updated.grandTotal,
      });
    } catch (notifErr) {
      console.error('[Notification Error - QR Collected]:', notifErr);
    }

    return {
      success: true,
      message: 'UPI QR Payment submitted! Awaiting Admin verification in Admin Dashboard.',
      order: updated,
    };
  }

  async confirmAdminQrPayment(orderId: string | number): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET payment_settlement_status = 'QR_AMOUNT_RECEIVED',
           status = 'delivered',
           payment_status = 'paid',
           cod_payment_status = 'paid',
           delivered_at = NOW(),
           next_feedback_reminder_at = NOW() + INTERVAL '15 minutes',
           feedback_status = 'pending'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    if (row.assigned_agent_id) {
      const fee = parseFloat(row.delivery_fee || '15.00');
      await agentRepo.creditEarnings(row.assigned_agent_id, fee);
    }

    const items = await this.getOrderItems(row.id);
    let agent: DeliveryAgent | null = null;
    if (row.assigned_agent_id) {
      agent = await agentRepo.findById(row.assigned_agent_id);
    }
    const updated = mapOrderRow(row, items, agent);

    // Notify Delivery Agent that QR payment was verified & approved
    if (row.assigned_agent_id) {
      try {
        await notificationRepo.createNotification({
          recipientRole: 'DELIVERY_AGENT',
          recipientId: row.assigned_agent_id,
          orderId: updated.orderNumber,
          type: 'CASH_DEPOSIT_APPROVED',
          title: 'UPI QR Payment Approved',
          message: `Admin verified and approved UPI QR payment of ₹${updated.grandTotal.toFixed(2)} for Order #${updated.orderNumber}. Delivery fee credited.`,
          amount: updated.grandTotal,
        });
      } catch {}
    }

    try {
      const { sendOrderStatusUpdateEmail } = await import('../services/emailService.js');
      await sendOrderStatusUpdateEmail(updated, 'delivered');
    } catch {}

    return {
      success: true,
      message: 'UPI QR Payment confirmed! Order marked DELIVERED and agent delivery fee credited.',
      order: updated,
    };
  }

  async collectCodCash(orderId: string | number, agentId: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    if (!order.otpVerified) {
      return { success: false, message: 'Customer 6-digit Delivery OTP must be verified before collecting cash' };
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET status = 'delivered',
           payment_status = 'paid',
           cod_payment_method = 'cash',
           cod_payment_status = 'paid',
           cod_collection_method = 'CASH',
           payment_settlement_status = 'CASH_COLLECTED_BY_AGENT',
           delivered_at = NOW(),
           next_feedback_reminder_at = NOW() + INTERVAL '15 minutes',
           feedback_status = 'pending'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    const fee = parseFloat(row.delivery_fee || '15.00');
    await agentRepo.creditEarnings(agentId, fee);

    // LOCK agent: set has_pending_cash_deposit = true and add cash amount to pending_cash_amount
    await agentRepo.recordCashCollection(agentId, parseFloat(row.total_amount));

    const items = await this.getOrderItems(row.id);
    const agent = await agentRepo.findById(agentId);
    const updated = mapOrderRow(row, items, agent);

    // Immediately insert persistent notification for ADMIN
    try {
      await notificationRepo.createNotification({
        recipientRole: 'ADMIN',
        orderId: updated.orderNumber,
        agentId: agentId,
        type: 'COD_CASH_COLLECTED',
        title: 'Cash Collected by Agent',
        message: `Cash Alert: Agent ${agent?.name || 'Partner'} collected ₹${updated.grandTotal.toFixed(2)} cash for Order #${updated.orderNumber} and must deposit it at the Hyderabad store.`,
        amount: updated.grandTotal,
      });
    } catch (notifErr) {
      console.error('[Notification Error - Cash Collected]:', notifErr);
    }

    try {
      const { sendOrderStatusUpdateEmail } = await import('../services/emailService.js');
      await sendOrderStatusUpdateEmail(updated, 'delivered');
    } catch {}

    return {
      success: true,
      message: `Cash of ₹${updated.grandTotal.toFixed(2)} collected. Order delivered! Agent is now locked until cash is deposited at the store.`,
      order: updated,
    };
  }

  async requestCashDepositAtStore(orderId: string | number): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET payment_settlement_status = 'CASH_DEPOSIT_REQUESTED'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    let agent: DeliveryAgent | null = null;
    if (row.assigned_agent_id) {
      agent = await agentRepo.findById(row.assigned_agent_id);
    }
    const updated = mapOrderRow(row, items, agent);

    return {
      success: true,
      message: 'Store cash deposit requested. Notification sent to Delivery Agent.',
      order: updated,
    };
  }

  async markCashDepositedAtStore(orderId: string | number, agentId: string): Promise<{ success: boolean; message: string; order?: Order }> {
    await this.submitAgentCashDeposit(agentId, String(orderId));
    const order = await this.getOrderById(orderId);
    return {
      success: true,
      message: 'Cash marked as deposited at Hyderabad store! Submitted for Admin verification.',
      order: order || undefined,
    };
  }

  async submitAgentCashDeposit(agentId: string, orderNumberOrId?: string): Promise<{ success: boolean; message: string }> {
    const agent = await agentRepo.findById(agentId);
    if (!agent) return { success: false, message: 'Delivery agent not found' };

    // Update agent's orders with CASH_COLLECTED_BY_AGENT or DEPOSIT_REJECTED to DEPOSIT_SUBMITTED_FOR_APPROVAL
    await query(
      `UPDATE "order"
       SET payment_settlement_status = 'DEPOSIT_SUBMITTED_FOR_APPROVAL',
           deposit_submitted_at = NOW(),
           deposit_rejection_note = NULL
       WHERE assigned_agent_id = $1 
         AND (payment_settlement_status IN ('CASH_COLLECTED_BY_AGENT', 'DEPOSIT_REJECTED', 'CASH_DEPOSIT_REQUESTED', 'CASH_DEPOSITED_AT_STORE')
              OR cod_collection_method = 'CASH')`,
      [agentId]
    );

    await agentRepo.submitCashDeposit(agentId);

    const pendingAmount = agent.pendingCashAmount || 0;

    // Immediately insert persistent notification for ADMIN
    try {
      await notificationRepo.createNotification({
        recipientRole: 'ADMIN',
        agentId: agentId,
        orderId: orderNumberOrId || null,
        type: 'CASH_DEPOSIT_SUBMITTED',
        title: 'Cash Deposit Verification Needed',
        message: `Deposit Verification Needed: Agent ${agent.name} marked ₹${pendingAmount.toFixed(2)} cash as deposited at the Hyderabad store. Approve or Reject in Amount Handling Dashboard.`,
        amount: pendingAmount,
      });
    } catch (notifErr) {
      console.error('[Notification Error - Deposit Submitted]:', notifErr);
    }

    return {
      success: true,
      message: `Store cash deposit of ₹${pendingAmount.toFixed(2)} submitted for Store Admin approval.`,
    };
  }

  async approveAgentCashDeposit(agentId: string): Promise<{ success: boolean; message: string }> {
    const agent = await agentRepo.findById(agentId);
    if (!agent) return { success: false, message: 'Delivery agent not found' };

    const depositAmount = agent.pendingCashAmount || 0;

    // Update linked orders to CASH_DEPOSITED_AT_STORE and verified
    await query(
      `UPDATE "order"
       SET payment_settlement_status = 'CASH_DEPOSITED_AT_STORE',
           deposit_verified_at = NOW()
       WHERE assigned_agent_id = $1
         AND (cod_collection_method = 'CASH' 
              OR payment_settlement_status IN ('DEPOSIT_SUBMITTED_FOR_APPROVAL', 'CASH_COLLECTED_BY_AGENT', 'CASH_DEPOSITED_AT_STORE', 'DEPOSIT_REJECTED'))`,
      [agentId]
    );

    // Unlock agent in repository and reset pending amount & rejoin FIFO
    await agentRepo.approveCashDeposit(agentId);

    // Notify Delivery Agent
    try {
      await notificationRepo.createNotification({
        recipientRole: 'DELIVERY_AGENT',
        recipientId: agentId,
        agentId: agentId,
        type: 'CASH_DEPOSIT_APPROVED',
        title: 'Store Cash Deposit Approved',
        message: `Store cash deposit of ₹${depositAmount.toFixed(2)} approved by Admin! Your account is unlocked for next orders.`,
        amount: depositAmount,
      });
    } catch (notifErr) {
      console.error('[Notification Error - Deposit Approved]:', notifErr);
    }

    return {
      success: true,
      message: `Deposit of ₹${depositAmount.toFixed(2)} approved! Delivery partner ${agent.name} is now unlocked and re-entered into active FIFO queue.`,
    };
  }

  async rejectAgentCashDeposit(agentId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const agent = await agentRepo.findById(agentId);
    if (!agent) return { success: false, message: 'Delivery agent not found' };

    const finalReason = reason?.trim() || 'Cash deposit not received at Hyderabad store';

    // Update linked orders
    await query(
      `UPDATE "order"
       SET payment_settlement_status = 'DEPOSIT_REJECTED',
           deposit_rejection_note = $1
       WHERE assigned_agent_id = $2
         AND (cod_collection_method = 'CASH' 
              OR payment_settlement_status IN ('DEPOSIT_SUBMITTED_FOR_APPROVAL', 'CASH_COLLECTED_BY_AGENT', 'CASH_DEPOSITED_AT_STORE'))`,
      [finalReason, agentId]
    );

    // Keep agent locked and record rejection reason
    await agentRepo.rejectCashDeposit(agentId, finalReason);

    // High priority notification for Delivery Agent
    try {
      await notificationRepo.createNotification({
        recipientRole: 'DELIVERY_AGENT',
        recipientId: agentId,
        agentId: agentId,
        type: 'CASH_DEPOSIT_REJECTED',
        title: 'Store Cash Deposit Rejected',
        message: `Deposit Rejected: Store deposit of ₹${(agent.pendingCashAmount || 0).toFixed(2)} was not received. Reason: ${finalReason}. Please deposit the cash at the store and resend your approval request.`,
        amount: agent.pendingCashAmount || 0,
      });
    } catch (notifErr) {
      console.error('[Notification Error - Deposit Rejected]:', notifErr);
    }

    return {
      success: true,
      message: `Store deposit for ${agent.name} rejected. Agent notified to resubmit upon cash delivery.`,
    };
  }

  async getAmountHandlingSummary(): Promise<AmountHandlingSummary> {
    // 1. UPI QR metrics
    const qrRes = await query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS upi_total,
        COALESCE(SUM(CASE WHEN payment_settlement_status IN ('QR_AMOUNT_RECEIVED', 'SETTLED') THEN total_amount ELSE 0 END), 0) AS upi_confirmed,
        COALESCE(SUM(CASE WHEN payment_settlement_status = 'QR_PAID_AWAITING_ADMIN' THEN total_amount ELSE 0 END), 0) AS upi_awaiting
      FROM "order"
      WHERE cod_collection_method = 'UPI_QR' OR payment_settlement_status LIKE 'QR_%'
    `);

    // 2. Cash metrics
    const cashRes = await query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_settlement_status IN ('CASH_DEPOSITED_AT_STORE', 'SETTLED') THEN total_amount ELSE 0 END), 0) AS cash_approved,
        COALESCE(SUM(CASE WHEN payment_settlement_status = 'DEPOSIT_SUBMITTED_FOR_APPROVAL' THEN total_amount ELSE 0 END), 0) AS cash_submitted,
        COALESCE(SUM(CASE WHEN payment_settlement_status IN ('CASH_COLLECTED_BY_AGENT', 'DEPOSIT_REJECTED', 'CASH_DEPOSIT_REQUESTED') THEN total_amount ELSE 0 END), 0) AS cash_held
      FROM "order"
      WHERE cod_collection_method = 'CASH' OR payment_settlement_status LIKE 'CASH_%' OR payment_settlement_status LIKE 'DEPOSIT_%'
    `);

    const upiQrTotal = parseFloat(qrRes.rows[0]?.upi_total || '0');
    const upiQrConfirmed = parseFloat(qrRes.rows[0]?.upi_confirmed || '0');
    const upiQrAwaitingAdmin = parseFloat(qrRes.rows[0]?.upi_awaiting || '0');

    const cashTotal = parseFloat(cashRes.rows[0]?.cash_total || '0');
    const cashApprovedAtStore = parseFloat(cashRes.rows[0]?.cash_approved || '0');
    const cashSubmittedAwaitingApproval = parseFloat(cashRes.rows[0]?.cash_submitted || '0');
    const cashHeldByAgents = parseFloat(cashRes.rows[0]?.cash_held || '0');

    const grandTotalCodRevenue = upiQrConfirmed + cashApprovedAtStore;

    // 3. QR pending orders list
    const qrOrdersRes = await query(`
      SELECT * FROM "order"
      WHERE payment_settlement_status = 'QR_PAID_AWAITING_ADMIN'
      ORDER BY created_at DESC
    `);
    const qrPendingOrders: Order[] = [];
    for (const r of qrOrdersRes.rows) {
      const items = await this.getOrderItems(r.id);
      let ag: DeliveryAgent | null = null;
      if (r.assigned_agent_id) ag = await agentRepo.findById(r.assigned_agent_id);
      qrPendingOrders.push(mapOrderRow(r, items, ag));
    }

    // 4. Deposit approval agents list
    const agentsRes = await query(`
      SELECT * FROM delivery_agents
      WHERE has_pending_cash_deposit = TRUE 
         OR cash_deposit_status IN ('DEPOSIT_SUBMITTED_FOR_APPROVAL', 'REJECTED_RESUBMIT_REQUIRED', 'PENDING_STORE_DEPOSIT')
         OR pending_cash_amount > 0
      ORDER BY 
        CASE WHEN cash_deposit_status = 'DEPOSIT_SUBMITTED_FOR_APPROVAL' THEN 1 ELSE 2 END,
        updated_at DESC
    `);

    const depositApprovalAgents = [];
    for (const ag of agentsRes.rows) {
      const linkedOrdersRes = await query(`
        SELECT order_number, total_amount, deposit_submitted_at
        FROM "order"
        WHERE assigned_agent_id = $1
          AND (cod_collection_method = 'CASH' OR payment_settlement_status IN ('CASH_COLLECTED_BY_AGENT', 'DEPOSIT_SUBMITTED_FOR_APPROVAL', 'DEPOSIT_REJECTED', 'CASH_DEPOSIT_REQUESTED', 'CASH_DEPOSITED_AT_STORE'))
        ORDER BY created_at DESC
      `, [ag.id]);

      depositApprovalAgents.push({
        agentId: String(ag.id),
        agentName: ag.name,
        agentPhone: ag.phone || '+91 98765 43210',
        agentCode: ag.agent_code,
        avatarUrl: ag.avatar_url,
        pendingCashAmount: parseFloat(ag.pending_cash_amount || '0.00'),
        cashDepositStatus: ag.cash_deposit_status || 'PENDING_STORE_DEPOSIT',
        depositRejectionReason: ag.deposit_rejection_reason || null,
        linkedOrders: linkedOrdersRes.rows.map(o => ({
          orderNumber: o.order_number,
          grandTotal: parseFloat(o.total_amount),
          depositSubmittedAt: o.deposit_submitted_at ? new Date(o.deposit_submitted_at).toISOString() : null,
        })),
      });
    }

    return {
      upiQrTotal,
      upiQrConfirmed,
      upiQrAwaitingAdmin,
      cashTotal,
      cashApprovedAtStore,
      cashSubmittedAwaitingApproval,
      cashHeldByAgents,
      grandTotalCodRevenue,
      qrPendingOrders,
      depositApprovalAgents,
    };
  }

  async confirmAdminCashDeposited(orderId: string | number): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET payment_settlement_status = 'SETTLED'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    if (row.assigned_agent_id) {
      await agentRepo.confirmCashDeposit(row.assigned_agent_id);
    }

    const items = await this.getOrderItems(row.id);
    let agent: DeliveryAgent | null = null;
    if (row.assigned_agent_id) {
      agent = await agentRepo.findById(row.assigned_agent_id);
    }
    const updated = mapOrderRow(row, items, agent);

    return {
      success: true,
      message: 'Cash deposit confirmed by store administrator! Delivery Agent is now unlocked and returned to the active FIFO queue.',
      order: updated,
    };
  }

  async verifyDeliveryOtp(orderId: string | number, otp: string): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    const normStatus = String(order.orderStatus).toLowerCase().replace(/[\s-]+/g, '_');
    if (normStatus !== 'out_for_delivery') {
      return { success: false, message: 'Order must be Out for Delivery to verify Delivery OTP' };
    }

    if (!order.deliveryOtp) {
      return { success: false, message: 'Delivery OTP has not been generated for this order' };
    }

    if (order.deliveryOtp.trim() !== otp.trim()) {
      return { success: false, message: 'Invalid 6-digit Delivery OTP. Please request the customer to check their email.' };
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET otp_verified = TRUE,
           is_otp_verified = TRUE
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return {
      success: true,
      message: 'Delivery OTP verified successfully! COD payment collection unlocked.',
      order: mapOrderRow(row, items),
    };
  }

  async completeCodDelivery(
    orderId: string | number,
    paymentMethod: string,
    agentId?: string
  ): Promise<{ success: boolean; statusCode?: number; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, statusCode: 404, message: 'Order not found' };
    }

    if (!order.otpVerified && !order.isOtpVerified) {
      return {
        success: false,
        statusCode: 403,
        message: 'OTP must be verified before collecting payment or marking delivered',
      };
    }

    const normMethod = String(paymentMethod || '').trim().toUpperCase();
    if (normMethod !== 'CASH' && normMethod !== 'UPI') {
      return {
        success: false,
        statusCode: 400,
        message: "Payment method must be strictly either 'CASH' or 'UPI'",
      };
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET status = 'delivered',
           payment_status = 'paid',
           cod_payment_method = $1,
           cod_payment_status = 'paid',
           delivered_at = NOW(),
           next_feedback_reminder_at = NOW() + INTERVAL '15 minutes',
           feedback_status = 'pending'
       WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})
       RETURNING *`,
      isNum ? [normMethod, String(orderId), Number(orderId)] : [normMethod, String(orderId)]
    );

    if (res.rows.length === 0) {
      return { success: false, statusCode: 500, message: 'Failed to update order settlement status' };
    }

    const row = res.rows[0];
    const effectiveAgentId = agentId || row.assigned_agent_id;
    if (effectiveAgentId) {
      try {
        const fee = parseFloat(row.delivery_fee || '15.00');
        await agentRepo.creditEarnings(effectiveAgentId, fee);
      } catch (e) {
        console.warn('[Credit Agent Error]:', e);
      }
    }

    const items = await this.getOrderItems(row.id);
    const updated = mapOrderRow(row, items);
    return {
      success: true,
      statusCode: 200,
      message: `Payment collected via ${normMethod}. Order marked DELIVERED and earnings credited.`,
      order: updated,
    };
  }

  async collectPayment(
    orderId: string | number,
    method: 'cash' | 'upi',
    agentId?: string
  ): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (!order.otpVerified) {
      return { success: false, message: 'Cannot collect payment before Delivery OTP is verified' };
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET status = 'delivered',
           payment_status = 'paid',
           cod_payment_method = $1,
           cod_payment_status = 'paid',
           delivered_at = NOW(),
           next_feedback_reminder_at = NOW() + INTERVAL '15 minutes',
           feedback_status = 'pending'
       WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})
       RETURNING *`,
      isNum ? [method, String(orderId), Number(orderId)] : [method, String(orderId)]
    );

    if (res.rows.length === 0) {
      return { success: false, message: 'Failed to update order settlement status' };
    }

    const row = res.rows[0];
    const effectiveAgentId = agentId || row.assigned_agent_id;
    if (effectiveAgentId) {
      try {
        const fee = parseFloat(row.delivery_fee || '15.00');
        await agentRepo.creditEarnings(effectiveAgentId, fee);
      } catch (e) {
        console.warn('[Credit Agent Error]:', e);
      }
    }

    const items = await this.getOrderItems(row.id);
    const updated = mapOrderRow(row, items);
    return {
      success: true,
      message: `Payment of $${updated.grandTotal.toFixed(2)} collected via ${method.toUpperCase()}. Order marked DELIVERED and commission credited.`,
      order: updated,
    };
  }

  async snoozeFeedback(orderId: string | number): Promise<Order | null> {
    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET next_feedback_reminder_at = NOW() + INTERVAL '1 hour'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return mapOrderRow(row, items);
  }

  async optOutFeedback(orderId: string | number): Promise<Order | null> {
    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET feedback_status = 'dismissed_forever'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return mapOrderRow(row, items);
  }

  async submitFeedback(
    orderId: string | number,
    rating: number,
    comment: string
  ): Promise<{ success: boolean; message: string; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        try {
          const internalId = await productRepo.getInternalProductId(item.productId);
          if (internalId) {
            await query(
              `INSERT INTO product_reviews (
                 review_code, product_id, user_id, user_name, user_email, rating, comment, verified_purchase
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                internalId,
                null,
                order.userName || 'Verified Buyer',
                order.userEmail,
                rating,
                comment,
                true,
              ]
            );
          }
        } catch (revErr) {
          console.warn('[Review Insert Notice]:', revErr);
        }
      }
    }

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET feedback_status = 'submitted'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    return {
      success: true,
      message: 'Feedback submitted successfully. Thank you for rating your purchase!',
      order: mapOrderRow(row, items),
    };
  }

  async getPendingFeedbackOrders(userId: string | number): Promise<Order[]> {
    const rawUser = await userRepo.findRawById(userId);
    const internalUserId = rawUser ? rawUser.id : null;

    let res;
    if (internalUserId) {
      res = await query(
        `SELECT * FROM "order"
         WHERE (user_id = $1 OR user_email = $2)
           AND LOWER(status) IN ('delivered', 'completed')
           AND feedback_status = 'pending'
           AND (next_feedback_reminder_at IS NULL OR next_feedback_reminder_at <= NOW())
         ORDER BY delivered_at DESC`,
        [internalUserId, rawUser.email]
      );
    } else {
      res = await query(
        `SELECT * FROM "order"
         WHERE (user_id::text = $1 OR user_email = $1)
           AND LOWER(status) IN ('delivered', 'completed')
           AND feedback_status = 'pending'
           AND (next_feedback_reminder_at IS NULL OR next_feedback_reminder_at <= NOW())
         ORDER BY delivered_at DESC`,
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

  async updateOrderLocation(
    orderId: string | number,
    lat: number,
    lng: number
  ): Promise<{ success: boolean; order?: Order }> {
    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET agent_lat = $1,
           agent_lng = $2,
           location_updated_at = NOW()
       WHERE (order_number = $3 ${isNum ? 'OR id = $4' : ''})
       RETURNING *`,
      isNum ? [lat, lng, String(orderId), Number(orderId)] : [lat, lng, String(orderId)]
    );
    if (res.rows.length === 0) return { success: false };
    const row = res.rows[0];
    if (row.assigned_agent_id) {
      await agentRepo.updateCoordinates(row.assigned_agent_id, lat, lng);
    }
    const items = await this.getOrderItems(row.id);
    const agent = row.assigned_agent_id ? await agentRepo.findById(row.assigned_agent_id) : null;
    return { success: true, order: mapOrderRow(row, items, agent) };
  }

  async getOrderTracking(orderId: string | number): Promise<OrderTrackingInfo | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    const serverNow = new Date();
    let isDelayed = order.isDelayed || false;
    let delayStartedAt = order.delayStartedAt || null;
    let extraDelaySeconds = order.extraDelaySeconds || 0;

    // Check automatic delay escalation if order is active and out for delivery
    if (
      order.orderProceededAt &&
      order.estimatedDeliveryAt &&
      order.orderStatus !== 'delivered' &&
      order.orderStatus !== 'cancelled'
    ) {
      const estimatedTime = new Date(order.estimatedDeliveryAt).getTime();
      if (serverNow.getTime() > estimatedTime) {
        isDelayed = true;
        if (!delayStartedAt) {
          delayStartedAt = order.estimatedDeliveryAt;
        }
        extraDelaySeconds = Math.max(0, Math.round((serverNow.getTime() - estimatedTime) / 1000));

        // Update database with delayed state
        const isNum = !isNaN(Number(orderId));
        await query(
          `UPDATE "order"
           SET is_delayed = TRUE,
               delay_started_at = COALESCE(delay_started_at, estimated_delivery_at),
               extra_delay_seconds = $1
           WHERE (order_number = $2 ${isNum ? 'OR id = $3' : ''})`,
          isNum ? [extraDelaySeconds, String(orderId), Number(orderId)] : [extraDelaySeconds, String(orderId)]
        );
      }
    }

    // Retrieve order transfers audit trail
    const transferRes = await query(
      `SELECT ot.*, 
              fa.name as from_agent_name, 
              ta.name as to_agent_name
       FROM order_transfers ot
       LEFT JOIN delivery_agents fa ON ot.from_agent_id = fa.id
       LEFT JOIN delivery_agents ta ON ot.to_agent_id = ta.id
       WHERE ot.order_id = $1
       ORDER BY ot.transferred_at ASC`,
      [Number(order.id)]
    );

    const transfers: OrderTransfer[] = transferRes.rows.map(r => ({
      id: r.id,
      orderId: r.order_id,
      fromAgentId: r.from_agent_id,
      fromAgentName: r.from_agent_name,
      toAgentId: r.to_agent_id,
      toAgentName: r.to_agent_name,
      transferReason: r.transfer_reason,
      handoffLat: r.handoff_lat ? parseFloat(r.handoff_lat) : null,
      handoffLng: r.handoff_lng ? parseFloat(r.handoff_lng) : null,
      transferredAt: new Date(r.transferred_at).toISOString(),
    }));

    return {
      order_id: order.id,
      order_number: order.orderNumber,
      status: order.orderStatus,
      server_now: serverNow.toISOString(),
      order_proceeded_at: order.orderProceededAt || null,
      estimated_duration_seconds: order.estimatedDurationSeconds || 1200,
      estimated_delivery_at: order.estimatedDeliveryAt || null,
      is_delayed: isDelayed,
      delay_started_at: delayStartedAt,
      extra_delay_seconds: extraDelaySeconds,
      store_coords: STORE_COORDS,
      customer_coords: {
        lat: order.customerLat || order.deliveryLat || 17.4375,
        lng: order.customerLng || order.deliveryLng || 78.4482,
      },
      agent_coords: {
        lat: order.agentLat || STORE_COORDS.lat,
        lng: order.agentLng || STORE_COORDS.lng,
      },
      location_updated_at: order.locationUpdatedAt || null,
      assigned_agent: order.assignedAgent
        ? {
            id: String(order.assignedAgent.id),
            name: order.assignedAgent.name,
            phone: order.assignedAgent.phone,
            vehicleType: order.assignedAgent.vehicleType,
            avatarUrl: order.assignedAgent.avatarUrl,
          }
        : null,
      transfers,
    };
  }

  async findNearestActiveAgent(
    orderId: string | number,
    currentAgentId: string
  ): Promise<NearestAgentInfo | null> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;

    const refLat = order.agentLat || STORE_COORDS.lat;
    const refLng = order.agentLng || STORE_COORDS.lng;

    // 2-Tier Assignment Query: get all active, online, verified delivery agents (excluding current agent and lockout)
    // with their current count of active assigned orders.
    const res = await query(
      `SELECT da.*,
              COUNT(o.id) FILTER (WHERE o.status IN ('processing', 'processed', 'out_for_delivery')) AS active_order_count
       FROM delivery_agents da
       LEFT JOIN "order" o ON o.assigned_agent_id = da.id
       WHERE da.is_active = TRUE
         AND da.is_logged_in = TRUE
         AND da.is_email_verified = TRUE
         AND da.has_pending_cash_deposit = FALSE
         AND da.id != $1
       GROUP BY da.id
       ORDER BY da.last_active_at DESC`,
      [currentAgentId]
    );

    if (res.rows.length === 0) return null;

    const agentsWithDistances = res.rows.map(r => {
      const aLat = r.current_lat ? parseFloat(r.current_lat) : STORE_COORDS.lat;
      const aLng = r.current_lng ? parseFloat(r.current_lng) : STORE_COORDS.lng;
      const dist = calculateHaversineDistance(refLat, refLng, aLat, aLng);
      const activeCount = parseInt(r.active_order_count || '0', 10);
      return {
        row: r,
        dist,
        activeCount,
      };
    });

    // Tier 1: Idle agents (0 active orders)
    const idleAgents = agentsWithDistances.filter(a => a.activeCount === 0);
    // Tier 2: Busy agents (>= 1 active orders)
    const busyAgents = agentsWithDistances.filter(a => a.activeCount > 0);

    let chosen: (typeof agentsWithDistances)[0];
    let assignmentTier: 'IDLE_NEAREST' | 'BUSY_NEAREST';

    if (idleAgents.length > 0) {
      idleAgents.sort((a, b) => a.dist - b.dist);
      chosen = idleAgents[0];
      assignmentTier = 'IDLE_NEAREST';
    } else {
      busyAgents.sort((a, b) => a.dist - b.dist);
      chosen = busyAgents[0];
      assignmentTier = 'BUSY_NEAREST';
    }

    const handoffMinutes = Math.max(3, Math.round((chosen.dist / 25) * 60) + 2);

    return {
      id: String(chosen.row.id),
      name: chosen.row.name,
      phone: chosen.row.phone,
      vehicleType: chosen.row.vehicle_type,
      avatarUrl: chosen.row.avatar_url,
      distanceKm: chosen.dist,
      distanceFormatted: `${chosen.dist.toFixed(1)} km away`,
      handoffEtaMinutes: handoffMinutes,
      assignmentTier,
      activeOrderCount: chosen.activeCount,
      statusText: assignmentTier === 'IDLE_NEAREST' ? 'Idle & Ready' : `Completing ${chosen.activeCount} nearby drop(s)`,
    };
  }

  async transferOrder(
    orderId: string | number,
    fromAgentId: string,
    transferReason: string,
    handoffCoords?: { lat: number; lng: number }
  ): Promise<{ success: boolean; message: string; newAgent?: DeliveryAgent; order?: Order }> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      return { success: false, message: 'Order not found' };
    }

    if (String(order.assignedAgentId) !== String(fromAgentId)) {
      return { success: false, message: 'You are not the assigned agent for this order.' };
    }

    const trimmedReason = (transferReason || '').trim();
    if (trimmedReason.length < 15) {
      return { success: false, message: 'Transfer reason must be at least 15 characters describing the route obstruction or emergency.' };
    }

    const fromAgent = await agentRepo.findById(fromAgentId);
    const nearestAgentInfo = await this.findNearestActiveAgent(orderId, fromAgentId);
    if (!nearestAgentInfo) {
      return {
        success: false,
        message: 'No nearby online delivery agents are currently available for transfer.',
      };
    }

    const toAgent = await agentRepo.findById(nearestAgentInfo.id);
    if (!toAgent) {
      return { success: false, message: 'Failed to resolve destination delivery agent.' };
    }

    const handoffLat = handoffCoords?.lat || order.agentLat || STORE_COORDS.lat;
    const handoffLng = handoffCoords?.lng || order.agentLng || STORE_COORDS.lng;
    const extraHandoffSeconds = nearestAgentInfo.handoffEtaMinutes * 60;
    const assignmentTier = nearestAgentInfo.assignmentTier || 'IDLE_NEAREST';

    const client = await getClient();
    try {
      // Auto-heal / ensure order transfer columns exist before executing transfer
      const requiredCols = [
        'assigned_agent_id VARCHAR(100)',
        'transfer_reason TEXT',
        'transferred_from_agent_name VARCHAR(255)',
        'transferred_from_agent_id VARCHAR(100)',
        'assignment_tier VARCHAR(50) DEFAULT \'IDLE_NEAREST\'',
        'agent_lat DOUBLE PRECISION DEFAULT 17.4486',
        'agent_lng DOUBLE PRECISION DEFAULT 78.3908',
        'location_updated_at TIMESTAMP WITH TIME ZONE',
        'estimated_delivery_at TIMESTAMP WITH TIME ZONE',
      ];
      for (const colDef of requiredCols) {
        try {
          await client.query(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS ${colDef}`);
        } catch {
          // ignore already existing column or permission check
        }
      }

      await client.query('BEGIN');

      const isNum = !isNaN(Number(orderId));
      const updateRes = await client.query(
        `UPDATE "order"
         SET assigned_agent_id = $1,
             transfer_reason = $2,
             transferred_from_agent_name = $3,
             transferred_from_agent_id = $4,
             assignment_tier = $5,
             agent_lat = $6,
             agent_lng = $7,
             location_updated_at = NOW(),
             estimated_delivery_at = COALESCE(estimated_delivery_at, NOW()) + ($8 * INTERVAL '1 second')
         WHERE (order_number = $9 ${isNum ? 'OR id = $10' : ''})
         RETURNING *`,
        isNum
          ? [toAgent.id, trimmedReason, fromAgent?.name || 'Previous Agent', fromAgentId, assignmentTier, toAgent.currentLat || handoffLat, toAgent.currentLng || handoffLng, extraHandoffSeconds, String(orderId), Number(orderId)]
          : [toAgent.id, trimmedReason, fromAgent?.name || 'Previous Agent', fromAgentId, assignmentTier, toAgent.currentLat || handoffLat, toAgent.currentLng || handoffLng, extraHandoffSeconds, String(orderId)]
      );

      const updatedRow = updateRes.rows[0];

      await client.query(
        `INSERT INTO order_transfers (order_id, from_agent_id, to_agent_id, assignment_tier, transfer_reason, handoff_lat, handoff_lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [updatedRow.id, fromAgentId, toAgent.id, assignmentTier, trimmedReason, handoffLat, handoffLng]
      );

      // Insert persistent notifications
      // 1. Admin Alert
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, order_id, agent_id, type, event_type, title, message, amount, metadata)
         VALUES ('ADMIN', NULL, $1, $2, 'ORDER_TRANSFERRED', 'ORDER_TRANSFERRED', $3, $4, $5, $6)`,
        [
          updatedRow.id,
          toAgent.id,
          `Emergency Order Transfer: Order #${order.orderNumber}`,
          `Order #${order.orderNumber} transferred from ${fromAgent?.name || 'Agent'} to ${toAgent.name} (${assignmentTier === 'IDLE_NEAREST' ? 'Tier 1: Idle Nearest' : 'Tier 2: Busy Nearest'}, ${nearestAgentInfo.distanceFormatted}). Reason: ${trimmedReason}`,
          order.grandTotal,
          JSON.stringify({
            previousAgentId: fromAgentId,
            previousAgentName: fromAgent?.name,
            newAgentId: toAgent.id,
            newAgentName: toAgent.name,
            assignmentTier,
            distanceKm: nearestAgentInfo.distanceKm,
            reason: trimmedReason,
          }),
        ]
      );

      // 2. Customer Alert
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, order_id, agent_id, type, event_type, title, message, amount, metadata)
         VALUES ('CUSTOMER', $1, $2, $3, 'AGENT_REASSIGNED', 'AGENT_REASSIGNED', $4, $5, $6, $7)`,
        [
          order.userId || null,
          updatedRow.id,
          toAgent.id,
          `Delivery Executive Updated for Order #${order.orderNumber}`,
          `Your delivery partner has been updated to ${toAgent.name} (${toAgent.phone || '+91 98490 88776'}) to keep your order on track.`,
          order.grandTotal,
          JSON.stringify({ newAgentName: toAgent.name, newAgentPhone: toAgent.phone }),
        ]
      );

      // 3. Transferred-To Agent Alert
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, order_id, agent_id, type, event_type, title, message, amount, metadata)
         VALUES ('DELIVERY_AGENT', $1, $2, $1, 'ORDER_TRANSFERRED_TO_YOU', 'ORDER_TRANSFERRED_TO_YOU', $3, $4, $5, $6)`,
        [
          toAgent.id,
          updatedRow.id,
          `Handoff Order Assigned: #${order.orderNumber}`,
          `Order #${order.orderNumber} transferred to you from ${fromAgent?.name || 'Agent'}. Reason: ${trimmedReason}. Please proceed to the handoff point.`,
          order.grandTotal,
          JSON.stringify({ fromAgentName: fromAgent?.name, reason: trimmedReason }),
        ]
      );

      await client.query('COMMIT');

      const items = await this.getOrderItems(updatedRow.id);
      const mapped = mapOrderRow(updatedRow, items, toAgent);

      return {
        success: true,
        message: `Order successfully transferred to nearest agent ${toAgent.name} (${assignmentTier === 'IDLE_NEAREST' ? 'Tier 1: Idle Nearest' : 'Tier 2: Busy Nearest'}).`,
        newAgent: toAgent,
        order: mapped,
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[Transfer Order Transaction Error]:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  async logCustomerAgentContact(
    orderId: string | number,
    contactChannel: 'CALL' | 'WHATSAPP' | 'IN_APP_CHAT',
    customerId?: string | null
  ): Promise<{ success: boolean; message: string }> {
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const agentId = order.assignedAgentId || null;
      const agentName = order.assignedAgentName || order.assignedAgent?.name || 'Delivery Partner';
      const custName = order.userName || 'Customer';

      // 1. Insert into agent_contact_logs
      await client.query(
        `INSERT INTO agent_contact_logs (order_id, customer_id, agent_id, contact_channel, contacted_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [order.id, customerId || order.userId || null, agentId, contactChannel]
      );

      // 2. Insert persistent Admin Alert Notification
      await client.query(
        `INSERT INTO notifications (recipient_role, recipient_id, order_id, agent_id, type, event_type, title, message, amount, metadata)
         VALUES ('ADMIN', NULL, $1, $2, 'CUSTOMER_CONTACTED_AGENT', 'CUSTOMER_CONTACTED_AGENT', $3, $4, $5, $6)`,
        [
          order.id,
          agentId,
          `Customer Contact Initiated: Order #${order.orderNumber}`,
          `Customer ${custName} contacted Delivery Agent ${agentName} via ${contactChannel} regarding Order #${order.orderNumber}.`,
          order.grandTotal,
          JSON.stringify({ orderNumber: order.orderNumber, contactChannel, customerName: custName, agentName }),
        ]
      );

      await client.query('COMMIT');
      return { success: true, message: 'Contact logged and admin alerted successfully.' };
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('[Customer Agent Contact Error]:', err);
      return { success: false, message: `Failed to log contact: ${err.message}` };
    } finally {
      client.release();
    }
  }

  async cancelOrder(id: string | number): Promise<Order | null> {
    const order = await this.getOrderById(id);
    if (!order) return null;
    if (order.orderStatus === 'cancelled') return order;

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        try {
          const internalId = await productRepo.getInternalProductId(item.productId);
          if (internalId) {
            await query(
              `UPDATE inventory SET stock_available = stock_available + $1
               WHERE product_id = $2 AND store_id = 1`,
              [item.quantity, internalId]
            );
            await query(
              `UPDATE product SET stock = stock + $1 WHERE id = $2`,
              [item.quantity, internalId]
            );
          }
        } catch (e) {
          console.warn('[Cancel Order Stock Restore Error]:', e);
        }
      }
    }

    return await this.updateOrderStatus(id, 'cancelled');
  }
}

export const orderRepo = new OrderRepository();
