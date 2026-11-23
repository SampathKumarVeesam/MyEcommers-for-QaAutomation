import { query } from './pool.js';

let migrationsDone = false;
let migrationsRunning: Promise<void> | null = null;

export async function ensureSchemaMigrations(): Promise<void> {
  if (migrationsDone) return;
  if (migrationsRunning) return migrationsRunning;

  migrationsRunning = (async () => {
    // Helper to run migration queries safely without failing the whole process
    const safeExec = async (sql: string, label: string) => {
      try {
        await query(sql);
      } catch (err: any) {
        console.warn(`[Migration Warning] ${label}:`, err.message);
      }
    };

    try {
      // 1. Ensure users table columns exist
      await safeExec(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50) DEFAULT 'prefer_not_to_say';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_otp VARCHAR(10);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_verified BOOLEAN DEFAULT FALSE;
      `, 'users columns');

      // 2. Ensure delivery_agents table exists
      await safeExec(`
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
          cash_deposit_status VARCHAR(50) DEFAULT 'NONE',
          deposit_rejection_reason TEXT,
          reset_password_otp VARCHAR(10),
          reset_password_token VARCHAR(255),
          reset_password_expires_at TIMESTAMP WITH TIME ZONE
        );
      `, 'delivery_agents table');

      // 3. Ensure delivery_agents columns exist
      await safeExec(`
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
      `, 'delivery_agents columns');

      // 4. Ensure order table columns exist (including emergency transfer & live routing fields)
      await safeExec(`
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
      `, 'order columns');

      // 5. Ensure order_transfers table exists
      await safeExec(`
        CREATE TABLE IF NOT EXISTS order_transfers (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
          from_agent_id VARCHAR(100),
          to_agent_id VARCHAR(100),
          assignment_tier VARCHAR(50) DEFAULT 'IDLE_NEAREST',
          transfer_reason TEXT NOT NULL,
          handoff_lat DOUBLE PRECISION,
          handoff_lng DOUBLE PRECISION,
          transferred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        ALTER TABLE order_transfers ADD COLUMN IF NOT EXISTS assignment_tier VARCHAR(50) DEFAULT 'IDLE_NEAREST';
      `, 'order_transfers table');

      // 6. Ensure agent_contact_logs table exists
      await safeExec(`
        CREATE TABLE IF NOT EXISTS agent_contact_logs (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES "order"(id) ON DELETE CASCADE,
          customer_id VARCHAR(100),
          agent_id VARCHAR(100),
          contact_channel VARCHAR(20) NOT NULL,
          contacted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `, 'agent_contact_logs table');

      // 7. Ensure notifications table exists
      await safeExec(`
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
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100);
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB;
      `, 'notifications table');

      // 8. Newsletter Subscribers table
      await safeExec(`
        CREATE TABLE IF NOT EXISTS newsletter_subscribers (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          source VARCHAR(100) DEFAULT 'storefront_footer',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
      `, 'newsletter_subscribers table');

      // 9. Fix any legacy or default coordinates for orders with Tellapur/Osman Nagar/BHEL
      await safeExec(`
        UPDATE "order"
        SET customer_lat = 17.4816, customer_lng = 78.2917, delivery_lat = 17.4816, delivery_lng = 78.2917
        WHERE (LOWER(COALESCE(address_line_1, '')) LIKE '%tellapur%' 
            OR LOWER(COALESCE(address_line_1, '')) LIKE '%osman%' 
            OR LOWER(COALESCE(address_line_1, '')) LIKE '%bhel%'
            OR LOWER(COALESCE(address_city, '')) LIKE '%tellapur%' 
            OR LOWER(COALESCE(address_city, '')) LIKE '%osman%' 
            OR LOWER(COALESCE(address_city, '')) LIKE '%bhel%');
      `, 'Tellapur/Osman Nagar/BHEL coordinates fix');

      migrationsDone = true;
    } catch (err: any) {
      console.warn('[Schema Migrations Critical Error]:', err.message);
    } finally {
      migrationsRunning = null;
    }
  })();

  return migrationsRunning;
}
