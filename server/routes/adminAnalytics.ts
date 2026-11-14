import { Response, Router } from 'express';
import { query } from '../db/pool.js';
import { AuthenticatedRequest, requireAdmin } from '../middleware/auth.js';
import { userRepo } from '../repositories/userRepo.js';

export const adminAnalyticsRouter = Router();

// Protect all admin analytics routes with requireAdmin middleware
adminAnalyticsRouter.use(requireAdmin);

/**
 * GET /api/admin/analytics/summary
 * Returns overall platform totals from PostgreSQL:
 * - Total Customers (registered customers)
 * - Total Orders (all orders placed)
 * - Total Sales / Revenue (sum of total_amount)
 * - Total Cart Items (items currently in customer carts)
 * - Total Wishlist Items (items in customer wishlists)
 */
adminAnalyticsRouter.get('/summary', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [custRes, ordRes, cartRes, wishRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'customer'`),
      query(`SELECT COUNT(*)::int AS order_count, COALESCE(SUM(total_amount), 0)::numeric(12,2) AS total_sales FROM "order"`),
      query(`SELECT COALESCE(SUM(quantity), 0)::int AS count FROM cart`),
      query(`SELECT COUNT(*)::int AS count FROM wishlist`),
    ]);

    const totalCustomers = custRes.rows[0]?.count || 0;
    const totalOrders = ordRes.rows[0]?.order_count || 0;
    const totalSales = parseFloat(ordRes.rows[0]?.total_sales || '0');
    const totalCartItems = cartRes.rows[0]?.count || 0;
    const totalWishlistItems = wishRes.rows[0]?.count || 0;

    res.status(200).json({
      success: true,
      data: {
        totalCustomers,
        totalOrders,
        totalSales,
        totalCartItems,
        totalWishlistItems,
      },
    });
  } catch (err: any) {
    console.error('[Admin Analytics Summary Error]:', err);
    res.status(500).json({
      success: false,
      message: `Failed to fetch analytics summary: ${err.message}`,
    });
  }
});

/**
 * GET /api/admin/analytics/customers
 * Returns customer activity breakdown:
 * List of registered customers with their individual counts:
 * - Number of orders placed & total spent
 * - Number of cart items currently in cart
 * - Number of wishlist items
 */
adminAnalyticsRouter.get('/customers', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
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
      WHERE u.role = 'customer'
      ORDER BY u.created_at DESC;
    `;

    const result = await query(sql);

    const customers = result.rows.map((r) => ({
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
      data: customers,
    });
  } catch (err: any) {
    console.error('[Admin Analytics Customers Error]:', err);
    res.status(500).json({
      success: false,
      message: `Failed to fetch customer activity: ${err.message}`,
    });
  }
});

/**
 * GET /api/admin/analytics/customers/:id
 * Returns deep inspection for a specific customer:
 * - Customer Profile Details
 * - All placed orders with nested order_items
 * - All current cart items with product details
 * - All current wishlist items with product details
 */
