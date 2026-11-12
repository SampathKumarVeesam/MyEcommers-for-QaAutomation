import { Request, Response, Router } from 'express';
import { db } from '../dbStore.js';

export const cartsRouter = Router();

// POST /api/carts (Initializes unique basket object with unique ID, status 201)
cartsRouter.post('/', (req: Request, res: Response): void => {
  const { userId } = req.body || {};
  const basket = db.createBasket(userId);

  res.status(201).json({
    success: true,
    message: 'Basket initialized successfully',
    data: {
      basketId: basket.id,
      basket,
    },
  });
});

// GET /api/carts/:basketId (Returns products currently in the basket and total item count)
cartsRouter.get('/:basketId', (req: Request, res: Response): void => {
  const { basketId } = req.params;
  const basket = db.getBasket(basketId);

  if (!basket) {
    res.status(404).json({
      success: false,
      message: `Basket with ID '${basketId}' not found`,
    });
    return;
  }

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
});

// POST /api/carts/:basketId (Adds/updates product items in the basket, returns "item added or updated" message, status 200)
cartsRouter.post('/:basketId', (req: Request, res: Response): void => {
  const { basketId } = req.params;
  const { productId, quantity = 1, selectedVariant, selectedColor, selectedSize } = req.body || {};

  if (!productId) {
    res.status(400).json({
      success: false,
      message: 'productId is required to add or update item in basket',
    });
    return;
  }

  try {
    const qty = parseInt(quantity, 10);
    const result = db.addOrUpdateBasketItem(basketId, productId, isNaN(qty) ? 1 : qty, {
      selectedVariant,
      selectedColor,
      selectedSize,
    });

    res.status(200).json({
      success: true,
      message: result.message, // "item added or updated"
      data: result.basket,
    });
  } catch (err: any) {
    res.status(404).json({
      success: false,
      message: err.message || 'Error updating basket item',
    });
  }
});

// DELETE /api/carts/:basketId (Clears or removes products from the basket, status 204)
cartsRouter.delete('/:basketId', (req: Request, res: Response): void => {
  const { basketId } = req.params;
  const { productId, variant } = req.query;

  if (productId && typeof productId === 'string') {
    // Specific item removal
    const updatedBasket = db.removeBasketItem(
      basketId,
      productId,
      typeof variant === 'string' ? variant : undefined
    );
    if (!updatedBasket) {
      res.status(404).json({ success: false, message: 'Basket not found' });
      return;
    }
    res.status(204).send();
    return;
  }

  // Clear whole basket
  const cleared = db.clearBasket(basketId);
  if (!cleared) {
    res.status(404).json({
      success: false,
      message: `Basket with ID '${basketId}' not found`,
    });
    return;
  }

  res.status(204).send();
});
