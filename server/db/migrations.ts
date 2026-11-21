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
