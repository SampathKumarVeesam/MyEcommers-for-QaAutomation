import { Address, BasketItem, DeliveryAgent, Order, OrderStatus, PaymentMethod } from '../../src/types.js';
import { getClient, query } from '../db/pool.js';
import { agentRepo } from './agentRepo.js';
import { inventoryRepo } from './inventoryRepo.js';
import { mapProductRow, productRepo } from './productRepo.js';
import { userRepo } from './userRepo.js';

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
    deliveryLat: row.delivery_lat ? parseFloat(row.delivery_lat) : 17.4375,
    deliveryLng: row.delivery_lng ? parseFloat(row.delivery_lng) : 78.4482,
    deliveryFee: row.delivery_fee ? parseFloat(row.delivery_fee) : 15.00,
    codPaymentMethod: row.cod_payment_method || null,
    codPaymentStatus: row.cod_payment_status || (row.payment_method === 'cod' ? (row.payment_status === 'paid' ? 'paid' : 'pending') : null),
    deliveryOtp: row.delivery_otp || null,
    otpVerified: Boolean(row.otp_verified),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
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
      const deliveryLat = 17.4319; // Default Jubilee Hills / Hyderabad customer pin
      const deliveryLng = 78.4073;

      // 1. Insert order header into public."order"
      const orderRes = await client.query(
        `INSERT INTO "order" (
           order_number, user_id, user_email, user_name, basket_id, tracking_id,
           status, total_amount, subtotal, tax, shipping_fee, shipping_method,
           payment_method, payment_status, address_line_1, address_postal_code,
           address_city, address_state, address_country, assigned_agent_id,
           delivery_fee, cod_payment_status, feedback_status, assignment_status,
           payment_mode, payment_settlement_status, delivery_lat, delivery_lng
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
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
          deliveryLat,
          deliveryLng,
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
           assigned_agent_id = $2
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
    const order = await this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    const isNum = !isNaN(Number(orderId));
    const res = await query(
      `UPDATE "order"
       SET payment_settlement_status = 'CASH_DEPOSITED_AT_STORE'
       WHERE (order_number = $1 ${isNum ? 'OR id = $2' : ''})
       RETURNING *`,
      isNum ? [String(orderId), Number(orderId)] : [String(orderId)]
    );

    const row = res.rows[0];
    const items = await this.getOrderItems(row.id);
    const agent = await agentRepo.findById(agentId);
    const updated = mapOrderRow(row, items, agent);

    return {
      success: true,
      message: 'Cash marked as deposited at Hyderabad store! Awaiting Admin confirmation to unlock future orders.',
      order: updated,
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
       SET otp_verified = TRUE
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
