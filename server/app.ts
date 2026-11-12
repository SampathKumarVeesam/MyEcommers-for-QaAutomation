import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { db } from './dbStore.js';
import { authRouter } from './routes/auth.js';
import { cartsRouter } from './routes/carts.js';
import { ordersRouter } from './routes/orders.js';
import { productsRouter } from './routes/products.js';
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
    customSiteTitle: 'ShopSphere REST API - Swagger UI Documentation',
  };

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(SWAGGER_SPEC, swaggerCustomOptions));
  app.get('/docs', (_req, res) => res.redirect('/api-docs/'));
  app.get('/swagger', (_req, res) => res.redirect('/api-docs/'));

  // Database Seed Reset
  app.post('/api/seed/reset', (_req, res) => {
    db.resetSeedData();
    res.status(200).json({
      success: true,
      message: 'Database reset to initial seed accounts and product catalog successfully.',
      accounts: {
        admin: 'admin@practicesoftwaretesting.com / welcome01',
        customer1: 'customer@practicesoftwaretesting.com / User01',
        customer2: 'customer2@practicesoftwaretesting.com / User02',
      },
    });
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'ShopSphere API',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

