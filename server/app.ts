import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { pool, verifyConnection } from './db/pool.js';
import { runSeed } from './db/seed.js';
import { inventoryRepo } from './repositories/inventoryRepo.js';
import { storeRepo } from './repositories/storeRepo.js';
import { authRouter } from './routes/auth.js';
import { cartsRouter } from './routes/carts.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
import { wishlistRouter } from './routes/wishlist.js';
import { DOT_WORKFLOW_DEFINITION, SWAGGER_SPEC } from './swaggerDoc.js';

export function createExpressApp() {
  const app = express();

  // CORS Middleware for cross-origin requests from Netlify and other clients
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'accept'],
  }));

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
  app.use('/api/products', productsRouter);
  app.use('/api/carts', cartsRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/wishlist', wishlistRouter);

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
  app.get('/docs', (_req, res) => res.redirect('/api-docs/'));
  app.get('/swagger', (_req, res) => res.redirect('/api-docs/'));

  // Database Seed Reset (Runs DDL schema and re-populates PostgreSQL 18)
  app.post('/api/seed/reset', async (_req, res) => {
    try {
      await runSeed();
      res.status(200).json({
        success: true,
        message: 'PostgreSQL 18 database (DataBase_for_SamEcommers) successfully reset and re-seeded.',
        accounts: {
          admin: 'admin@practicesoftwaretesting.com / welcome01',
          customer1: 'customer@practicesoftwaretesting.com / User01',
          customer2: 'customer2@practicesoftwaretesting.com / User02',
        },
      });
    } catch (err: any) {
      console.error('[Seed Reset Error]:', err);
      res.status(500).json({ success: false, message: 'Failed to reset PostgreSQL database', error: err.message });
    }
  });

  // Health check
  app.get('/api/health', async (_req, res) => {
    const isDbConnected = await verifyConnection();
    res.json({
      status: isDbConnected ? 'healthy' : 'database_unreachable',
      app: 'ShopSphere API',
      database: 'PostgreSQL 18 (DataBase_for_SamEcommers)',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