adminAnalyticsRouter.get('/customers/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const identifier = req.params.id;
    const rawUser = await userRepo.findRawById(identifier);

    if (!rawUser) {
      res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
      return;
    }

    const userId = rawUser.id;
    const userEmail = rawUser.email;

    // Fetch Orders with line items
    const ordersSql = `
      SELECT 
        o.id,
        o.order_number,
        o.user_id,
        o.user_email,
        o.user_name,
        o.status,
        o.total_amount,
        o.subtotal,
        o.tax,
        o.shipping_fee,
        o.shipping_method,
        o.payment_method,
        o.payment_status,
        o.address_line_1,
        o.address_city,
        o.address_state,
        o.address_postal_code,
        o.address_country,
        o.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'productId', p.product_code,
              'productName', p.name,
              'productImage', p.image_url,
              'price', oi.price,
              'quantity', oi.quantity,
              'selectedVariant', oi.selected_variant,
              'selectedColor', oi.selected_color,
              'selectedSize', oi.selected_size
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
        ) AS items
      FROM "order" o
      LEFT JOIN order_item oi ON o.id = oi.order_id
      LEFT JOIN product p ON oi.product_id = p.id
      WHERE o.user_id = $1 OR LOWER(o.user_email) = LOWER($2)
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;

    // Fetch Cart Items
    const cartSql = `
      SELECT 
        c.id,
        c.basket_id,
        c.quantity,
        c.selected_options,
        c.created_at,
        p.id AS product_id,
        p.product_code,
        p.name AS product_name,
        p.price,
        p.image_url,
        p.category
      FROM cart c
      JOIN product p ON c.product_id = p.id
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC;
    `;

    // Fetch Wishlist Items
    const wishlistSql = `
      SELECT 
        w.id,
        w.created_at,
        p.id AS product_id,
        p.product_code,
        p.name AS product_name,
        p.price,
        p.image_url,
        p.category
      FROM wishlist w
      JOIN product p ON w.product_id = p.id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC;
    `;

    const [ordersRes, cartRes, wishlistRes] = await Promise.all([
      query(ordersSql, [userId, userEmail]),
      query(cartSql, [userId]),
      query(wishlistSql, [userId]),
    ]);

    const formattedOrders = ordersRes.rows.map((o) => ({
      id: String(o.id),
      orderNumber: o.order_number,
      status: o.status,
      totalAmount: parseFloat(o.total_amount),
      subtotal: parseFloat(o.subtotal),
      tax: parseFloat(o.tax),
      shippingFee: parseFloat(o.shipping_fee),
      shippingMethod: o.shipping_method,
      paymentMethod: o.payment_method,
      paymentStatus: o.payment_status,
      shippingAddress: {
        street: o.address_line_1 || '',
        city: o.address_city || '',
        state: o.address_state || '',
        postalCode: o.address_postal_code || '',
        country: o.address_country || '',
      },
      createdAt: o.created_at ? new Date(o.created_at).toISOString() : new Date().toISOString(),
      items: o.items || [],
    }));

    const formattedCart = cartRes.rows.map((c) => {
      const price = parseFloat(c.price);
      const qty = parseInt(c.quantity, 10);
      const selectedOpts = typeof c.selected_options === 'string'
        ? JSON.parse(c.selected_options)
        : (c.selected_options || {});

      return {
        id: `cart_${c.id}`,
        productId: c.product_code || String(c.product_id),
        productName: c.product_name,
        productImage: c.image_url,
        category: c.category,
        quantity: qty,
        unitPrice: price,
        totalPrice: parseFloat((price * qty).toFixed(2)),
        selectedVariant: selectedOpts.selectedVariant,
        selectedColor: selectedOpts.selectedColor,
        selectedSize: selectedOpts.selectedSize,
        createdAt: c.created_at ? new Date(c.created_at).toISOString() : new Date().toISOString(),
      };
    });

    const formattedWishlist = wishlistRes.rows.map((w) => ({
      id: `wishlist_${w.id}`,
      productId: w.product_code || String(w.product_id),
      productName: w.product_name,
      productImage: w.image_url,
      category: w.category,
      price: parseFloat(w.price),
      createdAt: w.created_at ? new Date(w.created_at).toISOString() : new Date().toISOString(),
    }));

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: rawUser.user_code || String(rawUser.id),
          name: rawUser.name,
          username: rawUser.username,
          email: rawUser.email,
          phone: rawUser.phone || '',
          avatar: rawUser.avatar || '',
          role: rawUser.role,
          createdAt: rawUser.created_at ? new Date(rawUser.created_at).toISOString() : new Date().toISOString(),
          address: rawUser.address_line_1
            ? {
                street: rawUser.address_line_1,
                city: rawUser.address_city || '',
                state: rawUser.address_state || '',
                postalCode: rawUser.address_postal_code || '',
                country: rawUser.address_country || '',
              }
            : null,
        },
        orders: formattedOrders,
        cartItems: formattedCart,
        wishlistItems: formattedWishlist,
      },
    });
  } catch (err: any) {
    console.error('[Admin Customer Detail Error]:', err);
    res.status(500).json({
      success: false,
      message: `Failed to fetch customer details: ${err.message}`,
    });
  }
});

