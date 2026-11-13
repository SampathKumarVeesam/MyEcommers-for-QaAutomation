import { Request, Response, Router } from 'express';
import { AuthenticatedRequest, optionalAuth, requireAuth } from '../middleware/auth.js';
import { cartRepo } from '../repositories/cartRepo.js';
import { orderRepo } from '../repositories/orderRepo.js';

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
