import { pool } from '../db/pool.js';
import { hashPlainPasswordForAdminStorage } from '../lib/adminPassword.js';
import { DashboardStats } from '../types/admin.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const adminRepo = {
  async getDashboardStats(): Promise<DashboardStats> {
    const [admins, users, recipes, blogs, feedback, pendingRecipes, pendingBlogs] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM quantrivien'),
      pool.query('SELECT COUNT(*)::int AS total FROM users'),
      pool.query('SELECT COUNT(*)::int AS total FROM recipes'),
      pool.query('SELECT COUNT(*)::int AS total FROM blog_posts'),
      pool.query('SELECT COUNT(*)::int AS total FROM feedback'),
      pool.query("SELECT COUNT(*)::int AS total FROM recipes WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*)::int AS total FROM blog_posts WHERE status = 'pending'"),
    ]);
    return {
      admins: admins.rows[0]?.total ?? 0,
      users: users.rows[0]?.total ?? 0,
      recipes: recipes.rows[0]?.total ?? 0,
      blogs: blogs.rows[0]?.total ?? 0,
      feedback: feedback.rows[0]?.total ?? 0,
      pendingRecipes: pendingRecipes.rows[0]?.total ?? 0,
      pendingBlogs: pendingBlogs.rows[0]?.total ?? 0,
      pendingProducts: 0,
    };
  },

  async getAdmins() {
    const r = await pool.query(
      'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email, created_at FROM quantrivien ORDER BY "MaAD" ASC'
    );
    return r.rows;
  },

  async resetAdminPassword(id: number, plainPassword: string) {
    const hash = await hashPlainPasswordForAdminStorage(plainPassword);
    await pool.query('UPDATE quantrivien SET "MatKhau" = $1 WHERE "MaAD" = $2', [hash, id]);
  },

  async getUsers() {
    const r = await pool.query(
      'SELECT id, full_name, email, avatar_url, created_at FROM users ORDER BY created_at DESC LIMIT 200'
    );
    return r.rows;
  },

  async deleteUser(id: number) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },

  async getRecipes(status: string) {
    const params: string[] = [];
    let where = '';
    if (status !== 'all') {
      params.push(status);
      where = 'WHERE r.status = $1';
    }
    const r = await pool.query(
      `SELECT r.id, r.title, r.status, r.created_at, c.name AS category_name, u.full_name AS author_name
       FROM recipes r
       LEFT JOIN recipe_categories c ON r.category_id = c.id
       LEFT JOIN users u ON r.author_id = u.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT 300`,
      params
    );
    return r.rows;
  },

  async updateRecipeStatus(id: number, status: string) {
    await pool.query('UPDATE recipes SET status = $1 WHERE id = $2', [status, id]);
  },

  async deleteRecipe(id: number) {
    await pool.query('DELETE FROM recipes WHERE id = $1', [id]);
  },

  async getBlogs(status: string) {
    const params: string[] = [];
    let where = '';
    if (status !== 'all') {
      params.push(status);
      where = 'WHERE p.status = $1';
    }
    const r = await pool.query(
      `SELECT p.id, p.title, p.status, p.created_at, c.name AS category_name, u.full_name AS author_name
       FROM blog_posts p
       LEFT JOIN blog_categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.author_id = u.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT 300`,
      params
    );
    return r.rows;
  },

  async updateBlogStatus(id: number, status: string) {
    await pool.query('UPDATE blog_posts SET status = $1 WHERE id = $2', [status, id]);
  },

  async deleteBlog(id: number) {
    await pool.query('DELETE FROM blog_posts WHERE id = $1', [id]);
  },

  async getFeedback() {
    const r = await pool.query(
      `SELECT f.id, f.name, f.email, f.message, f.created_at, u.full_name, u.avatar_url
       FROM feedback f
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC
       LIMIT 300`
    );
    return r.rows;
  },

  async deleteFeedback(id: number) {
    await pool.query('DELETE FROM feedback WHERE id = $1', [id]);
  },

  async getComments() {
    const r = await pool.query(`
      SELECT c.id, c.content, c.created_at, u.full_name AS author_name, p.title AS post_title
      FROM blog_comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN blog_posts p ON c.post_id = p.id
      ORDER BY c.created_at DESC
      LIMIT 300
    `);
    return r.rows;
  },

  async deleteComment(id: number) {
    await pool.query('DELETE FROM blog_comments WHERE id = $1', [id]);
  },

  async getCategories(table: string) {
    const r = await pool.query(`SELECT id, name FROM ${table} ORDER BY name ASC`);
    return r.rows;
  },

  async createCategory(table: string, name: string, slug: string): Promise<boolean> {
    const r = await pool.query(
      `INSERT INTO ${table} (name, slug)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [name, slug]
    );
    return r.rows.length > 0;
  },

  async updateCategory(table: string, id: number, name: string, slug: string) {
    await pool.query(`UPDATE ${table} SET name = $1, slug = $2 WHERE id = $3`, [name, slug, id]);
  },

  async deleteCategory(table: string, id: number) {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  },

  async getMarketplaceStats() {
    const res = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status != 'deleted' AND product_type = 'equipment') AS total_products,
        COUNT(*) FILTER (WHERE status = 'approved' AND is_available = TRUE AND stock > 0 AND product_type = 'equipment') AS active_products,
        COUNT(*) FILTER (WHERE status != 'deleted' AND product_type = 'equipment' AND (stock = 0 OR is_available = FALSE)) AS out_of_stock_or_hidden,
        COALESCE(SUM(CASE WHEN status != 'deleted' AND product_type = 'equipment' AND stock > 0 THEN stock * COALESCE(sale_price, price) ELSE 0 END), 0) AS estimated_warehouse_value
      FROM products
    `);
    const row = res.rows[0] || {};
    return {
      totalProducts: Number(row.total_products || 0),
      activeProducts: Number(row.active_products || 0),
      outOfStockOrHidden: Number(row.out_of_stock_or_hidden || 0),
      estimatedWarehouseValue: Number(row.estimated_warehouse_value || 0),
    };
  },

  async getMarketplaceProducts(status: string, limit: number, offset: number) {
    let where = "WHERE p.status != 'deleted' AND p.product_type = 'equipment'";
    const params: (string | number)[] = [limit, offset];
    
    if (status === 'selling' || status === 'active') {
      where += " AND p.status = 'approved' AND p.is_available = TRUE AND p.stock > 0";
    } else if (status === 'out_of_stock') {
      where += " AND (p.stock = 0 OR p.is_available = FALSE)";
    } else if (status === 'hidden') {
      where += " AND p.is_available = FALSE";
    } else if (status !== 'all') {
      params.push(status);
      where += ` AND p.status = $${params.length}`;
    }

    const rows = await pool.query(
      `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug,
              'KitchenCook' AS seller_name, u.avatar_url AS seller_avatar,
              COALESCE(sp.store_name, 'KitchenCook') AS store_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    let countWhere = "WHERE status != 'deleted' AND product_type = 'equipment'";
    const countParams: (string | number)[] = [];
    if (status === 'selling' || status === 'active') {
      countWhere += " AND status = 'approved' AND is_available = TRUE AND stock > 0";
    } else if (status === 'out_of_stock') {
      countWhere += " AND (stock = 0 OR is_available = FALSE)";
    } else if (status === 'hidden') {
      countWhere += " AND is_available = FALSE";
    } else if (status !== 'all') {
      countParams.push(status);
      countWhere += ` AND status = $${countParams.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM products ${countWhere}`,
      countParams
    );

    return {
      products: rows.rows,
      total: Number(countResult.rows[0]?.total ?? 0)
    };
  },

  async createAdminProduct(data: {
    name: string;
    category_id: number;
    price: number;
    sale_price?: number | null;
    stock: number;
    unit?: string;
    image_url?: string | null;
    images?: string[];
    specs?: Record<string, string>;
    description?: string | null;
    product_type?: string;
    is_featured?: boolean;
    is_available?: boolean;
  }) {
    const userRes = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
    const sellerId = userRes.rows[0]?.id || 1;

    await pool.query(`
      INSERT INTO seller_profiles (user_id, store_name, is_verified)
      VALUES ($1, 'KitchenCook', TRUE)
      ON CONFLICT (user_id) DO UPDATE SET store_name = 'KitchenCook', is_verified = TRUE
    `, [sellerId]);

    const slug = `${slugify(data.name)}-${Date.now()}`;
    const isAvail = (data.stock ?? 0) > 0 ? (data.is_available ?? true) : false;

    const { rows } = await pool.query(`
      INSERT INTO products (
        seller_id, category_id, name, slug, description, price, sale_price,
        image_url, images, product_type, specs, stock, unit, status, is_available, is_featured
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, 'approved', $14, $15
      ) RETURNING *
    `, [
      sellerId,
      data.category_id,
      data.name,
      slug,
      data.description || null,
      data.price,
      data.sale_price || null,
      data.image_url || null,
      JSON.stringify(data.images || []),
      data.product_type || 'equipment',
      JSON.stringify(data.specs || {}),
      data.stock || 0,
      data.unit || 'cái',
      isAvail,
      Boolean(data.is_featured),
    ]);

    return rows[0];
  },

  async updateAdminProduct(id: number, data: Record<string, any>) {
    const sets: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
    if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
    if (data.price !== undefined) { sets.push(`price = $${idx++}`); params.push(data.price); }
    if (data.sale_price !== undefined) { sets.push(`sale_price = $${idx++}`); params.push(data.sale_price); }
    if (data.image_url !== undefined) { sets.push(`image_url = $${idx++}`); params.push(data.image_url); }
    if (data.images !== undefined) { sets.push(`images = $${idx++}`); params.push(JSON.stringify(data.images)); }
    if (data.category_id !== undefined) { sets.push(`category_id = $${idx++}`); params.push(data.category_id); }
    if (data.specs !== undefined) { sets.push(`specs = $${idx++}`); params.push(JSON.stringify(data.specs)); }
    if (data.stock !== undefined) {
      sets.push(`stock = $${idx++}`);
      params.push(data.stock);
      if (data.stock <= 0) {
        sets.push(`is_available = FALSE`);
      } else if (data.is_available === undefined) {
        sets.push(`is_available = TRUE`);
      }
    }
    if (data.unit !== undefined) { sets.push(`unit = $${idx++}`); params.push(data.unit); }
    if (data.product_type !== undefined) { sets.push(`product_type = $${idx++}`); params.push(data.product_type); }
    if (data.status !== undefined) { sets.push(`status = $${idx++}`); params.push(data.status); }
    if (data.is_available !== undefined) {
      const avail = data.stock !== undefined && data.stock <= 0 ? false : Boolean(data.is_available);
      sets.push(`is_available = $${idx++}`);
      params.push(avail);
    }
    if (data.is_featured !== undefined) { sets.push(`is_featured = $${idx++}`); params.push(Boolean(data.is_featured)); }

    if (sets.length === 0) return false;
    sets.push('updated_at = NOW()');

    params.push(id);
    const { rowCount } = await pool.query(
      `UPDATE products SET ${sets.join(', ')} WHERE id = $${idx}`,
      params
    );
    return (rowCount ?? 0) > 0;
  },

  async deleteAdminProduct(id: number) {
    const { rowCount } = await pool.query(
      `UPDATE products SET status = 'deleted', is_available = FALSE WHERE id = $1`,
      [id]
    );
    return (rowCount ?? 0) > 0;
  },

  async getSellers(limit: number, offset: number) {
    const dataResult = await pool.query(
      `SELECT sp.*, u.full_name, u.email 
       FROM seller_profiles sp
       JOIN users u ON u.id = sp.user_id
       ORDER BY sp.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM seller_profiles`);
    
    return {
      sellers: dataResult.rows,
      total: Number(countResult.rows[0]?.total || 0)
    };
  },

  async verifySeller(sellerId: number, isVerified: boolean) {
    const { rowCount } = await pool.query(
      `UPDATE seller_profiles SET is_verified = $1, updated_at = NOW() WHERE user_id = $2`,
      [isVerified, sellerId]
    );
    return (rowCount ?? 0) > 0;
  },

  async getMarketplaceOrders(status: string, limit: number, offset: number) {
    const conditions = ['1=1'];
    const params: (string | number)[] = [];

    if (status) {
      params.push(status);
      conditions.push(`o.status = $${params.length}`);
    }

    const where = conditions.join(' AND ');
    const dataResult = await pool.query(
      `SELECT o.*, u.full_name AS buyer_name, u.email AS buyer_email
       FROM orders o
       LEFT JOIN users u ON o.buyer_id = u.id
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM orders o WHERE ${where}`,
      params
    );

    return {
      orders: dataResult.rows,
      total: Number(countResult.rows[0]?.total ?? 0)
    };
  },

  async getWithdrawals(limit: number, offset: number) {
    const res = await pool.query(
      `SELECT w.*, u.full_name as fullname, u.email, b.bank_name, b.account_number, b.account_name 
       FROM withdrawal_requests w 
       JOIN users u ON w.user_id = u.id 
       JOIN user_bank_accounts b ON w.bank_account_id = b.id 
       ORDER BY w.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRes = await pool.query('SELECT count(*) FROM withdrawal_requests');
    return { withdrawals: res.rows, total: parseInt(countRes.rows[0].count) };
  }
};