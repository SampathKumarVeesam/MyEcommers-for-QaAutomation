import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import { requireAdmin } from '../middleware/auth.js';
import { productRepo } from '../repositories/productRepo.js';

export const productsRouter = Router();

// GET /api/products
productsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, minPrice, maxPrice, sort, page, limit, storeId } = req.query;

    const result = await productRepo.getProducts({
      category: typeof category === 'string' ? category : undefined,
      search: typeof search === 'string' ? search : undefined,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      sort: typeof sort === 'string' ? sort : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 12,
      storeId: storeId ? parseInt(storeId as string, 10) : undefined,
    });

    res.status(200).json({
      success: true,
      data: result.products,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limit ? parseInt(limit as string, 10) : 12,
      },
    });
  } catch (error: any) {
    console.error('[Get Products Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve products from PostgreSQL' });
  }
});

// GET /api/products/:id
productsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productRepo.getProductById(id);

    if (!product) {
      res.status(404).json({
        success: false,
        message: `Product with ID '${id}' not found`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error('[Get Product Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product from database' });
  }
});

// POST /api/products (Admin only)
productsRouter.post('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body;
    if (!body.title || !body.price || !body.category) {
      res.status(400).json({
        success: false,
        message: 'Title, price, and category are required',
      });
      return;
    }

    const newProduct = await productRepo.createProduct({
      id: `prod_${crypto.randomUUID().slice(0, 8)}`,
      title: body.title,
      slug: body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      category: body.category,
      subcategory: body.subcategory || 'General',
      price: parseFloat(body.price),
      compareAtPrice: body.compareAtPrice ? parseFloat(body.compareAtPrice) : undefined,
      stock: parseInt(body.stock || '10', 10),
      rating: parseFloat(body.rating || '4.5'),
      reviewsCount: parseInt(body.reviewsCount || '1', 10),
      images: body.images?.length ? body.images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'],
      description: body.description || '',
      tags: body.tags || [],
      specifications: body.specifications || {},
      featured: Boolean(body.featured),
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully in PostgreSQL',
      data: newProduct,
    });
  } catch (error: any) {
    console.error('[Create Product Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to create product in PostgreSQL' });
  }
});

// PUT /api/products/:id (Admin only)
productsRouter.put('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await productRepo.updateProduct(id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: 'Product updated successfully in PostgreSQL',
      data: updated,
    });
  } catch (error: any) {
    console.error('[Update Product Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /api/products/:id (Admin only)
productsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deleted = await productRepo.deleteProduct(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.status(204).send();
  } catch (error: any) {
    console.error('[Delete Product Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

// GET /api/products/:id/reviews
productsRouter.get('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productRepo.getProductById(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    const reviews = await productRepo.getReviewsForProduct(id);
    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    console.error('[Get Reviews Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

// POST /api/products/:id/reviews
productsRouter.post('/:id/reviews', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await productRepo.getProductById(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const { userName, rating, comment, userEmail } = req.body;
    if (!userName || !rating || !comment) {
      res.status(400).json({
        success: false,
        message: 'userName, rating (1-5), and comment are required',
      });
      return;
    }

    const newReview = await productRepo.addReview(id, {
      userName: userName.trim(),
      userEmail: userEmail ? userEmail.trim() : undefined,
      rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
      comment: comment.trim(),
    });

    const updatedProduct = await productRepo.getProductById(id);

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and saved to PostgreSQL',
      data: newReview,
      updatedProduct,
    });
  } catch (error: any) {
    console.error('[Add Review Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to save review in database' });
  }
});
