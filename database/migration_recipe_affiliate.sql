-- Migration: Tiếp thị liên kết (Affiliate) thưởng tác giả công thức khi có người mua nguyên liệu / đồ bếp
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS ref_recipe_id INT REFERENCES recipes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_ref_recipe_id ON orders(ref_recipe_id);
