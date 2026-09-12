-- Migration: KitchenCook Direct Store (Single Admin Seller, Equipment Only)
-- Removes food categories, sets default product_type to 'equipment', allows nullable category_id

-- 1. Allow nullable category_id for soft-deleted or unclassified equipment
ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;

-- 2. Set default product_type to 'equipment'
ALTER TABLE products ALTER COLUMN product_type SET DEFAULT 'equipment';

-- 3. Remap equipment products to equipment categories
UPDATE products SET category_id = 6 WHERE id IN (13, 14) AND category_id = 3;
UPDATE products SET category_id = 7 WHERE id IN (12, 16) AND category_id = 3;
UPDATE products SET category_id = 8 WHERE id = 15 AND category_id = 3;

-- 4. Unlink products pointing to food categories
UPDATE products 
SET category_id = NULL 
WHERE category_id IN (SELECT id FROM product_categories WHERE type = 'food');

-- 5. Delete food categories
DELETE FROM product_categories WHERE type = 'food';
