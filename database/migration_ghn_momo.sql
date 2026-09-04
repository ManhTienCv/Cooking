-- Migration: GHN Express & MoMo sandbox columns for orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS ghn_order_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS to_district_id INT,
  ADD COLUMN IF NOT EXISTS to_ward_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS momo_trans_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS momo_request_id VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_orders_ghn_order_code ON orders(ghn_order_code);
CREATE INDEX IF NOT EXISTS idx_orders_momo_trans_id ON orders(momo_trans_id);
