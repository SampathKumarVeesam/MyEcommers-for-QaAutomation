import { Request, Response, Router } from 'express';
import crypto from 'node:crypto';
import { Product } from '../../src/types.js';
import { db } from '../dbStore.js';
import { requireAdmin } from '../middleware/auth.js';

export const productsRouter = Router();

// GET /api/products?category=mobiles&page=1
productsRouter.get('/', (req: Request, res: Response): void => {
  const { category, search, minPrice, maxPrice, sort, page, limit } = req.query;

  const result = db.getProducts({
    category: typeof category === 'string' ? category : undefined,
    search: typeof search === 'string' ? search : undefined,
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    sort: typeof sort === 'string' ? sort : undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 12,
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
});

// GET /api/products/:id
productsRouter.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const product = db.getProductById(id);

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
});

// POST /api/products (Admin only)
productsRouter.post('/', requireAdmin, (req: Request, res: Response): void => {
  const body = req.body;
  if (!body.title || !body.price || !body.category) {
    res.status(400).json({
      success: false,
      message: 'Title, price, and category are required',
    });
    return;
  }

  const newProduct: Product = {
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
  };

  const created = db.createProduct(newProduct);
  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: created,
  });
});

// PUT /api/products/:id (Admin only)
productsRouter.put('/:id', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const updated = db.updateProduct(id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }
  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: updated,
  });
});

// DELETE /api/products/:id (Admin only)
productsRouter.delete('/:id', requireAdmin, (req: Request, res: Response): void => {
  const { id } = req.params;
  const deleted = db.deleteProduct(id);
  if (!deleted) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }
  res.status(204).send();
});

// GET /api/products/:id/reviews
productsRouter.get('/:id/reviews', (req: Request, res: Response): void => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }
  const reviews = db.getReviewsForProduct(id);
  res.status(200).json({
    success: true,
    data: reviews,
  });
});

// POST /api/products/:id/reviews
productsRouter.post('/:id/reviews', (req: Request, res: Response): void => {
  const { id } = req.params;
  const product = db.getProductById(id);
  if (!product) {
    res.status(404).json({ success: false, message: 'Product not found' });
    return;
  }

  const { userName, rating, comment } = req.body;
  if (!userName || !rating || !comment) {
    res.status(400).json({
      success: false,
      message: 'userName, rating (1-5), and comment are required',
    });
    return;
  }

  const newReview = db.addReview({
    id: `rev_${crypto.randomUUID().slice(0, 8)}`,
    productId: id,
    userName: userName.trim(),
    rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
    verifiedPurchase: true,
  });

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully',
    data: newReview,
    updatedProduct: db.getProductById(id),
  });
});
