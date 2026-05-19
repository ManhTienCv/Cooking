-- ================================================================
-- Migration: Smart Cooking Hub â€” Marketplace
-- Adds: product_categories, products, cart_items, orders,
--        order_items, product_reviews, seller_profiles,
--        product_bundles, bundle_items, wishlist_items
-- ================================================================

-- 1. Danh má»¥c sáº£n pháº©m (cáº£ Ä‘á»“ Äƒn & Ä‘á»“ báº¿p)
CREATE TABLE IF NOT EXISTS product_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL DEFAULT 'food',          -- 'food' | 'equipment'
  icon VARCHAR(50),
  description TEXT,
  parent_id INT REFERENCES product_categories(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Seller profiles â€” user nÃ¢ng cáº¥p thÃ nh ngÆ°á»i bÃ¡n
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(200) NOT NULL,
  store_description TEXT,
  phone VARCHAR(20),
  address TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  total_sales INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sáº£n pháº©m thá»‘ng nháº¥t (Ä‘á»“ Äƒn + Ä‘á»“ báº¿p)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  sale_price DECIMAL(12,2) CHECK (sale_price IS NULL OR sale_price >= 0),
  image_url VARCHAR(500),
  images JSONB DEFAULT '[]',                          -- gallery: ["url1","url2"]
  product_type VARCHAR(20) NOT NULL DEFAULT 'food',   -- 'food' | 'ingredient' | 'equipment'
  specs JSONB DEFAULT '{}',                           -- ká»¹ thuáº­t: {"material":"Inox","weight":"1.2kg"}
  stock INT DEFAULT 0 CHECK (stock >= 0),
  unit VARCHAR(50) DEFAULT 'cÃ¡i',                     -- Ä‘Æ¡n vá»‹: cÃ¡i, kg, gÃ³i, há»™p, ...
  is_available BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_sold INT DEFAULT 0,
  recipe_id INT REFERENCES recipes(id) ON DELETE SET NULL,  -- liÃªn káº¿t recipe (náº¿u cÃ³)
  status VARCHAR(20) DEFAULT 'pending',               -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Giá» hÃ ng
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- 5. ÄÆ¡n hÃ ng
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  buyer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  status VARCHAR(30) DEFAULT 'pending',
    -- pending â†’ confirmed â†’ preparing â†’ shipping â†’ delivered â†’ completed â†’ cancelled
  shipping_name VARCHAR(120),
  shipping_phone VARCHAR(20),
  shipping_address TEXT,
  payment_method VARCHAR(30) DEFAULT 'cod',           -- 'cod' | 'bank_transfer'
  note TEXT,
  cancelled_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Chi tiáº¿t Ä‘Æ¡n hÃ ng
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  seller_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name VARCHAR(200) NOT NULL,                 -- snapshot tÃªn lÃºc mua
  product_image VARCHAR(500),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL
);

-- Repair path for databases where these tables existed before marketplace
-- ownership columns were introduced. CREATE TABLE IF NOT EXISTS does not add
-- columns to existing tables, so keep this migration idempotent.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS seller_id INT REFERENCES users(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products WHERE seller_id IS NULL) THEN
    ALTER TABLE products ALTER COLUMN seller_id SET NOT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM order_items WHERE seller_id IS NULL) THEN
    ALTER TABLE order_items ALTER COLUMN seller_id SET NOT NULL;
  END IF;
END $$;

-- 7. ÄÃ¡nh giÃ¡ sáº£n pháº©m
CREATE TABLE IF NOT EXISTS product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  images JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id, order_id)
);

-- 8. Wishlist / YÃªu thÃ­ch sáº£n pháº©m
CREATE TABLE IF NOT EXISTS wishlist_items (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- 9. Bundle / GÃ³i combo
CREATE TABLE IF NOT EXISTS product_bundles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  description TEXT,
  image_url VARCHAR(500),
  original_price DECIMAL(12,2) NOT NULL,
  bundle_price DECIMAL(12,2) NOT NULL,
  recipe_id INT REFERENCES recipes(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Chi tiáº¿t gÃ³i combo
CREATE TABLE IF NOT EXISTS bundle_items (
  id SERIAL PRIMARY KEY,
  bundle_id INT NOT NULL REFERENCES product_bundles(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  UNIQUE(bundle_id, product_id)
);

-- ================================================================
-- Indexes tá»‘i Æ°u truy váº¥n
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status_created ON products(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id);

-- ================================================================
-- Default product categories
-- ================================================================
INSERT INTO product_categories (name, slug, type, icon, sort_order) VALUES
  -- Äá»“ Äƒn
  ('Äá»“ Äƒn sáºµn',       'do-an-san',       'food',      'UtensilsCrossed', 1),
  ('NguyÃªn liá»‡u tÆ°Æ¡i','nguyen-lieu-tuoi','food',      'Carrot',          2),
  ('Äá»“ khÃ´ & Gia vá»‹', 'do-kho-gia-vi',  'food',      'Package',         3),
  ('BÃ¡nh & Äá»“ ngá»t',  'banh-do-ngot',   'food',      'Cake',            4),
  ('Äá»“ uá»‘ng',         'do-uong',        'food',      'Coffee',          5),
  -- Äá»“ báº¿p
  ('Ná»“i & Cháº£o',      'noi-chao',       'equipment', 'CookingPot',      6),
  ('Dao & Thá»›t',      'dao-thot',       'equipment', 'Slice',           7),
  ('MÃ¡y xay & MÃ¡y Ã©p','may-xay-ep',     'equipment', 'Cog',             8),
  ('Phá»¥ kiá»‡n nhÃ  báº¿p','phu-kien-bep',   'equipment', 'Wrench',          9),
  ('Bá»™ Ä‘á»“ Äƒn',        'bo-do-an',       'equipment', 'Utensils',       10)
ON CONFLICT (slug) DO NOTHING;
