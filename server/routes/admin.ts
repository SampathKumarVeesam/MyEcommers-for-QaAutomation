import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { agentRepo } from '../repositories/agentRepo.js';
import { inventoryRepo } from '../repositories/inventoryRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';
import { productRepo } from '../repositories/productRepo.js';
import { storeRepo } from '../repositories/storeRepo.js';
import { userRepo } from '../repositories/userRepo.js';
import { sendOrderStatusUpdateEmail, sendTestEmail } from '../services/emailService.js';

export const adminRouter = Router();

// Protect all admin endpoints with requireAdmin middleware
adminRouter.use(requireAdmin);

// ============================================================================
// 1. ADMIN PRODUCTS MANAGEMENT
// ============================================================================

/**
 * POST /api/admin/products
 * Create a new product in PostgreSQL
 */
adminRouter.post('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    if (!body.title || !body.price || !body.category) {
      res.status(400).json({
        success: false,
        message: 'Title, price, and category are required fields',
      });
      return;
    }

    const newProduct = await productRepo.createProduct({
      id: `prod_${crypto.randomUUID().slice(0, 8)}`,
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: body.category,
      subcategory: body.subcategory || 'General',
      price: parseFloat(body.price),
      compareAtPrice: body.compareAtPrice ? parseFloat(body.compareAtPrice) : undefined,
      stock: parseInt(body.stock || '10', 10),
      rating: parseFloat(body.rating || '4.5'),
      reviewsCount: parseInt(body.reviewsCount || '1', 10),
      images: body.images?.length ? body.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
      description: body.description || '',
      tags: body.tags || [],
      specifications: body.specifications || {},
      featured: Boolean(body.featured),
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully in PostgreSQL',
      data: newProduct,
    });
  } catch (error: any) {
    console.error('[Admin Create Product Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to create product in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * PUT /api/admin/products/:id
 * Full update of an existing product in PostgreSQL
 */
adminRouter.put('/products/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await productRepo.updateProduct(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: `Product '${id}' not found in PostgreSQL` });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Product updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Admin Update Product Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update product in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * PATCH /api/admin/products/:id/featured
 * Toggle or set featured flag on product
 */
adminRouter.patch('/products/:id/featured', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { featured } = req.body || {};
    const updated = await productRepo.toggleFeatured(id, featured);
    if (!updated) {
      res.status(404).json({ success: false, message: `Product '${id}' not found in PostgreSQL` });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Product featured status updated in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Admin Toggle Featured Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update featured flag in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * DELETE /api/admin/products/:id
 * Delete product and cascade related inventory/reviews
 */
adminRouter.delete('/products/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await productRepo.deleteProduct(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: `Product '${id}' not found in PostgreSQL` });
      return;
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('[Admin Delete Product Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to delete product in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// ============================================================================
// 2. ADMIN INVENTORY MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/inventory
 * List stock levels across stores and products with isLowStock alert
 */
adminRouter.get('/inventory', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const items = await inventoryRepo.getAllInventory();
    res.status(200).json({
      success: true,
      data: items,
      count: items.length,
      lowStockCount: items.filter((i) => i.isLowStock).length,
    });
  } catch (error: any) {
    console.error('[Admin Get Inventory Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve inventory: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * PATCH /api/admin/inventory/:productId
 * Adjust stock in PostgreSQL inventory
 */
adminRouter.patch('/inventory/:productId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { storeId = 1, stock } = req.body || {};

    if (stock === undefined) {
      res.status(400).json({ success: false, message: 'stock quantity is required' });
      return;
    }

    const qty = parseInt(stock, 10);
    await inventoryRepo.setStock(productId, Number(storeId), qty);
    const updated = await inventoryRepo.getInventoryByProduct(productId);

    res.status(200).json({
      success: true,
      message: 'Inventory stock updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Admin Update Inventory Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update inventory: ${error.message || 'Database error'}`,
    });
  }
});

// ============================================================================
// 3. ADMIN ORDERS MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/orders
 * Fetch all platform orders across all users with status filtering
 */
adminRouter.get('/orders', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    let orders = await orderRepo.getAllOrders();

    if (status && typeof status === 'string') {
      const target = status.trim().toLowerCase();
      orders = orders.filter((o) => o.orderStatus.toLowerCase() === target);
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error: any) {
    console.error('[Admin Get Orders Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve orders: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * GET /api/admin/orders/:id
 * Retrieve full order details including customer address and items
 */
adminRouter.get('/orders/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderRepo.getOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: `Order with ID '${id}' not found` });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('[Admin Get Order Detail Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch order: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status and trigger automated customer email notification
 */
const handleAdminOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || typeof status !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Valid status string is required (e.g. processing, shipped, delivered, cancelled)',
      });
      return;
    }

    const currentOrder = await orderRepo.getOrderById(id);
    if (!currentOrder) {
      res.status(404).json({ success: false, message: `Order with ID '${id}' not found` });
      return;
    }

    const updated = await orderRepo.updateOrderStatus(id, status.trim().toLowerCase());
    if (!updated) {
      res.status(500).json({ success: false, message: 'Failed to update order status' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Order #${updated.orderNumber} status updated to '${status}'`,
      data: updated,
    });

    // Notify customer asynchronously
    const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const triggerStatuses = ['processed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (triggerStatuses.includes(normalized)) {
      setImmediate(async () => {
        try {
          const emailRes = await sendOrderStatusUpdateEmail(updated, status);
          if (emailRes.success) {
            console.log(`[Admin Order Email]: Notification (${status}) sent to ${updated.userEmail}`);
          }
        } catch (e) {
          console.error('[Admin Order Email Error]:', e);
        }
      });
    }
  } catch (error: any) {
    console.error('[Admin Order Status Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update order status: ${error.message || 'Database error'}`,
    });
  }
};


// POST /api/admin/orders/:id/approve-cod-delivery (Admin approves COD payment and marks delivered)
adminRouter.post('/orders/:id/approve-cod-delivery', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentOrder = await orderRepo.getOrderById(id);
    if (!currentOrder) {
      res.status(404).json({ success: false, message: `Order #${id} not found` });
      return;
    }
    const updated = await orderRepo.updateOrderStatus(id, 'delivered');
    if (!updated) {
      res.status(500).json({ success: false, message: 'Failed to update order to delivered' });
      return;
    }
    res.status(200).json({
      success: true,
      message: `COD Order #${updated.orderNumber} payment approved and status updated to delivered`,
      data: updated,
    });
    setImmediate(async () => {
      try {
        await sendOrderStatusUpdateEmail(updated, 'delivered');
      } catch (e) {
        console.error('[Admin COD Approval Email Error]:', e);
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

adminRouter.patch('/orders/:id/status', handleAdminOrderStatus);
adminRouter.put('/orders/:id/status', handleAdminOrderStatus);

// ============================================================================
// 4. ADMIN USERS & CUSTOMER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/users
 * Returns all registered users with metrics (spend, orders count, role)
 */
adminRouter.get('/users', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const sql = `
      SELECT 
        u.id,
        u.user_code,
        u.name,
        u.username,
        u.email,
        u.role,
        u.phone,
        u.avatar,
        u.created_at,
        COALESCE(o.order_count, 0)::int AS orders_count,
        COALESCE(o.total_spent, 0)::numeric(10,2) AS total_spent,
        COALESCE(c.cart_count, 0)::int AS cart_items_count,
        COALESCE(w.wishlist_count, 0)::int AS wishlist_items_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS order_count, SUM(total_amount) AS total_spent
        FROM "order"
        GROUP BY user_id
      ) o ON u.id = o.user_id
      LEFT JOIN (
        SELECT user_id, SUM(quantity) AS cart_count
        FROM cart
        WHERE user_id IS NOT NULL
        GROUP BY user_id
      ) c ON u.id = c.user_id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS wishlist_count
        FROM wishlist
        GROUP BY user_id
      ) w ON u.id = w.user_id
      ORDER BY u.created_at DESC;
    `;
    const result = await query(sql);

    const users = result.rows.map((r) => ({
      id: r.user_code || String(r.id),
      numericId: r.id,
      name: r.name,
      username: r.username,
      email: r.email,
      phone: r.phone || '',
      avatar: r.avatar || '',
      role: r.role,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      ordersCount: r.orders_count,
      totalSpent: parseFloat(r.total_spent || '0'),
      cartItemsCount: r.cart_items_count,
      wishlistItemsCount: r.wishlist_items_count,
    }));

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error: any) {
    console.error('[Admin List Users Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve users: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Retrieve customer details with order history, cart, and wishlist
 */
adminRouter.get('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const identifier = req.params.id;
    const rawUser = await userRepo.findRawById(identifier);

    if (!rawUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const [ordersRes, cartRes, wishlistRes] = await Promise.all([
      query(
        `SELECT o.*, COALESCE(
           json_agg(
             json_build_object(
               'id', oi.id,
               'productId', p.product_code,
               'productName', p.name,
               'productImage', p.image_url,
               'price', oi.price,
               'quantity', oi.quantity
             )
           ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
         ) AS items
         FROM "order" o
         LEFT JOIN order_item oi ON o.id = oi.order_id
         LEFT JOIN product p ON oi.product_id = p.id
         WHERE o.user_id = $1 OR LOWER(o.user_email) = LOWER($2)
         GROUP BY o.id
         ORDER BY o.created_at DESC`,
        [rawUser.id, rawUser.email]
      ),
      query(
        `SELECT c.id, c.quantity, p.product_code, p.name AS product_name, p.price, p.image_url
         FROM cart c
         JOIN product p ON c.product_id = p.id
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [rawUser.id]
      ),
      query(
        `SELECT w.id, p.product_code, p.name AS product_name, p.price, p.image_url
         FROM wishlist w
         JOIN product p ON w.product_id = p.id
         WHERE w.user_id = $1
         ORDER BY w.created_at DESC`,
        [rawUser.id]
      ),
    ]);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: rawUser.user_code || String(rawUser.id),
          numericId: rawUser.id,
          name: rawUser.name,
          username: rawUser.username,
          email: rawUser.email,
          phone: rawUser.phone || '',
          avatar: rawUser.avatar || '',
          role: rawUser.role,
          createdAt: rawUser.created_at ? new Date(rawUser.created_at).toISOString() : new Date().toISOString(),
        },
        orders: ordersRes.rows,
        cartItems: cartRes.rows,
        wishlistItems: wishlistRes.rows,
      },
    });
  } catch (error: any) {
    console.error('[Admin Get User Detail Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch user details: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Update user role (admin | customer)
 */
adminRouter.patch('/users/:id/role', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!role || !['admin', 'customer'].includes(role)) {
      res.status(400).json({
        success: false,
        message: "Valid role is required ('admin' or 'customer')",
      });
      return;
    }

    const updated = await userRepo.updateRole(id, role);
    if (!updated) {
      res.status(404).json({ success: false, message: `User '${id}' not found` });
      return;
    }

    const { passwordHash: _, ...safeUser } = updated;
    res.status(200).json({
      success: true,
      message: `User role successfully updated to '${role}'`,
      data: safeUser,
    });
  } catch (error: any) {
    console.error('[Admin Update User Role Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update user role: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user account from PostgreSQL
 */
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await userRepo.deleteUser(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: `User '${id}' not found` });
      return;
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('[Admin Delete User Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to delete user: ${error.message || 'Database error'}`,
    });
  }
});

// ============================================================================
// 5. ADMIN REVIEWS MODERATION
// ============================================================================

/**
 * GET /api/admin/reviews
 * Fetch all reviews across all products for admin moderation
 */
adminRouter.get('/reviews', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const reviews = await productRepo.getAllReviews();
    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error: any) {
    console.error('[Admin Get Reviews Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve reviews: ${error.message || 'Database error'}`,
    });
  }
});

/**
 * DELETE /api/admin/reviews/:id
 * Delete or moderate review
 */
adminRouter.delete('/reviews/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await productRepo.deleteReview(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: `Review '${id}' not found` });
      return;
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('[Admin Delete Review Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to delete review: ${error.message || 'Database error'}`,
    });
  }
});

// ============================================================================
// 6. ADMIN ANALYTICS & STORE SETTINGS
// ============================================================================

/**
 * GET /api/admin/analytics/summary
 * Overall platform KPI totals from PostgreSQL
 */
adminRouter.get('/analytics/summary', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [custRes, ordRes, cartRes, wishRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'`),
      query(`SELECT COUNT(*)::int AS order_count, COALESCE(SUM(total_amount), 0)::numeric(12,2) AS total_sales FROM "order"`),
      query(`SELECT COALESCE(SUM(quantity), 0)::int AS count FROM cart`),
      query(`SELECT COUNT(*)::int AS count FROM wishlist`),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalCustomers: custRes.rows[0]?.count || 0,
        totalOrders: ordRes.rows[0]?.order_count || 0,
        totalSales: parseFloat(ordRes.rows[0]?.total_sales || '0'),
        totalCartItems: cartRes.rows[0]?.count || 0,
        totalWishlistItems: wishRes.rows[0]?.count || 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Failed to fetch analytics summary: ${err.message}` });
  }
});

/**
 * POST /api/admin/analytics/test-email
 * Send test SMTP email via Zoho Mail
 */
adminRouter.post('/analytics/test-email', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    const targetEmail = (email || req.user?.email || process.env.SMTP_USER || 'sampathkumarveesam@zohomail.in').trim();
    const result = await sendTestEmail(targetEmail);
    if (!result.success) {
      res.status(500).json({ success: false, message: `Failed to send test email: ${result.error}` });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${targetEmail} via Zoho Mail SMTP`,
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: `Test email error: ${err.message}` });
  }
});

/**
 * PUT /api/admin/store
 * Update store info / settings
 */
adminRouter.put('/store', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { storeId = 1, name, address, phone } = req.body || {};
    const updated = await storeRepo.updateStore(Number(storeId), { name, address, phone });
    if (!updated) {
      res.status(404).json({ success: false, message: `Store with ID ${storeId} not found` });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Store settings updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: `Failed to update store: ${error.message}` });
  }
});

// ============================================================================
// 7. DELIVERY AGENT MANAGEMENT & ORDER REASSIGNMENT
// ============================================================================

/**
 * GET /api/admin/agents
 * List all delivery agents
 */
adminRouter.get('/agents', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const agents = await agentRepo.listAll();
    res.status(200).json({
      success: true,
      data: agents,
    });
  } catch (err: any) {
    console.error('[Admin List Agents Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve delivery agents' });
  }
});

