import { Request, Response, Router } from 'express';
import { AuthenticatedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';
import { cartRepo } from '../repositories/cartRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail, sendCodPaymentMarkedAdminAlert } from '../services/emailService.js';

export const ordersRouter = Router();

// POST /api/orders/verify-otp (Simulate OTP verification for QA payment flows)
ordersRouter.post('/verify-otp', (req: Request, res: Response): void => {
  const { otpCode } = req.body || {};
  if (!otpCode || otpCode.trim() !== '123456') {
    res.status(400).json({
      success: false,
      message: 'Invalid OTP code. Please enter a valid 6-digit verification code.',
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

    // Respond immediately so checkout completes in milliseconds without gateway timeout
    res.status(201).json({
      success: true,
      message: 'Order placed successfully and persisted in PostgreSQL',
      data: order,
    });

    // Send Order Confirmation Email asynchronously in background (completely non-blocking)
    setImmediate(async () => {
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

// GET /api/orders/pending-feedback (Retrieve orders pending post-delivery feedback for current customer)
// IMPORTANT: Declared BEFORE /:id to prevent Express from treating 'pending-feedback' as an :id parameter
ordersRouter.get('/pending-feedback', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      res.status(200).json({ success: true, data: [] });
      return;
    }

    const pending = await orderRepo.getPendingFeedbackOrders(userId);
    res.status(200).json({
      success: true,
      data: pending,
    });
  } catch (err: any) {
    console.error('[Pending Feedback Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve pending feedback orders' });
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

// GET /api/orders/:id/tracking - Single source of truth for dynamic map & synchronized countdown
ordersRouter.get('/:id/tracking', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const tracking = await orderRepo.getOrderTracking(id);
    if (!tracking) {
      res.status(404).json({ success: false, message: `Order '${id}' not found.` });
      return;
    }
    res.status(200).json({ success: true, data: tracking });
  } catch (err: any) {
    console.error('[Order Tracking Error]:', err);
    res.status(500).json({ success: false, message: `Failed to fetch tracking: ${err.message}` });
  }
});

// PATCH /api/orders/:id/location & POST /api/orders/:id/location - Update live moving rider coordinates
const handleLocationUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body || {};
    if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
      res.status(400).json({ success: false, message: 'Valid lat and lng coordinates are required.' });
      return;
    }
    const result = await orderRepo.updateOrderLocation(id, Number(lat), Number(lng));
    if (!result.success) {
      res.status(404).json({ success: false, message: `Order '${id}' not found.` });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: {
        agent_lat: Number(lat),
        agent_lng: Number(lng),
        location_updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Update Location Error]:', err);
    res.status(500).json({ success: false, message: `Failed to update location: ${err.message}` });
  }
};
ordersRouter.patch('/:id/location', handleLocationUpdate);
ordersRouter.post('/:id/location', handleLocationUpdate);

// GET /api/orders/:id/nearest-agent - Nearest available online delivery agent preview
ordersRouter.get('/:id/nearest-agent', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderRepo.getOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: `Order '${id}' not found.` });
      return;
    }
    const currentAgentId = (req as any).agent?.id || (req as any).user?.id || order.assignedAgentId || '';
    const nearest = await orderRepo.findNearestActiveAgent(id, String(currentAgentId));
    if (!nearest) {
      res.status(404).json({ success: false, message: 'No nearby online delivery agents are currently available for transfer.' });
      return;
    }
    res.status(200).json({ success: true, data: nearest });
  } catch (err: any) {
    console.error('[Nearest Agent Error]:', err);
    res.status(500).json({ success: false, message: `Failed to find nearest agent: ${err.message}` });
  }
});

// POST /api/orders/:id/transfer - Emergency order transfer to nearest active delivery agent
ordersRouter.post('/:id/transfer', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transferReason, handoffCoords } = req.body || {};
    
    if (!transferReason || typeof transferReason !== 'string' || transferReason.trim().length < 15) {
      res.status(400).json({
        success: false,
        message: 'A valid transfer reason of at least 15 characters is required.',
      });
      return;
    }

    const order = await orderRepo.getOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: `Order '${id}' not found.` });
      return;
    }

    const currentAgentId = (req as any).agent?.id || order.assignedAgentId;
    if (!currentAgentId) {
      res.status(400).json({ success: false, message: 'Cannot transfer an unassigned order.' });
      return;
    }

    const result = await orderRepo.transferOrder(id, String(currentAgentId), transferReason.trim(), handoffCoords);
    if (!result.success) {
      const status = result.message.includes('No nearby online delivery agents') ? 409 : 400;
      res.status(status).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Transfer Order Error]:', err);
    res.status(500).json({ success: false, message: `Failed to transfer order: ${err.message}` });
  }
});

