-- Migration: Gắn đồ bếp/nguyên liệu vào công thức & Nâng cấp Đánh giá kèm hình ảnh/video
CREATE TABLE IF NOT EXISTS recipe_tagged_products (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  usage_note VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(recipe_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_recipe_tagged_products_recipe ON recipe_tagged_products(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tagged_products_product ON recipe_tagged_products(product_id);

-- Bổ sung cột video_url và đảm bảo images JSONB cho bảng product_reviews
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
