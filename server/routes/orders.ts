import { Request, Response, Router } from 'express';
import { db } from '../dbStore.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';

export const ordersRouter = Router();

// POST /api/orders/verify-otp (Simulate OTP verification for QA payment flows)
ordersRouter.post('/verify-otp', (req: Request, res: Response): void => {
  const { otpCode, phone, paymentMethod } = req.body || {};
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

// POST /api/orders (Create and place an order)
ordersRouter.post('/', (req: AuthenticatedRequest, res: Response): void => {
  const { basketId, shippingAddress, shippingMethod = 'standard', paymentMethod = 'credit_card', userEmail, userName, otpCode } = req.body || {};

  if (!basketId) {
    res.status(400).json({
      success: false,
      message: 'basketId is required to place an order',
    });
    return;
  }

  const basket = db.getBasket(basketId);
  if (!basket || basket.items.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Basket is empty or not found. Cannot create order without items.',
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

  const userId = req.user?.id || 'user_guest_checkout';
  const email = req.user?.email || userEmail || 'customer@practicesoftwaretesting.com';
  const name = req.user?.name || userName || shippingAddress.fullName;

  const order = db.createOrder({
    userId,
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
    message: 'Order placed successfully',
    data: order,
  });
});

// GET /api/orders (Fetch orders for current user or all if admin)
ordersRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (req.user.role === 'admin') {
    const all = db.getAllOrders();
    res.status(200).json({ success: true, data: all });
    return;
  }

  const userOrders = db.getOrdersByUser(req.user.id);
  res.status(200).json({
    success: true,
    data: userOrders,
  });
});

// GET /api/orders/:id (Fetch single order)
ordersRouter.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const order = db.getOrderById(id);

  if (!order) {
    res.status(404).json({
      success: false,
      message: `Order with ID '${id}' not found`,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: order,
  });
});