/**
 * POST /api/admin/agents
 * Create or provision a new delivery agent directly from admin panel
 */
adminRouter.post('/agents', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, gender, vehicleType, deliveryZone, avatarUrl, commissionRate, password } = req.body || {};
    if (!name || !email) {
      res.status(400).json({ success: false, message: 'Name and email are required' });
      return;
    }

    const existing = await agentRepo.findByEmail(email);
    if (existing) {
      res.status(400).json({ success: false, message: 'A delivery agent with this email already exists' });
      return;
    }

    const rawPassword = password || 'Agent@123';
    const passwordHash = bcrypt.hashSync(rawPassword, 10);

    const created = await agentRepo.createAgent({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      gender,
      vehicleType,
      deliveryZone,
      avatarUrl,
      passwordHash,
      isEmailVerified: true,
      mustChangePassword: false,
      commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : 15.00,
    });

    res.status(201).json({
      success: true,
      message: 'Delivery agent created successfully in PostgreSQL',
      data: created,
    });
  } catch (err: any) {
    console.error('[Admin Create Agent Error]:', err);
    res.status(500).json({ success: false, message: `Failed to create delivery agent: ${err.message}` });
  }
});

/**
 * PATCH /api/admin/agents/:id
 * Toggle active status or update commission rate
 */
