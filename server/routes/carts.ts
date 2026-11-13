import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { cartRepo } from '../repositories/cartRepo.js';

export const cartsRouter = Router();

// GET /api/carts/user/:userId (Fetch cart for a specific user ID directly from PostgreSQL)
cartsRouter.get('/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const basket = await cartRepo.getUserCart(userId);
    res.status(200).json({
      success: true,
      data: basket,
    });
  } catch (error: any) {
    console.error('[Get User Cart Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch cart from PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// POST /api/carts (Initializes unique basket object with unique ID in PostgreSQL, status 201)
cartsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body?.userId;
    const basketId = `basket_${crypto.randomUUID().slice(0, 12)}`;
    const basket = await cartRepo.getBasket(basketId, userId);

    res.status(201).json({
      success: true,
      message: 'Basket initialized successfully in PostgreSQL',
      data: {
        basketId,
        basket,
      },
    });
  } catch (error: any) {
    console.error('[Create Basket Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to initialize basket in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// POST /api/carts/merge (Merges guest basket items to user in PostgreSQL)
cartsRouter.post('/merge', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { basketId } = req.body || {};
    const userId = req.user?.id || req.body?.userId;

    if (!basketId || !userId) {
      res.status(400).json({
        success: false,
        message: 'Both basketId and userId are required to merge carts',
      });
      return;
    }

    const merged = await cartRepo.mergeBasket(basketId, userId);
    res.status(200).json({
      success: true,
      message: 'Cart items successfully merged to user in PostgreSQL',
      data: merged,
    });
  } catch (error: any) {
    console.error('[Merge Cart Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to merge cart in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// GET /api/carts/:basketId (Returns products currently in the basket and total item count from PostgreSQL)
cartsRouter.get('/:basketId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { basketId } = req.params;
    const userId = req.user?.id || req.query.userId as string;
    const basket = await cartRepo.getBasket(basketId, userId);

    res.status(200).json({
      success: true,
      data: {
        basketId: basket.id,
        userId: basket.userId,
        items: basket.items,
        totalItemCount: basket.totalItemCount,
        subtotal: basket.subtotal,
        estimatedTax: basket.estimatedTax,
        shippingFee: basket.shippingFee,
        grandTotal: basket.grandTotal,
        updatedAt: basket.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[Get Basket Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to fetch basket from PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// POST /api/carts/:basketId (Adds/updates product items in the basket, status 200)
cartsRouter.post('/:basketId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { basketId } = req.params;
    const { productId, quantity = 1, selectedVariant, selectedColor, selectedSize, storeId, userId } = req.body || {};
    const effectiveUserId = req.user?.id || userId;

    if (!productId) {
      res.status(400).json({
        success: false,
        message: 'productId is required to add or update item in basket',
      });
      return;
    }

    const qty = parseInt(quantity, 10);
    const result = await cartRepo.addOrUpdateItem(
      basketId,
      productId,
      isNaN(qty) ? 1 : qty,
      {
        selectedVariant,
        selectedColor,
        selectedSize,
        storeId: storeId ? parseInt(storeId, 10) : undefined,
        userId: effectiveUserId,
      }
    );

    res.status(200).json({
      success: true,
      message: result.message,
      data: result.basket,
    });
  } catch (err: any) {
    console.error('[Update Basket Error]:', err);
    res.status(500).json({
      success: false,
      message: `Error updating basket item in PostgreSQL: ${err.message || 'Database error'}`,
    });
  }
});

// PATCH /api/carts/:basketId/items/:productId (Update quantity of specific cart item)
cartsRouter.patch('/:basketId/items/:productId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { basketId, productId } = req.params;
    const { quantity, selectedVariant, userId } = req.body || {};
    const effectiveUserId = req.user?.id || userId;

    if (quantity === undefined) {
      res.status(400).json({ success: false, message: 'quantity is required' });
      return;
    }

    const updated = await cartRepo.updateItemQuantity(
      basketId,
      productId,
      parseInt(quantity, 10),
      {
        selectedVariant,
        userId: effectiveUserId,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Cart quantity updated in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Update Quantity Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to update item quantity in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// DELETE /api/carts/:basketId (Clears or removes products from the basket in PostgreSQL, status 204)
cartsRouter.delete('/:basketId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { basketId } = req.params;
    const { productId, variant, userId } = req.query;
    const effectiveUserId = req.user?.id || (userId as string);

    if (productId && typeof productId === 'string') {
      await cartRepo.removeItem(
        basketId,
        productId,
        typeof variant === 'string' ? variant : undefined,
        effectiveUserId
      );
      res.status(204).send();
      return;
    }

    // Clear entire basket
    await cartRepo.clearBasket(basketId, effectiveUserId);
    res.status(204).send();
  } catch (error: any) {
    console.error('[Clear Basket Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to clear basket from PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});
