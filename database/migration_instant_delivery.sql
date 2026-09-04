-- Migration: Đặt hàng thực phẩm tươi sống giao hỏa tốc trong 1-2 giờ
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(30) DEFAULT 'standard';
