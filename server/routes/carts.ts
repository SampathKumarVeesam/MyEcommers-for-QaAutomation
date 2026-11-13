import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import { cartRepo } from '../repositories/cartRepo.js';

export const cartsRouter = Router();

// POST /api/carts (Initializes unique basket object with unique ID, status 201)
cartsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body || {};
    const basketId = `basket_${crypto.randomUUID().slice(0, 12)}`;
    const basket = await cartRepo.getBasket(basketId);
    basket.userId = userId;

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
    res.status(500).json({ success: false, message: 'Failed to initialize basket' });
  }
});

// GET /api/carts/:basketId (Returns products currently in the basket and total item count)
cartsRouter.get('/:basketId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { basketId } = req.params;
    const basket = await cartRepo.getBasket(basketId);

    res.status(200).json({
      success: true,
      data: {
        basketId: basket.id,
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
    res.status(500).json({ success: false, message: 'Failed to fetch basket from PostgreSQL' });
  }
});

// POST /api/carts/:basketId (Adds/updates product items in the basket, returns "item added or updated" message, status 200)
cartsRouter.post('/:basketId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { basketId } = req.params;
    const { productId, quantity = 1, selectedVariant, selectedColor, selectedSize, storeId, userId } = req.body || {};

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
        userId,
      }
    );

    res.status(200).json({
      success: true,
      message: result.message, // "item added or updated"
      data: result.basket,
    });
  } catch (err: any) {
    console.error('[Update Basket Error]:', err);
    res.status(404).json({
      success: false,
      message: err.message || 'Error updating basket item in PostgreSQL',
    });
  }
});

// DELETE /api/carts/:basketId (Clears or removes products from the basket, status 204)
cartsRouter.delete('/:basketId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { basketId } = req.params;
    const { productId, variant } = req.query;

    if (productId && typeof productId === 'string') {
      await cartRepo.removeItem(
        basketId,
        productId,
        typeof variant === 'string' ? variant : undefined
      );
      res.status(204).send();
      return;
    }

    // Clear entire basket
    await cartRepo.clearBasket(basketId);
    res.status(204).send();
  } catch (error: any) {
    console.error('[Clear Basket Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to clear basket from PostgreSQL' });
  }
});
