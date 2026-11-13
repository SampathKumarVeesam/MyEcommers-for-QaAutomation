-- ============================================================================
-- ShopSphere PostgreSQL 18 Database Schema (DataBase_for_SamEcommers)
-- Relational Schema: 7 Core Tables + Product Reviews & Inventory
-- ============================================================================

-- Drop tables if re-initializing (in reverse dependency order)
DROP TABLE IF EXISTS wishlist CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS order_item CASCADE;
DROP TABLE IF EXISTS "order" CASCADE;
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS store CASCADE;
DROP TABLE IF EXISTS product CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_code VARCHAR(64) UNIQUE,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
  phone VARCHAR(50),
  avatar TEXT,
  address_line_1 TEXT,
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(50),
  address_country VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCT TABLE
CREATE TABLE product (
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
CREATE TABLE store (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INVENTORY TABLE (Composite PK: product_id + store_id)
CREATE TABLE inventory (
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES store(id) ON DELETE CASCADE,
  stock_available INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, store_id)
);

-- 5. CART TABLE
CREATE TABLE cart (
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
CREATE TABLE "order" (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. ORDER_ITEM TABLE
CREATE TABLE order_item (
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
CREATE TABLE product_reviews (
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
CREATE TABLE wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Indexes for high-throughput queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_product_category ON product(category);
CREATE INDEX idx_product_subcategory ON product(subcategory);
CREATE INDEX idx_product_code ON product(product_code);
CREATE INDEX idx_cart_basket_id ON cart(basket_id);
CREATE INDEX idx_cart_user_id ON cart(user_id);
CREATE INDEX idx_inventory_store_id ON inventory(store_id);
CREATE INDEX idx_order_user_id ON "order"(user_id);
CREATE INDEX idx_order_number ON "order"(order_number);
CREATE INDEX idx_order_item_order_id ON order_item(order_id);
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);

