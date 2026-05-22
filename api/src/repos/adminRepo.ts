import { pool } from '../db/pool.js';
import { hashPlainPasswordForAdminStorage } from '../lib/adminPassword.js';
import { DashboardStats } from '../types/admin.js';

export const adminRepo = {
  async getDashboardStats(): Promise<DashboardStats> {
    const [admins, users, recipes, blogs, feedback, pendingRecipes, pendingBlogs, pendingProducts] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM quantrivien'),
      pool.query('SELECT COUNT(*)::int AS total FROM users'),
      pool.query('SELECT COUNT(*)::int AS total FROM recipes'),
      pool.query('SELECT COUNT(*)::int AS total FROM blog_posts'),
      pool.query('SELECT COUNT(*)::int AS total FROM feedback'),
      pool.query("SELECT COUNT(*)::int AS total FROM recipes WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*)::int AS total FROM blog_posts WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*)::int AS total FROM products WHERE status = 'pending'"),
    ]);
    return {
      admins: admins.rows[0]?.total ?? 0,
      users: users.rows[0]?.total ?? 0,
      recipes: recipes.rows[0]?.total ?? 0,
      blogs: blogs.rows[0]?.total ?? 0,
      feedback: feedback.rows[0]?.total ?? 0,
      pendingRecipes: pendingRecipes.rows[0]?.total ?? 0,
      pendingBlogs: pendingBlogs.rows[0]?.total ?? 0,
      pendingProducts: pendingProducts.rows[0]?.total ?? 0,
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

  async getMarketplaceProducts(status: string, limit: number, offset: number) {
    let where = '';
    const params: (string | number)[] = [limit, offset];
    
    if (status !== 'all') {
      params.push(status);
      where = 'WHERE p.status = $3';
    }

    const rows = await pool.query(
      `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug,
              u.full_name AS seller_name, u.avatar_url AS seller_avatar,
              sp.store_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM products p ${status !== 'all' ? 'WHERE p.status = $1' : ''}`,
      status !== 'all' ? [status] : []
    );

    return {
      products: rows.rows,
      total: Number(countResult.rows[0]?.total ?? 0)
    };
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