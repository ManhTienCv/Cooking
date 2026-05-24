-- ================================================================
-- Migration: Auto-promote products to "Hot" (is_featured = TRUE)
-- Trigger checks: total_sold >= 5 and rating >= 4.5
-- ================================================================

CREATE OR REPLACE FUNCTION update_product_hot_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Tự động kích hoạt nhãn Hot khi sản phẩm bán chạy (từ 5 đơn trở lên) và đánh giá tích cực (từ 4.5 sao trở lên)
  IF NEW.total_sold >= 5 AND NEW.rating >= 4.5 THEN
    NEW.is_featured := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger chạy trước khi cập nhật bảng products
DROP TRIGGER IF EXISTS trg_update_product_hot_status ON products;
CREATE TRIGGER trg_update_product_hot_status
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_hot_status();
