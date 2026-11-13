import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyConnection } from './server/db/pool.js';
import { createExpressApp } from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  console.log('🔄 Checking PostgreSQL 18 connection...');
  const connected = await verifyConnection();

  if (connected) {
    try {
      const { query } = await import('./server/db/pool.js');
      const tableCheck = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'product'
        );
      `);

      if (!tableCheck.rows[0]?.exists) {
        console.log('🌱 Schema tables not found. Automatically running schema creation and seed...');
        const { runSeed } = await import('./server/db/seed.js');
        await runSeed();
      } else {
        const prodCount = await query('SELECT COUNT(*) AS count FROM product');
        const userCount = await query('SELECT COUNT(*) AS count FROM users');
        if (parseInt(prodCount.rows[0]?.count || '0', 10) === 0 || parseInt(userCount.rows[0]?.count || '0', 10) === 0) {
          console.log('🌱 Database is empty. Automatically populating ShopSphere catalog & QA users...');
          const { runSeed } = await import('./server/db/seed.js');
          await runSeed();
        }
      }
    } catch (seedErr: any) {
      console.warn('⚠️ Auto-seed initialization notice:', seedErr.message);
    }
  }

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
