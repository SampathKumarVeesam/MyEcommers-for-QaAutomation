-- ============================================================================
-- ShopSphere PostgreSQL 18 Database Schema (DataBase_for_SamEcommers)
-- Relational Schema: 7 Core Tables + Product Reviews & Inventory
-- ============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_code VARCHAR(64) UNIQUE,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  phone VARCHAR(50),
  avatar TEXT,
  avatar_url TEXT,
  gender VARCHAR(50) DEFAULT 'prefer_not_to_say',
  address_line_1 TEXT,
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(50),
  address_country VARCHAR(100),
  reset_password_otp VARCHAR(10),
  reset_password_token VARCHAR(255),
  reset_password_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCT TABLE
CREATE TABLE IF NOT EXISTS product (
  id SERIAL PRIMARY KEY,
  product_code VARCHAR(64) UNIQUE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  description TEXT,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  rating NUMERIC(3,2) DEFAULT 4.50,
  reviews_count INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 10,
  tags JSONB DEFAULT '[]'::jsonb,
  specifications JSONB DEFAULT '{}'::jsonb,
  color_options JSONB DEFAULT '[]'::jsonb,
  size_options JSONB DEFAULT '[]'::jsonb,
  scent_notes JSONB DEFAULT '{}'::jsonb,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. STORE TABLE
CREATE TABLE IF NOT EXISTS store (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  address TEXT NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INVENTORY TABLE (Composite PK: product_id + store_id)
CREATE TABLE IF NOT EXISTS inventory (
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  stock_available INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, store_id)
);

-- 5. CART TABLE
CREATE TABLE IF NOT EXISTS cart (
  id SERIAL PRIMARY KEY,
  basket_id VARCHAR(100) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES store(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  selected_options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. "ORDER" TABLE (Quoted Identifier)
CREATE TABLE IF NOT EXISTS "order" (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(100) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  basket_id VARCHAR(100),
  tracking_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'processing',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  shipping_method VARCHAR(50) DEFAULT 'standard',
  payment_method VARCHAR(50) DEFAULT 'credit_card',
  payment_status VARCHAR(50) DEFAULT 'paid',
  address_line_1 TEXT,
  address_postal_code VARCHAR(50),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_country VARCHAR(100),
  assigned_agent_id VARCHAR(100),
  delivery_fee NUMERIC(10,2) DEFAULT 15.00,
  cod_payment_method VARCHAR(50),
  cod_payment_status VARCHAR(50) DEFAULT 'pending',
  delivery_otp VARCHAR(10),
  otp_verified BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  feedback_status VARCHAR(50) DEFAULT 'pending',
  next_feedback_reminder_at TIMESTAMP WITH TIME ZONE,
  assignment_status VARCHAR(50) DEFAULT 'UNASSIGNED',
  assigned_at TIMESTAMP WITH TIME ZONE,
  acceptance_deadline TIMESTAMP WITH TIME ZONE,
  rejected_or_expired_agent_ids JSONB DEFAULT '[]'::jsonb,
  payment_mode VARCHAR(50) DEFAULT 'COD',
  cod_collection_method VARCHAR(50),
  payment_settlement_status VARCHAR(50) DEFAULT 'PENDING',
  delivery_lat DOUBLE PRECISION DEFAULT 17.4375,
  delivery_lng DOUBLE PRECISION DEFAULT 78.4482,
  customer_lat DOUBLE PRECISION DEFAULT 17.4375,
  customer_lng DOUBLE PRECISION DEFAULT 78.4482,
  agent_lat DOUBLE PRECISION DEFAULT 17.4486,
  agent_lng DOUBLE PRECISION DEFAULT 78.3908,
  location_updated_at TIMESTAMP WITH TIME ZONE,
  order_proceeded_at TIMESTAMP WITH TIME ZONE,
  estimated_duration_seconds INTEGER DEFAULT 1200,
  estimated_delivery_at TIMESTAMP WITH TIME ZONE,
  is_delayed BOOLEAN DEFAULT FALSE,
  delay_started_at TIMESTAMP WITH TIME ZONE,
  extra_delay_seconds INTEGER DEFAULT 0,
  transfer_reason TEXT,
  transferred_from_agent_name VARCHAR(255),
  transferred_from_agent_id VARCHAR(100),
  assignment_tier VARCHAR(50) DEFAULT 'IDLE_NEAREST',
  deposit_submitted_at TIMESTAMP WITH TIME ZONE,
  deposit_verified_at TIMESTAMP WITH TIME ZONE,
  deposit_rejection_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6b. DELIVERY_AGENTS TABLE
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
  cash_deposit_status VARCHAR(50) DEFAULT 'NONE',
  deposit_rejection_reason TEXT,
  current_lat DOUBLE PRECISION DEFAULT 17.4486,
  current_lng DOUBLE PRECISION DEFAULT 78.3908,
  commission_rate NUMERIC(10,2) DEFAULT 15.00,
  total_earnings NUMERIC(10,2) DEFAULT 0.00,
  delivered_orders_count INTEGER DEFAULT 0,
  reset_password_otp VARCHAR(10),
  reset_password_token VARCHAR(255),
  reset_password_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6c. NOTIFICATIONS TABLE (Admin & Delivery Agent Real-Time Alerts)
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

-- 6d. ORDER_TRANSFERS TABLE (Emergency Agent Handoff Audit)
CREATE TABLE IF NOT EXISTS order_transfers (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  from_agent_id VARCHAR(100) REFERENCES delivery_agents(id) ON DELETE SET NULL,
  to_agent_id VARCHAR(100) REFERENCES delivery_agents(id) ON DELETE SET NULL,
  assignment_tier VARCHAR(50) DEFAULT 'IDLE_NEAREST',
  transfer_reason TEXT NOT NULL,
  handoff_lat DOUBLE PRECISION,
  handoff_lng DOUBLE PRECISION,
  transferred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6e. AGENT_CONTACT_LOGS TABLE (Customer-to-Agent Contact Audit)
CREATE TABLE IF NOT EXISTS agent_contact_logs (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES "order"(id) ON DELETE CASCADE,
  customer_id VARCHAR(100),
  agent_id VARCHAR(100) REFERENCES delivery_agents(id) ON DELETE SET NULL,
  contact_channel VARCHAR(20) NOT NULL,
  contacted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ORDER_ITEM TABLE
CREATE TABLE IF NOT EXISTS order_item (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES product(id),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  selected_variant VARCHAR(255),
  selected_color VARCHAR(100),
  selected_size VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. PRODUCT_REVIEWS TABLE (PDP Reviews Engine)
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  review_code VARCHAR(64) UNIQUE,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  verified_purchase BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. WISHLIST TABLE (PostgreSQL Persistent Customer Wishlist)
CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- 9. NEWSLETTER SUBSCRIBERS TABLE
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(100) DEFAULT 'storefront_footer',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-throughput queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_product_category ON product(category);
CREATE INDEX IF NOT EXISTS idx_product_subcategory ON product(subcategory);
CREATE INDEX IF NOT EXISTS idx_product_code ON product(product_code);
CREATE INDEX IF NOT EXISTS idx_cart_basket_id ON cart(basket_id);
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_order_user_id ON "order"(user_id);
CREATE INDEX IF NOT EXISTS idx_order_number ON "order"(order_number);
CREATE INDEX IF NOT EXISTS idx_order_assigned_agent ON "order"(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_email ON delivery_agents(email);
CREATE INDEX IF NOT EXISTS idx_delivery_agents_active ON delivery_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON order_item(order_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_role, recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
