-- ================================================================
-- Migration: Auto-promote recipes to "Featured" (is_featured = TRUE)
-- Trigger checks: views >= 10
-- ================================================================

CREATE OR REPLACE FUNCTION update_recipe_featured_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Tự động kích hoạt nhãn Nổi bật khi công thức có lượt xem cao (từ 10 lượt xem trở lên)
  IF NEW.views >= 10 THEN
    NEW.is_featured := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger chạy trước khi cập nhật bảng recipes
DROP TRIGGER IF EXISTS trg_update_recipe_featured_status ON recipes;
CREATE TRIGGER trg_update_recipe_featured_status
BEFORE UPDATE ON recipes
FOR EACH ROW
EXECUTE FUNCTION update_recipe_featured_status();