// POST /api/orders/:id/contact-agent (Customer initiates contact with delivery partner; audit logs and alerts admin)
ordersRouter.post('/:id/contact-agent', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { contactChannel } = req.body || {};

    const validChannels = ['CALL', 'WHATSAPP', 'IN_APP_CHAT'];
    const normChannel = String(contactChannel || '').toUpperCase().trim();
    if (!validChannels.includes(normChannel)) {
      res.status(400).json({
        success: false,
        message: 'Valid contactChannel is required: CALL, WHATSAPP, or IN_APP_CHAT.',
      });
      return;
    }

    const customerId = req.user?.id ? String(req.user.id) : null;
    const result = await orderRepo.logCustomerAgentContact(
      id,
      normChannel as 'CALL' | 'WHATSAPP' | 'IN_APP_CHAT',
      customerId
    );

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Contact Agent Route Error]:', err);
    res.status(500).json({ success: false, message: `Failed to log agent contact: ${err.message}` });
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
    const triggerStatuses = ['processed', 'processing', 'out_for_delivery', 'shipped', 'delivered', 'completed', 'cancelled'];

    res.status(200).json({
      success: true,
      message: `Order #${updatedOrder.orderNumber} status updated to '${status}' and notification queued`,
      data: updatedOrder,
    });

    if (triggerStatuses.includes(normalized)) {
      setImmediate(async () => {
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
      });
    }
  } catch (error: any) {
    console.error('[Update Order Status Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update order status in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
};


// POST /api/orders/:id/paid-to-delivery-boy (Customer marks Cash on Delivery as paid to delivery boy)
ordersRouter.post('/:id/paid-to-delivery-boy', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderRepo.getOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: `Order with ID '${id}' not found` });
      return;
    }

    if (order.paymentMethod !== 'cod') {
      res.status(400).json({
        success: false,
        message: 'Only Cash on Delivery (COD) orders can be marked as paid to delivery boy.',
      });
      return;
    }

    const normStatus = String(order.orderStatus).toLowerCase().replace(/[\s-]+/g, '_');
    if (normStatus !== 'out_for_delivery') {
      res.status(400).json({
        success: false,
        message: 'Payment to delivery agent can only be confirmed once the order is Out for Delivery.',
      });
      return;
    }

    if (order.orderStatus === 'cancelled') {
      res.status(400).json({
        success: false,
        message: 'Cannot mark a cancelled order as paid.',
      });
      return;
    }

    const updated = await orderRepo.markPaidToDeliveryBoy(id);
    if (!updated) {
      res.status(500).json({ success: false, message: 'Failed to update payment status' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Order #${updated.orderNumber} marked as paid to delivery boy. Admin has been notified for verification.`,
      data: updated,
    });

    // Notify Admin via email to verify payment and approve delivery
    setImmediate(async () => {
      try {
        const adminEmailRes = await sendCodPaymentMarkedAdminAlert(updated);
        if (adminEmailRes.success) {
          console.log(`[Admin COD Alert]: Notified admin of payment for order #${updated.orderNumber}`);
        }
      } catch (err) {
        console.error('[Admin COD Alert Background Error]:', err);
      }
    });
  } catch (error: any) {
    console.error('[Paid To Delivery Boy Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to mark paid to delivery boy: ${error.message || 'Server error'}`,
    });
  }
});

ordersRouter.patch('/:id/status', handleStatusUpdate);
ordersRouter.put('/:id/status', handleStatusUpdate);

// PATCH /api/orders/:id/cancel (Customer cancellation of placed order, restores inventory stock)
ordersRouter.patch('/:id/cancel', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await orderRepo.getOrderById(id);
    if (!order) {
      res.status(404).json({ success: false, message: `Order with ID '${id}' not found in PostgreSQL` });
      return;
    }

    if (req.user && req.user.role !== 'admin' && String(order.userId) !== String(req.user.id) && order.userEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'Forbidden: Cannot cancel another customer order' });
      return;
    }

    if (order.orderStatus === 'delivered' || order.orderStatus === 'shipped') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel order with current status '${order.orderStatus}'. Please contact support.`,
      });
      return;
    }

    const cancelled = await orderRepo.cancelOrder(id);
    res.status(200).json({
      success: true,
      message: `Order #${order.orderNumber} successfully cancelled in PostgreSQL`,
      data: cancelled,
    });

    if (cancelled) {
      setImmediate(async () => {
        try {
          await sendOrderStatusUpdateEmail(cancelled, 'cancelled');
        } catch (e) {
          console.error('[Cancel Order Email Error]:', e);
        }
      });
    }
  } catch (error: any) {
    console.error('[Cancel Order Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to cancel order in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// POST /api/orders/:id/feedback (Submit post-delivery rating & review)
ordersRouter.post('/:id/feedback', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body || {};

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
      return;
    }

    const result = await orderRepo.submitFeedback(id, parseInt(rating, 10), comment || 'Great product!');
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[Submit Feedback Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to submit feedback' });
  }
});

// POST /api/orders/:id/feedback/snooze (Snooze feedback reminder by 1 hour)
ordersRouter.post('/:id/feedback/snooze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await orderRepo.snoozeFeedback(id);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Feedback reminder snoozed for 1 hour',
      data: updated,
    });
  } catch (err: any) {
    console.error('[Snooze Feedback Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to snooze feedback reminder' });
  }
});

// POST /api/orders/:id/feedback/opt-out (Permanently dismiss automated feedback reminders for this order)
ordersRouter.post('/:id/feedback/opt-out', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await orderRepo.optOutFeedback(id);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Automated feedback reminders permanently dismissed for this order. You can still leave a review anytime via the product page.",
      data: updated,
    });
  } catch (err: any) {
    console.error('[Opt Out Feedback Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to opt-out of feedback reminders' });
  }
});


