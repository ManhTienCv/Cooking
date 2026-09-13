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



  const userRes = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
  const sellerId = userRes.rows[0]?.id || 1;

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

  // Đảm bảo có seller profile cho cửa hàng chính hãng
  await pool.query(
    `INSERT INTO seller_profiles (user_id, store_name, store_description, phone, address, is_verified)
     VALUES ($1, 'KitchenCook Flagship Store', 'Cửa hàng chính thức KitchenCook chuyên đồ gia dụng và thiết bị nhà bếp cao cấp.', '0901234567', 'Tòa nhà Landmark 81, TP.HCM', TRUE)
     ON CONFLICT (user_id) DO UPDATE SET store_name = EXCLUDED.store_name`,
    [sellerId],
  );

  // Đảm bảo có danh mục thiết bị đồ bếp
  const equipCats = [
    { name: 'Nồi & Chảo', slug: 'noi-chao', desc: 'Chảo chống dính, chảo gang, nồi áp suất cao cấp' },
    { name: 'Thiết bị điện bếp', slug: 'thiet-bi-dien', desc: 'Nồi chiên không dầu, lò vi sóng, máy xay đa năng' },
    { name: 'Dao & Dụng cụ cắt gọt', slug: 'dao-thot', desc: 'Bộ dao đầu bếp Nhật, thớt gỗ tếch kháng khuẩn' },
    { name: 'Phụ kiện nhà bếp', slug: 'phu-kien-bep', desc: 'Hộp bảo quản thủy tinh, cân điện tử, kẹp gắp' },
  ];
  const catMap = new Map<string, number>();
  for (const c of equipCats) {
    const res = await pool.query<{ id: number }>(
      `INSERT INTO product_categories (name, slug, type, description)
       VALUES ($1, $2, 'equipment', $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, type = 'equipment'
       RETURNING id`,
      [c.name, c.slug, c.desc],
    );
    catMap.set(c.slug, res.rows[0]!.id);
  }

  // Đảm bảo có sản phẩm mẫu đồ bếp
  const productsCountRes = await pool.query('SELECT COUNT(*) as cnt FROM products');
  if (Number(productsCountRes.rows[0]?.cnt || 0) === 0) {
    const defaultProducts = [
      {
        name: 'Nồi Chiên Không Dầu Điện Tử Philips XXL HD9650/90 (7.3L)',
        slug: 'noi-chien-khong-dau-philips-xxl-hd9650-90',
        catSlug: 'thiet-bi-dien',
        price: 4990000,
        sale_price: 3890000,
        img: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        desc: 'Công nghệ Twin TurboStar loại bỏ đến 90% lượng chất béo trong thực phẩm. Dung tích XXL cực đại chứa vừa cả con gà nguyên con hoặc 1.4kg khoai tây chiên.',
        specs: { 'Dung tích': '7.3 Lít', 'Công suất': '2225W', 'Bảo hành': '24 tháng chính hãng' },
        featured: true,
      },
      {
        name: 'Chảo Gang Nguyên Khối Lodge Cast Iron Skillet 26cm',
        slug: 'chao-gang-lodge-cast-iron-skillet-26cm',
        catSlug: 'noi-chao',
        price: 1250000,
        sale_price: 990000,
        img: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80',
        desc: 'Được đúc nguyên khối từ hợp kim gang cao cấp tại Tennessee Hoa Kỳ. Giữ nhiệt cực lâu, tỏa nhiệt đều hoàn hảo cho món bít tết cháy cạnh áp chảo và các món đút lò.',
        specs: { 'Đường kính': '26 cm', 'Chất liệu': 'Gang đúc nguyên khối', 'Xuất xứ': 'Made in USA' },
        featured: true,
      },
      {
        name: 'Nồi Áp Suất Điện Đa Năng Thông Minh Instant Pot Duo 7-in-1 (5.7L)',
        slug: 'noi-ap-suat-instant-pot-duo-7-in-1-5-7l',
        catSlug: 'thiet-bi-dien',
        price: 2850000,
        sale_price: 2350000,
        img: 'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?auto=format&fit=crop&w=800&q=80',
        desc: 'Thay thế 7 thiết bị nhà bếp thông thường: nấu áp suất, nấu cơm, hấp, xào sa-tế, làm sữa chua, hâm nóng và nấu chậm. Tiết kiệm tới 70% thời gian nấu nướng.',
        specs: { 'Dung tích': '5.7 Lít (6 Quarts)', 'Lòng nồi': 'Inox 304 3 lớp', 'Công suất': '1000W' },
        featured: true,
      },
      {
        name: 'Bộ Dao Nhà Bếp Nhật Bản Damascus VG-10 Vân Sóng (5 Món)',
        slug: 'bo-dao-bep-nhat-damascus-vg10-5-mon',
        catSlug: 'dao-thot',
        price: 2450000,
        sale_price: 1950000,
        img: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=800&q=80',
        desc: 'Rèn thủ công 67 lớp thép Damascus với lõi thép siêu cứng VG-10 đạt độ cứng 60±2 HRC. Cán gỗ Pakka công thái học chống trơn trượt tuyệt đối.',
        specs: { 'Lõi thép': 'VG-10 Cao Cấp (67 lớp Damascus)', 'Bộ sản phẩm': '5 dao chuyên dụng + Đế cắm gỗ óc chó' },
        featured: true,
      },
    ];

    for (const p of defaultProducts) {
      const catId = catMap.get(p.catSlug) ?? [...catMap.values()][0]!;
      await pool.query(
        `INSERT INTO products (
           seller_id, category_id, name, slug, description, price, sale_price,
           image_url, images, product_type, specs, stock, unit, is_available, is_featured,
           rating, total_reviews, total_sold, status
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, $9, 'equipment', $10, 50, 'cái', TRUE, $11,
           4.9, 25, 120, 'approved'
         ) ON CONFLICT (slug) DO NOTHING`,
        [
          sellerId,
          catId,
          p.name,
          p.slug,
          p.desc,
          p.price,
          p.sale_price,
          p.img,
          JSON.stringify([p.img]),
          JSON.stringify(p.specs),
          p.featured,
        ],
      );
    }
  }

  await markSeedDone(pool);

  console.log('[db:seed] Dev data ready:');
  console.log(`  Admin:  ${config.adminEmail} / ${config.adminPassword}`);
}
