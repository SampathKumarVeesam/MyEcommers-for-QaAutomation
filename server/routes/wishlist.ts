import { Request, Response, Router } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { wishlistRepo } from '../repositories/wishlistRepo.js';

export const wishlistRouter = Router();

// GET /api/wishlist (Fetch user wishlist directly from PostgreSQL)
wishlistRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const items = await wishlistRepo.getWishlistByUser(userId);
    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error: any) {
    console.error('[Get Wishlist Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve wishlist from PostgreSQL',
    });
  }
});

// POST /api/wishlist (Add product to user's wishlist in PostgreSQL)
wishlistRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.body || {};

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!productId) {
      res.status(400).json({ success: false, message: 'productId is required' });
      return;
    }

    await wishlistRepo.addToWishlist(userId, productId);
    const updated = await wishlistRepo.getWishlistByUser(userId);

    res.status(200).json({
      success: true,
      message: 'Product added to wishlist in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Add Wishlist Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add item to wishlist in PostgreSQL',
    });
  }
});

// DELETE /api/wishlist/:productId (Remove product from user's wishlist in PostgreSQL)
wishlistRouter.delete('/:productId', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await wishlistRepo.removeFromWishlist(userId, productId);
    const updated = await wishlistRepo.getWishlistByUser(userId);

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Remove Wishlist Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove item from wishlist in PostgreSQL',
    });
  }
});

// DELETE /api/wishlist (Clear user's entire wishlist in PostgreSQL)
wishlistRouter.delete('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    await wishlistRepo.clearWishlist(userId);
    res.status(200).json({
      success: true,
      message: 'Wishlist cleared in PostgreSQL',
      data: [],
    });
  } catch (error: any) {
    console.error('[Clear Wishlist Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear wishlist in PostgreSQL',
    });
  }
});