adminRouter.patch('/agents/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive, commissionRate } = req.body || {};
    const updated = await agentRepo.updateStatusOrCommission(id, {
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      commissionRate: commissionRate !== undefined ? parseFloat(commissionRate) : undefined,
    });

    if (!updated) {
      res.status(404).json({ success: false, message: `Delivery agent '${id}' not found` });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Delivery agent updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (err: any) {
    console.error('[Admin Update Agent Error]:', err);
    res.status(500).json({ success: false, message: `Failed to update delivery agent: ${err.message}` });
  }
});

/**
 * POST /api/admin/orders/:id/assign-agent
 * Manually assign / reassign an order to a delivery agent
 */
adminRouter.post('/orders/:id/assign-agent', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { agentId } = req.body || {};
    if (!agentId || agentId === 'unassigned') {
      const unassignedOrder = await orderRepo.assignAgent(id, null);
      if (!unassignedOrder) {
        res.status(404).json({ success: false, message: `Order '${id}' not found` });
        return;
      }
      res.status(200).json({
        success: true,
        message: `Order #${unassignedOrder.orderNumber} unassigned from delivery agent`,
        data: unassignedOrder,
      });
      return;
    }

    const agent = await agentRepo.findById(agentId);
    if (!agent) {
      res.status(404).json({ success: false, message: `Delivery agent '${agentId}' not found` });
      return;
    }

    const updatedOrder = await orderRepo.assignAgent(id, agentId);
    if (!updatedOrder) {
      res.status(404).json({ success: false, message: `Order '${id}' not found` });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} successfully assigned to agent ${agent.name} (3-minute acceptance window started)`,
      data: updatedOrder,
    });
  } catch (err: any) {
    console.error('[Admin Assign Agent Error]:', err);
    res.status(500).json({ success: false, message: `Failed to assign delivery agent: ${err.message}` });
  }
});

/**
 * PATCH /api/admin/orders/:id/confirm-qr-payment
 * Admin confirms customer UPI QR payment received at store bank account
 */
adminRouter.patch('/orders/:id/confirm-qr-payment', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.confirmAdminQrPayment(id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Admin Confirm QR Error]:', err);
    res.status(500).json({ success: false, message: `Failed to confirm QR payment: ${err.message}` });
  }
});

/**
 * PATCH /api/admin/orders/:id/request-cash-deposit
 * Admin triggers "Deposit Cash at Store" prompt to the delivery agent holding cash
 */
adminRouter.patch('/orders/:id/request-cash-deposit', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.requestCashDepositAtStore(id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Admin Request Cash Deposit Error]:', err);
    res.status(500).json({ success: false, message: `Failed to request store cash deposit: ${err.message}` });
  }
});

/**
 * PATCH /api/admin/orders/:id/confirm-cash-deposited
 * Admin verifies physical cash at Hyderabad store, settles order, and UNLOCKS the delivery agent
 */
adminRouter.patch('/orders/:id/confirm-cash-deposited', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await orderRepo.confirmAdminCashDeposited(id);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Admin Confirm Cash Deposited Error]:', err);
    res.status(500).json({ success: false, message: `Failed to confirm cash deposit: ${err.message}` });
  }
});

