import bcrypt from 'bcryptjs';
import type { Pool } from 'pg';
import {
  DEFAULT_BLOG_CATEGORIES,
  DEFAULT_RECIPE_CATEGORIES,
  slugify,
} from '../../data/defaultCategories.js';
import { upsertAdmin } from './createAdmin.js';

const BCRYPT_COST = 12;
const SEED_MARKER = 'dev_seed_v1';

export type DevSeedConfig = {
  adminEmail: string;
  adminPassword: string;
  adminName: string;
};

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

async function isSeedDone(pool: Pool): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM _app_migrations WHERE name = $1`,
    [SEED_MARKER],
  );
  return (res.rowCount ?? 0) > 0;
}

async function markSeedDone(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO _app_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [SEED_MARKER],
  );
}

async function upsertUser(
  pool: Pool,
  data: { email: string; fullName: string; password: string; bio?: string },
): Promise<number> {
  const email = data.email.toLowerCase();
  const passwordHash = await hashPassword(data.password);
  const res = await pool.query<{ id: number }>(
    `INSERT INTO users (full_name, email, password_hash, bio)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       bio = COALESCE(EXCLUDED.bio, users.bio)
     RETURNING id`,
    [data.fullName, email, passwordHash, data.bio ?? null],
  );
  return res.rows[0]!.id;
}

async function ensureRecipeCategories(pool: Pool): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const name of DEFAULT_RECIPE_CATEGORIES) {
    const slug = slugify(name);
    const res = await pool.query<{ id: number }>(
      `INSERT INTO recipe_categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, slug],
    );
    map.set(slug, res.rows[0]!.id);
  }
  return map;
}

async function ensureBlogCategories(pool: Pool): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const name of DEFAULT_BLOG_CATEGORIES) {
    const slug = slugify(name);
    const res = await pool.query<{ id: number }>(
      `INSERT INTO blog_categories (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [name, slug],
    );
    map.set(slug, res.rows[0]!.id);
  }
  return map;
}

export async function seedDevData(
  pool: Pool,
  config: DevSeedConfig,
  options: { force?: boolean } = {},
): Promise<void> {
  if (!options.force && (await isSeedDone(pool))) {
    console.log('[db:seed] Dev seed already applied — skipping (set DB_FORCE=1 to re-run).');
    return;
  }

  await upsertAdmin(pool, {
    email: config.adminEmail,
    password: config.adminPassword,
    fullName: config.adminName,
  });

  const sellerId = await upsertUser(pool, {
    email: 'demo-seller@cook.local',
    fullName: 'Nguyễn Văn Demo',
    password: 'Demo@Cook123456',
    bio: 'Tài khoản demo người bán — dùng cho dev.',
  });

  await upsertUser(pool, {
    email: 'demo-buyer@cook.local',
    fullName: 'Khách Demo',
    password: 'Demo@Cook123456',
    bio: 'Tài khoản demo người mua.',
  });

  await pool.query(
    `INSERT INTO seller_profiles (user_id, store_name, store_description, phone, address, is_verified)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT (user_id) DO UPDATE SET
       store_name = EXCLUDED.store_name,
       store_description = EXCLUDED.store_description,
       is_verified = EXCLUDED.is_verified`,
    [
      sellerId,
      'Meo Meo Kitchen',
      'Cửa hàng demo — nguyên liệu & đồ ăn sẵn.',
      '0901234567',
      '123 Đường Demo, Hà Nội',
    ],
  );

  await pool.query(
    `INSERT INTO seller_verification_profiles (user_id, verification_status, verified_at)
     VALUES ($1, 'verified', CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) DO UPDATE SET
       verification_status = 'verified',
       verified_at = COALESCE(seller_verification_profiles.verified_at, EXCLUDED.verified_at)`,
    [sellerId],
  );

  await pool.query(
    `INSERT INTO seller_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [sellerId],
  );

  const recipeCats = await ensureRecipeCategories(pool);
  const blogCats = await ensureBlogCategories(pool);

  const monChinhId = recipeCats.get(slugify('Món chính')) ?? [...recipeCats.values()][0]!;
  const meoVatId = blogCats.get(slugify('Mẹo Vặt')) ?? [...blogCats.values()][0]!;

  const recipeTitle = 'Phở bò demo';
  const recipeExists = await pool.query(
    `SELECT 1 FROM recipes WHERE title = $1 AND author_id = $2 LIMIT 1`,
    [recipeTitle, sellerId],
  );
  if ((recipeExists.rowCount ?? 0) === 0) {
    await pool.query(
      `INSERT INTO recipes (
         title, description, ingredients, instructions, difficulty, cooking_time, servings,
         category_id, author_id, status, is_featured, calories, protein, carbs, fat
       ) VALUES ($1, $2, $3, $4, 'Dễ', 45, 2, $5, $6, 'approved', TRUE, 420, 28, 52, 12)`,
      [
        recipeTitle,
        'Công thức mẫu để test trang công thức và hồ sơ công khai.',
        'Bánh phở, thịt bò, hành, rau thơm, nước dùng',
        '1. Nấu nước dùng\n2. Trần bánh phở\n3. Thêm topping và thưởng thức',
        monChinhId,
        sellerId,
      ],
    );
  }

  const postSlug = 'meo-nau-an-nhanh-demo';
  const postExists = await pool.query(
    `SELECT 1 FROM blog_posts WHERE slug = $1 LIMIT 1`,
    [postSlug],
  );
  if ((postExists.rowCount ?? 0) === 0) {
    await pool.query(
      `INSERT INTO blog_posts (title, slug, excerpt, content, category_id, author_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
      [
        'Mẹo nấu ăn nhanh (demo)',
        postSlug,
        'Bài viết mẫu cho tab bài viết trên hồ sơ công khai.',
        '<p>Nội dung demo — bạn có thể sửa hoặc xóa sau khi import xong.</p>',
        meoVatId,
        sellerId,
      ],
    );
  }

  const catRes = await pool.query<{ id: number }>(
    `SELECT id FROM product_categories WHERE slug = 'do-an-san' LIMIT 1`,
  );
  const productCatId = catRes.rows[0]?.id;
  if (productCatId) {
    const productSlug = 'set-nguyen-lieu-pho-demo';
    const productExists = await pool.query(
      `SELECT 1 FROM products WHERE slug = $1 LIMIT 1`,
      [productSlug],
    );
    if ((productExists.rowCount ?? 0) === 0) {
      await pool.query(
        `INSERT INTO products (
           seller_id, category_id, name, slug, description, price, stock, unit,
           product_type, status, is_available, is_featured
         ) VALUES ($1, $2, $3, $4, $5, 89000, 50, 'phần', 'food', 'approved', TRUE, TRUE)`,
        [
          sellerId,
          productCatId,
          'Set nguyên liệu phở (demo)',
          productSlug,
          'Gói demo cho marketplace và chat đơn hàng.',
        ],
      );
    }
  }

  await markSeedDone(pool);

  console.log('[db:seed] Dev data ready:');
  console.log(`  Admin:  ${config.adminEmail} / (password from ADMIN_PASSWORD or default)`);
  console.log('  Seller: demo-seller@cook.local / Demo@Cook123456');
  console.log('  Buyer:  demo-buyer@cook.local / Demo@Cook123456');
}
