-- ================================================================
-- Migration: Product Variants, Inventory Movements & Refund Tracking
-- ================================================================

-- 1. Bảng Biến thể sản phẩm (Product Variants)
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE,
    variant_name VARCHAR(150) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    sale_price NUMERIC(12, 2),
    stock INTEGER NOT NULL DEFAULT 10,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);

-- 2. Bảng Lịch sử biến động kho (Inventory Movements)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'import', 'order_deduct', 'order_restock', 'adjustment'
    quantity_delta INTEGER NOT NULL,
    reason TEXT,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON inventory_movements(product_id);

-- 3. Bổ sung trường liên kết vào cart_items và order_items
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_name VARCHAR(150);

-- 4. Bổ sung trường phục vụ hoàn tiền (Refund Workflow) trong orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

-- 5. Nạp dữ liệu mẫu biến thể cho các sản phẩm tiêu biểu KitchenCook
DO $$
DECLARE
    p_noi_gang RECORD;
    p_chao RECORD;
    p_dao RECORD;
    p_noi_ap_suat RECORD;
BEGIN
    -- Biến thể Nồi gang tráng men
    FOR p_noi_gang IN SELECT id, price, sale_price FROM products WHERE name ILIKE '%nồi gang%' OR name ILIKE '%noi gang%' LIMIT 1 LOOP
        INSERT INTO product_variants (product_id, sku, variant_name, price, sale_price, stock)
        VALUES 
            (p_noi_gang.id, 'KC-NG-20', 'Size 20cm (Dung tích 2.4L)', p_noi_gang.price * 0.85, p_noi_gang.sale_price * 0.85, 25),
            (p_noi_gang.id, 'KC-NG-24', 'Size 24cm (Dung tích 4.2L) - Tiêu chuẩn', p_noi_gang.price, p_noi_gang.sale_price, 40),
            (p_noi_gang.id, 'KC-NG-28', 'Size 28cm (Dung tích 6.7L) - Gia đình', p_noi_gang.price * 1.25, p_noi_gang.sale_price * 1.25, 15)
        ON CONFLICT (sku) DO NOTHING;
    END LOOP;

    -- Biến thể Chảo chống dính
    FOR p_chao IN SELECT id, price, sale_price FROM products WHERE name ILIKE '%chảo%' OR name ILIKE '%chao%' LIMIT 1 LOOP
        INSERT INTO product_variants (product_id, sku, variant_name, price, sale_price, stock)
        VALUES 
            (p_chao.id, 'KC-CHAO-20', 'Đường kính 20cm (Chiên 1-2 trứng)', p_chao.price * 0.8, p_chao.sale_price * 0.8, 30),
            (p_chao.id, 'KC-CHAO-26', 'Đường kính 26cm (Tiêu chuẩn xào nấu)', p_chao.price, p_chao.sale_price, 50),
            (p_chao.id, 'KC-CHAO-28', 'Đường kính 28cm (Lòng sâu chiên ngập dầu)', p_chao.price * 1.2, p_chao.sale_price * 1.2, 20)
        ON CONFLICT (sku) DO NOTHING;
    END LOOP;

    -- Biến thể Dao bếp
    FOR p_dao IN SELECT id, price, sale_price FROM products WHERE name ILIKE '%dao%' LIMIT 1 LOOP
        INSERT INTO product_variants (product_id, sku, variant_name, price, sale_price, stock)
        VALUES 
            (p_dao.id, 'KC-DAO-CHEF', 'Dao Chef Đa Năng 20cm (Thép VG10)', p_dao.price, p_dao.sale_price, 35),
            (p_dao.id, 'KC-DAO-SANTOKU', 'Dao Santoku Nhật Bản 18cm (Cắt thái)', p_dao.price * 0.9, p_dao.sale_price * 0.9, 25),
            (p_dao.id, 'KC-DAO-PARING', 'Dao Gọt Trái Cây 9cm', p_dao.price * 0.5, p_dao.sale_price * 0.5, 45)
        ON CONFLICT (sku) DO NOTHING;
    END LOOP;
END $$;
