import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import { AuthenticatedRequest, optionalAuth } from '../middleware/auth.js';
import { cartRepo } from '../repositories/cartRepo.js';

export const cartsRouter = Router();

// GET /api/cart or /api/carts (Fetch cart for current user or basket)
cartsRouter.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const basketId = (req.query.basketId as string) || (req.headers['x-basket-id'] as string);

    if (userId) {
      const basket = await cartRepo.getUserCart(userId);
      res.status(200).json({ success: true, data: basket });
      return;
    }
    if (basketId) {
      const basket = await cartRepo.getBasket(basketId);
      res.status(200).json({ success: true, data: basket });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: 'empty',
        userId: undefined,
        items: [],
        totalItemCount: 0,
        subtotal: 0,
        estimatedTax: 0,
        shippingFee: 0,
        grandTotal: 0,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch cart' });
  }
});

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

// POST /api/cart & /api/carts (Add item or initialize unique basket object)
cartsRouter.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || req.body?.userId;
    const { productId, quantity = 1, selectedVariant, selectedColor, selectedSize, storeId, basketId: reqBasketId } = req.body || {};

    // If productId is provided, treat as AddToCart
    if (productId) {
      const basketId = reqBasketId || (req.headers['x-basket-id'] as string) || `basket_${crypto.randomUUID().slice(0, 12)}`;
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
          userId,
        }
      );

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.basket,
      });
      return;
    }

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

// PATCH /api/cart/:itemId or /api/carts/:itemId (Update item quantity directly by itemId)
cartsRouter.patch('/:itemId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { quantity, selectedVariant, userId, basketId: reqBasketId } = req.body || {};
    const effectiveUserId = req.user?.id || userId;
    let basketId = reqBasketId || (req.headers['x-basket-id'] as string);

    if (!basketId && effectiveUserId) {
      const userBasket = await cartRepo.getUserCart(effectiveUserId);
      basketId = userBasket.id;
    }

    if (!basketId) {
      res.status(400).json({ success: false, message: 'basketId or user authentication is required' });
      return;
    }

    if (quantity === undefined) {
      res.status(400).json({ success: false, message: 'quantity is required' });
      return;
    }

    const updated = await cartRepo.updateItemQuantity(
      basketId,
      itemId,
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
    res.status(500).json({
      success: false,
      message: `Failed to update item quantity in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// DELETE /api/cart & /api/carts (Clears customer cart)
cartsRouter.delete('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const effectiveUserId = req.user?.id || req.body?.userId || (req.query.userId as string);
    const basketId = req.body?.basketId || (req.query.basketId as string) || (req.headers['x-basket-id'] as string);

    if (basketId) {
      await cartRepo.clearBasket(basketId, effectiveUserId);
    } else if (effectiveUserId) {
      const userBasket = await cartRepo.getUserCart(effectiveUserId);
      if (userBasket?.id) {
        await cartRepo.clearBasket(userBasket.id, effectiveUserId);
      }
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('[Clear Cart Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to clear cart in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});

// DELETE /api/cart/:itemId or /api/carts/:basketId (Removes item or clears basket)
cartsRouter.delete('/:identifier', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    const { productId, variant, userId, basketId } = req.query;
    const effectiveUserId = req.user?.id || (userId as string);

    if (identifier.startsWith('basket_')) {
      if (productId && typeof productId === 'string') {
        await cartRepo.removeItem(
          identifier,
          productId,
          typeof variant === 'string' ? variant : undefined,
          effectiveUserId
        );
        res.status(204).send();
        return;
      }
      await cartRepo.clearBasket(identifier, effectiveUserId);
      res.status(204).send();
      return;
    }

    // Treat identifier as productId / itemId (e.g. DELETE /api/cart/:itemId)
    let targetBasket = (basketId as string) || req.body?.basketId || (req.headers['x-basket-id'] as string);
    if (!targetBasket && effectiveUserId) {
      const userBasket = await cartRepo.getUserCart(effectiveUserId);
      targetBasket = userBasket.id;
    }

    if (targetBasket) {
      await cartRepo.removeItem(
        targetBasket,
        identifier,
        typeof variant === 'string' ? variant : undefined,
        effectiveUserId
      );
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('[Remove Cart Item Error]:', error);
    res.status(500).json({
      success: false,
      message: `Failed to remove item from cart in PostgreSQL: ${error.message || 'Database error'}`,
    });
  }
});
