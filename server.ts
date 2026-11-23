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
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_otp VARCHAR(10);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;
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
          delivery_zone VARCHAR(100) DEFAULT 'Hitech City / Madhapur, Hyderabad',
          is_email_verified BOOLEAN DEFAULT FALSE,
          email_verification_token VARCHAR(255),
          must_change_password BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT TRUE,
          is_logged_in BOOLEAN DEFAULT FALSE,
          last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          fifo_queue_joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          has_pending_cash_deposit BOOLEAN DEFAULT FALSE,
          pending_cash_amount NUMERIC(10,2) DEFAULT 0.00,
          current_lat DOUBLE PRECISION DEFAULT 17.4486,
          current_lng DOUBLE PRECISION DEFAULT 78.3908,
          commission_rate NUMERIC(10,2) DEFAULT 15.00,
          total_earnings NUMERIC(10,2) DEFAULT 0.00,
          delivered_orders_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Idempotently add missing columns to delivery_agents if table was created in an earlier migration
      await query(`
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS fifo_queue_joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS has_pending_cash_deposit BOOLEAN DEFAULT FALSE;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS pending_cash_amount NUMERIC(10,2) DEFAULT 0.00;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION DEFAULT 17.4486;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION DEFAULT 78.3908;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS cash_deposit_status VARCHAR(50) DEFAULT 'NONE';
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS deposit_rejection_reason TEXT;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS reset_password_otp VARCHAR(10);
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;
      `);

      // Ensure persistent notifications table exists for Admin & Delivery Agents
      await query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          recipient_role VARCHAR(50) NOT NULL,
          recipient_id VARCHAR(100),
          order_id VARCHAR(100),
          agent_id VARCHAR(100),
          type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          amount NUMERIC(10,2) DEFAULT 0.00,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_role, recipient_id, is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
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
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS assignment_status VARCHAR(50) DEFAULT 'UNASSIGNED';
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS acceptance_deadline TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS rejected_or_expired_agent_ids JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(50) DEFAULT 'COD';
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS cod_collection_method VARCHAR(50);
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS payment_settlement_status VARCHAR(50) DEFAULT 'PENDING';
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS customer_lat DOUBLE PRECISION DEFAULT 17.4375;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS customer_lng DOUBLE PRECISION DEFAULT 78.4482;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION DEFAULT 17.4375;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION DEFAULT 78.4482;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS agent_lat DOUBLE PRECISION DEFAULT 17.4486;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS agent_lng DOUBLE PRECISION DEFAULT 78.3908;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS order_proceeded_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS estimated_duration_seconds INTEGER DEFAULT 1200;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS is_delayed BOOLEAN DEFAULT FALSE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delay_started_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS extra_delay_seconds INTEGER DEFAULT 0;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS transfer_reason TEXT;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS transferred_from_agent_name VARCHAR(255);
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS transferred_from_agent_id VARCHAR(100);
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS assignment_tier VARCHAR(50) DEFAULT 'IDLE_NEAREST';
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS agent_accepted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS deposit_submitted_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS deposit_rejection_note TEXT;

        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          source VARCHAR(100) DEFAULT 'storefront_footer',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
      `);

      // Run comprehensive idempotent schema migrations
      const { ensureSchemaMigrations } = await import('./server/db/migrations.js');
      await ensureSchemaMigrations();

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
    app.use('*', async (req, res, next) => {
      const cleanUrl = req.originalUrl.split('?')[0];
      if (cleanUrl.startsWith('/api') || cleanUrl.startsWith('/api-docs')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const fs = await import('fs/promises');
        let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const express = (await import('express')).default;
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // 15-second FIFO assignment timeout watcher: checks for expired acceptances and auto-rotates
  setInterval(async () => {
    try {
      const { orderRepo } = await import('./server/repositories/orderRepo.js');
      await orderRepo.checkAndRotateExpiredAssignments();
    } catch {
      // background interval error ignored safely
    }
  }, 15000);

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
