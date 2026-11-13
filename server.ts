import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyConnection } from './server/db/pool.js';
import { createExpressApp } from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('🔄 Checking PostgreSQL 18 connection...');
  await verifyConnection();

  const app = createExpressApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Vite Integration for local development and static SPA serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const express = (await import('express')).default;
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ShopSphere PostgreSQL Full-Stack App running at http://localhost:${PORT}`);
    console.log(`📑 PostgreSQL Swagger UI Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`🗄️ Database: PostgreSQL 18 on port 5433 (DataBase_for_SamEcommers)`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
