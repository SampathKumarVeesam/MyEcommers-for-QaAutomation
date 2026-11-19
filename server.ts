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
      // Ensure OAuth provider & profile columns exist on users table
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50) DEFAULT 'prefer_not_to_say';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
      `);

      // Ensure delivery_agents table exists
      await query(`
        CREATE TABLE IF NOT EXISTS delivery_agents (
          id VARCHAR(100) PRIMARY KEY,
          agent_code VARCHAR(50) UNIQUE,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          gender VARCHAR(50) DEFAULT 'prefer_not_to_say',
          avatar_url TEXT,
          role VARCHAR(50) DEFAULT 'delivery_agent',
          vehicle_type VARCHAR(100) DEFAULT 'Motorcycle',
          delivery_zone VARCHAR(100) DEFAULT 'North Zone',
          is_email_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255),
          must_change_password BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT TRUE,
          commission_rate NUMERIC(10,2) DEFAULT 15.00,
          total_earnings NUMERIC(10,2) DEFAULT 0.00,
          delivered_orders_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Ensure order table columns for delivery agent, COD and feedback scheduler exist
      await query(`
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS assigned_agent_id VARCHAR(100);
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC(10,2) DEFAULT 15.00;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS cod_payment_method VARCHAR(50);
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS cod_payment_status VARCHAR(50) DEFAULT 'pending';
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10);
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS feedback_status VARCHAR(50) DEFAULT 'pending';
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS next_feedback_reminder_at TIMESTAMP WITH TIME ZONE;
      `);

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
        const userCount = await query('SELECT COUNT(*) AS count FROM users');
        if (parseInt(userCount.rows[0]?.count || '0', 10) === 0) {
          console.log('🌱 Database users empty. Automatically restoring default admin and QA accounts...');
          const { userRepo } = await import('./server/repositories/userRepo.js');
          await userRepo.ensureSeedUsers();
        }

        const agentCount = await query('SELECT COUNT(*) AS count FROM delivery_agents');
        if (parseInt(agentCount.rows[0]?.count || '0', 10) === 0) {
          console.log('🛵 Restoring default active delivery agent for auto-assignment...');
          const { agentRepo } = await import('./server/repositories/agentRepo.js');
          await agentRepo.ensureSeedAgent();
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
