import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { getDbDiagnostics, pool, verifyConnection } from './db/pool.js';
import { runSeed } from './db/seed.js';
import { inventoryRepo } from './repositories/inventoryRepo.js';
import { storeRepo } from './repositories/storeRepo.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { adminAnalyticsRouter } from './routes/adminAnalytics.js';
import { cartsRouter } from './routes/carts.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { wishlistRouter } from './routes/wishlist.js';
import { productRepo } from './repositories/productRepo.js';
import { DOT_WORKFLOW_DEFINITION, SWAGGER_SPEC } from './swaggerDoc.js';

export function createExpressApp() {
  const app = express();

  // CORS Middleware for cross-origin requests from Netlify and other clients
  app.use(cors({
    origin: true, // Dynamically allow request origin (Netlify, localhost, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400,
  }));
  app.options('*', cors());

  // Basic Middlewares
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger for tracing
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api')) {
        const duration = Date.now() - start;
        console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // REST API Routes
  app.use('/api/users', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/admin/analytics', adminAnalyticsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/cart', cartsRouter);
  app.use('/api/carts', cartsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/wishlist', wishlistRouter);

  // Auth direct route aliases
  app.post('/api/logout', (req, res, next) => authRouter(req, res, next));
  app.post('/api/register', (req, res, next) => authRouter(req, res, next));
  app.post('/api/login', (req, res, next) => authRouter(req, res, next));

  // Category Taxonomy Endpoint
  app.get('/api/categories', (_req, res) => {
    res.status(200).json({
      success: true,
      data: [
        { id: 'fashion', name: 'Fashion & Apparel', slug: 'fashion', icon: 'shirt', subcategories: ['Men', 'Women', 'Footwear', 'Accessories'] },
        { id: 'electronics', name: 'Electronics & Gadgets', slug: 'electronics', icon: 'laptop', subcategories: ['Smartphones', 'Audio', 'Laptops', 'Wearables'] },
        { id: 'audio', name: 'Audio & Acoustics', slug: 'audio', icon: 'headphones', subcategories: ['Headphones', 'Earbuds', 'Speakers', 'Microphones'] },
        { id: 'beauty', name: 'Beauty & Personal Care', slug: 'beauty', icon: 'sparkles', subcategories: ['Skincare', 'Fragrances', 'Haircare', 'Makeup'] },
        { id: 'home', name: 'Home & Living', slug: 'home', icon: 'home', subcategories: ['Decor', 'Kitchen', 'Bedding', 'Lighting'] },
      ],
    });
  });

  // Direct Review Endpoints (PUT & DELETE by review ID)
  app.put('/api/reviews/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body || {};
      const updated = await productRepo.updateReview(id, {
        rating: rating !== undefined ? parseInt(rating, 10) : undefined,
        comment,
      });
      if (!updated) {
        res.status(404).json({ success: false, message: `Review with ID '${id}' not found in PostgreSQL` });
        return;
      }
      res.status(200).json({ success: true, message: 'Review updated successfully', data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to update review: ${err.message}` });
    }
  });

  app.delete('/api/reviews/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await productRepo.deleteReview(id);
      if (!deleted) {
        res.status(404).json({ success: false, message: `Review with ID '${id}' not found in PostgreSQL` });
        return;
      }
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to delete review: ${err.message}` });
    }
  });

  // Store & Inventory Relational Endpoints
  app.get('/api/stores', async (_req, res) => {
    try {
      const stores = await storeRepo.getAllStores();
      res.status(200).json({ success: true, data: stores });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to retrieve stores: ${err.message}` });
    }
  });

  app.get('/api/inventory/:productId', async (req, res) => {
    try {
      const items = await inventoryRepo.getInventoryByProduct(req.params.productId);
      res.status(200).json({ success: true, data: items });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to retrieve inventory: ${err.message}` });
    }
  });

  // Adjust stock in PostgreSQL inventory
  app.put('/api/inventory/:productId', async (req, res) => {
    try {
      const { productId } = req.params;
      const { storeId = 1, stock } = req.body || {};
      if (stock === undefined) {
        res.status(400).json({ success: false, message: 'stock quantity is required' });
        return;
      }
      await inventoryRepo.setStock(productId, Number(storeId), parseInt(stock, 10));
      const updated = await inventoryRepo.getInventoryByProduct(productId);
      res.status(200).json({
        success: true,
        message: 'Inventory stock updated successfully in PostgreSQL',
        data: updated,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: `Failed to update inventory: ${err.message}` });
    }
  });

  // OpenAPI Swagger Specification & DOT Workflow Graph
  app.get('/api/swagger.json', (_req, res) => {
    res.json(SWAGGER_SPEC);
  });

  app.get('/api/dot-flow', (_req, res) => {
    res.json({
      success: true,
      dot: DOT_WORKFLOW_DEFINITION,
    });
  });

  // Dedicated Swagger UI documentation for backend endpoint testing
  const swaggerCustomOptions = {
    customCss: `
      .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #3b82f6; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 28px; color: #0f172a; }
    `,
    customSiteTitle: 'ShopSphere REST API - Swagger UI Documentation (PostgreSQL 18)',
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(SWAGGER_SPEC, swaggerCustomOptions));
  app.get('/', (_req, res) => res.redirect('/api-docs/'));
  app.get('/docs', (_req, res) => res.redirect('/api-docs/'));
  app.get('/swagger', (_req, res) => res.redirect('/api-docs/'));

  // Database Seed Reset (Ensures Admin and QA accounts are restored)
  app.post('/api/seed/reset', async (_req, res) => {
    try {
      const { userRepo } = await import('./repositories/userRepo.js');
      await userRepo.ensureSeedUsers();
      res.status(200).json({
        success: true,
        message: 'PostgreSQL 18 default admin and QA accounts verified and restored.',
        accounts: {
          admin: 'admin (or admin@practicesoftwaretesting.com) / Sampath@123',
          customer1: 'customer@practicesoftwaretesting.com / User01',
          customer2: 'customer2@practicesoftwaretesting.com / User02',
        },
      });
    } catch (err: any) {
      console.error('[Seed Reset Error]:', err);
      res.status(500).json({ success: false, message: 'Failed to reset PostgreSQL database', error: err.message });
    }
  });

  // Health check with real-time PostgreSQL connection diagnostics
  app.get('/api/health', async (_req, res) => {
    const isDbConnected = await verifyConnection(1, 0);
    const diagnostics = getDbDiagnostics();
    res.status(isDbConnected ? 200 : 503).json({
      status: isDbConnected ? 'healthy' : 'database_unreachable',
      app: 'ShopSphere API',
      database: 'PostgreSQL 18 (DataBase_for_SamEcommers)',
      diagnostics,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
