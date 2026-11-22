import { query } from './pool.js';

let migrationsDone = false;
let migrationsRunning: Promise<void> | null = null;

export async function ensureSchemaMigrations(): Promise<void> {
  if (migrationsDone) return;
  if (migrationsRunning) return migrationsRunning;

  migrationsRunning = (async () => {
    try {
      await query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50) DEFAULT 'prefer_not_to_say';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_otp VARCHAR(10);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP WITH TIME ZONE;

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

        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS customer_lat DOUBLE PRECISION DEFAULT 17.4375;
        ALTER TABLE "order" ADD COLUMN IF NOT EXISTS customer_lng DOUBLE PRECISION DEFAULT 78.4482;
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

        CREATE TABLE IF NOT EXISTS order_transfers (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
          from_agent_id VARCHAR(100) REFERENCES delivery_agents(id) ON DELETE SET NULL,
          to_agent_id VARCHAR(100) REFERENCES delivery_agents(id) ON DELETE SET NULL,
          transfer_reason TEXT NOT NULL,
          handoff_lat DOUBLE PRECISION,
          handoff_lng DOUBLE PRECISION,
          transferred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Fix any legacy or default coordinates for orders with specific Hyderabad localities (e.g. Tellapur/Osman Nagar/BHEL)
        UPDATE "order"
        SET customer_lat = 17.4816, customer_lng = 78.2917, delivery_lat = 17.4816, delivery_lng = 78.2917
        WHERE (LOWER(COALESCE(address_line_1, '')) LIKE '%tellapur%' 
            OR LOWER(COALESCE(address_line_1, '')) LIKE '%osman%' 
            OR LOWER(COALESCE(address_line_1, '')) LIKE '%bhel%'
            OR LOWER(COALESCE(address_city, '')) LIKE '%tellapur%' 
            OR LOWER(COALESCE(address_city, '')) LIKE '%osman%' 
            OR LOWER(COALESCE(address_city, '')) LIKE '%bhel%')
          AND (customer_lat IS NULL OR ABS(customer_lat - 17.4375) < 0.01 OR ABS(customer_lat - 17.4156) < 0.01);
      `);
      migrationsDone = true;
    } catch (err: any) {
      console.warn('[Schema Migrations Warning]:', err.message);
    } finally {
      migrationsRunning = null;
    }
  })();

  return migrationsRunning;
}
