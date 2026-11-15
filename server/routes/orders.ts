import { Request, Response, Router } from 'express';
import { AuthenticatedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';
import { cartRepo } from '../repositories/cartRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from '../services/emailService.js';

export const ordersRouter = Router();

// POST /api/orders/verify-otp (Simulate OTP verification for QA payment flows)
ordersRouter.post('/verify-otp', (req: Request, res: Response): void => {
  const { otpCode } = req.body || {};
  if (!otpCode || otpCode.trim() !== '123456') {
    res.status(400).json({
      success: false,
      message: 'Invalid OTP code. For test automation use code: 123456',
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'OTP verified successfully. Gateway payment pre-authorized.',
    data: {
      verified: true,
      transactionRef: `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`,
    },
  });
});

// POST /api/orders (Create and place an order directly into PostgreSQL with atomic stock decrement)
ordersRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { basketId, shippingAddress, shippingMethod = 'standard', paymentMethod = 'credit_card', userEmail, userName, userId } = req.body || {};

    if (!basketId) {
      res.status(400).json({
        success: false,
        message: 'basketId is required to place an order',
      });
      return;
    }

    const effectiveUserId = req.user?.id || userId;
    const basket = await cartRepo.getBasket(basketId, effectiveUserId);
    if (!basket || basket.items.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Basket is empty or not found in PostgreSQL. Cannot create order without items.',
      });
      return;
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      res.status(400).json({
        success: false,
        message: 'Complete shipping address is required (Full name, Street, City, Postal Code)',
      });
      return;
    }

    const orderUserId = effectiveUserId || '1';
    const email = req.user?.email || userEmail || 'customer@practicesoftwaretesting.com';
    const name = req.user?.name || userName || shippingAddress.fullName;

    const order = await orderRepo.createOrder({
      userId: orderUserId,
      userEmail: email,
      userName: name,
      basketId,
      items: basket.items,
      shippingAddress,
      shippingMethod,
      paymentMethod,
    });

    // Send Order Confirmation Email via Zoho Mail SMTP (safe try/catch so email errors never block order placement)
    try {
      const emailRes = await sendOrderConfirmationEmail(order);
      if (emailRes.success) {
        console.log(`[Order Email]: Confirmation email sent to ${order.userEmail} (${emailRes.messageId})`);
      } else {
        console.warn(`[Order Email Warning]: Could not deliver confirmation email to ${order.userEmail}:`, emailRes.error);
      }
    } catch (emailErr) {
      console.error('[Order Confirmation Email Background Error]:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully and persisted in PostgreSQL',
      data: order,
    });
  } catch (error: any) {
    console.error('[Create Order Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to place order in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// GET /api/orders (Fetch orders for current user or all if admin from PostgreSQL)
ordersRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role === 'admin') {
      const all = await orderRepo.getAllOrders();
      res.status(200).json({ success: true, data: all });
      return;
    }

    const userOrders = await orderRepo.getOrdersByUser(req.user.id);
    res.status(200).json({
      success: true,
      data: userOrders,
    });
  } catch (error: any) {
    console.error('[Get Orders Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve orders from PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// GET /api/orders/:id (Fetch single order from PostgreSQL)
ordersRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderRepo.getOrderById(id);

    if (!order) {
      res.status(404).json({
        success: false,
        message: `Order with ID '${id}' not found in PostgreSQL`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error: any) {
    console.error('[Get Order By ID Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve order from PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// PATCH /api/orders/:id/status (Updates order status in PostgreSQL & sends automated notification email)
const handleStatusUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || typeof status !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Valid status string is required (e.g. processed, out_for_delivery, delivered)',
      });
      return;
    }

    const currentOrder = await orderRepo.getOrderById(id);
    if (!currentOrder) {
      res.status(404).json({
        success: false,
        message: `Order with ID '${id}' not found in PostgreSQL`,
      });
      return;
    }

    const updatedOrder = await orderRepo.updateOrderStatus(id, status.trim().toLowerCase());
    if (!updatedOrder) {
      res.status(500).json({
        success: false,
        message: 'Failed to update order status in PostgreSQL',
      });
      return;
    }

    // Check if status requires an automated email notification (Processed, Out for Delivery, Delivered)
    const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const triggerStatuses = ['processed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'completed'];

    if (triggerStatuses.includes(normalized)) {
      try {
        const emailRes = await sendOrderStatusUpdateEmail(updatedOrder, status);
        if (emailRes.success) {
          console.log(`[Order Status Email]: Status update (${status}) sent to ${updatedOrder.userEmail} (${emailRes.messageId})`);
        } else {
          console.warn(`[Order Status Email Warning]: Could not deliver status email to ${updatedOrder.userEmail}:`, emailRes.error);
        }
      } catch (err) {
        console.error('[Order Status Email Background Error]:', err);
      }
    }

    res.status(200).json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} status updated to '${status}' and notification queued`,
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error('[Update Order Status Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update order status in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
};

ordersRouter.patch('/:id/status', handleStatusUpdate);
ordersRouter.put('/:id/status', handleStatusUpdate);

