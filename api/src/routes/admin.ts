import { Router } from 'express';
import { requireCsrf } from '../middleware/csrf.js';
import { adminLoginRateLimit } from '../middleware/rateLimits.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminRepo } from '../repos/adminRepo.js';
import * as adminService from '../services/adminService.js';
import * as marketplaceRepo from '../repos/marketplaceRepo.js';
import * as marketplaceService from '../services/marketplaceService.js';
import * as sellerRepo from '../repos/sellerSettingsRepo.js';
import { sendSellerStatusEmail } from '../services/mailService.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const adminRouter = Router();

adminRouter.get('/me', asyncHandler(async (req, res) => {
  const adminId = req.session.adminId;
  if (!adminId) {
    res.json({ authenticated: false });
    return;
  }
  const result = await adminService.getMe(adminId);
  if (!result.authenticated) {
    req.session.adminId = undefined;
  }
  res.json(result);
}));

adminRouter.post('/login', adminLoginRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const { adminId, admin } = await adminService.login(req);

  const oldCsrfToken = req.session.csrfToken;
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Login failed.' });
      return;
    }
    req.session.csrfToken = oldCsrfToken;
    req.session.adminId = adminId;
    res.json({ success: true, admin });
  });
}));

adminRouter.post('/logout', requireCsrf, (req, res) => {
  req.session.adminId = undefined;
  res.json({ success: true });
});

adminRouter.get('/dashboard', requireAdmin, asyncHandler(async (_req, res) => {
  const stats = await adminRepo.getDashboardStats();
  res.json(stats);
}));

adminRouter.get('/admins', requireAdmin, asyncHandler(async (_req, res) => {
  const admins = await adminRepo.getAdmins();
  res.json({ admins });
}));

adminRouter.post('/admins/:id/reset-password', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.resetAdminPassword(req.params.id, req.body?.newPassword);
  res.json(result);
}));

adminRouter.get('/users', requireAdmin, asyncHandler(async (_req, res) => {
  const users = await adminRepo.getUsers();
  res.json({ users });
}));

adminRouter.get('/recipes', requireAdmin, asyncHandler(async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const recipes = await adminRepo.getRecipes(status);
  res.json({ recipes });
}));

adminRouter.get('/blogs', requireAdmin, asyncHandler(async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const blogs = await adminRepo.getBlogs(status);
  res.json({ blogs });
}));

adminRouter.get('/feedback', requireAdmin, asyncHandler(async (_req, res) => {
  const feedback = await adminRepo.getFeedback();
  res.json({ feedback });
}));

adminRouter.post('/recipes/:id/approve', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.updateRecipeStatus(Number(req.params.id), 'approved');
  res.json({ success: true });
}));

adminRouter.post('/recipes/:id/reject', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.updateRecipeStatus(Number(req.params.id), 'rejected');
  res.json({ success: true });
}));

adminRouter.post('/blogs/:id/approve', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.updateBlogStatus(Number(req.params.id), 'approved');
  res.json({ success: true });
}));

adminRouter.post('/blogs/:id/reject', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.updateBlogStatus(Number(req.params.id), 'rejected');
  res.json({ success: true });
}));

adminRouter.delete('/users/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.deleteUser(Number(req.params.id));
  res.json({ success: true });
}));

adminRouter.delete('/recipes/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.deleteRecipe(Number(req.params.id));
  res.json({ success: true });
}));

adminRouter.delete('/blogs/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.deleteBlog(Number(req.params.id));
  res.json({ success: true });
}));

adminRouter.delete('/feedback/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.deleteFeedback(Number(req.params.id));
  res.json({ success: true });
}));

adminRouter.get('/comments', requireAdmin, asyncHandler(async (_req, res) => {
  const comments = await adminRepo.getComments();
  res.json({ comments });
}));

adminRouter.delete('/comments/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  await adminRepo.deleteComment(Number(req.params.id));
  res.json({ success: true });
}));

adminRouter.get('/categories/:type', requireAdmin, asyncHandler(async (req, res) => {
  const type = req.params.type;
  if (type !== 'recipe' && type !== 'blog') {
    res.status(400).json({ success: false });
    return;
  }
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const categories = await adminRepo.getCategories(table);
  res.json({ categories });
}));

adminRouter.post('/categories/:type', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.createCategory(String(req.params.type ?? ''), req.body?.name);
  res.json(result);
}));

adminRouter.put('/categories/:type/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.updateCategory(String(req.params.type ?? ''), req.params.id, req.body?.name);
  res.json(result);
}));

adminRouter.delete('/categories/:type/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.deleteCategory(String(req.params.type ?? ''), req.params.id);
  res.json(result);
}));

/* ================================================================
 * Marketplace Admin
 * ================================================================ */

// GET /api/admin/marketplace/products — list products (filterable by status)
adminRouter.get('/marketplace/products', requireAdmin, asyncHandler(async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  // Use direct search — for admin we include all statuses
  const { rows, total } = await marketplaceRepo.searchProducts(
    null, null, null, limit, offset, 'newest'
  );

  // For pending filter, use a dedicated query
  if (status !== 'all') {
    const { pool } = await import('../db/pool.js');
    const result = await pool.query(
      `SELECT p.*, pc.name AS category_name, pc.slug AS category_slug,
              u.full_name AS seller_name, u.avatar_url AS seller_avatar,
              sp.store_name
       FROM products p
       LEFT JOIN product_categories pc ON p.category_id = pc.id
       LEFT JOIN users u ON p.seller_id = u.id
       LEFT JOIN seller_profiles sp ON p.seller_id = sp.user_id
       WHERE p.status = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );
    const countResult = await pool.query(
      'SELECT COUNT(*) AS total FROM products WHERE status = $1',
      [status]
    );
    res.json({
      products: result.rows,
      total: Number(countResult.rows[0]?.total ?? 0),
      limit, offset,
    });
    return;
  }

  res.json({ products: rows, total, limit, offset });
}));

// POST /api/admin/marketplace/products/:id/approve
adminRouter.post('/marketplace/products/:id/approve', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const ok = await marketplaceRepo.updateProductStatus(Number(req.params.id), 'approved');
  if (!ok) { res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' }); return; }
  res.json({ success: true });
}));

// POST /api/admin/marketplace/products/:id/reject
adminRouter.post('/marketplace/products/:id/reject', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const ok = await marketplaceRepo.updateProductStatus(Number(req.params.id), 'rejected');
  if (!ok) { res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' }); return; }
  res.json({ success: true });
}));

// GET /api/admin/marketplace/sellers — list sellers
adminRouter.get('/marketplace/sellers', requireAdmin, asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  
  const { pool } = await import('../db/pool.js');
  const dataResult = await pool.query(
    `SELECT sp.*, u.full_name, u.email 
     FROM seller_profiles sp
     JOIN users u ON u.id = sp.user_id
     ORDER BY sp.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  
  const countResult = await pool.query(`SELECT COUNT(*) AS total FROM seller_profiles`);
  
  res.json({
    sellers: dataResult.rows,
    total: Number(countResult.rows[0]?.total || 0),
    limit,
    offset
  });
}));

// POST /api/admin/marketplace/sellers/:id/verify
adminRouter.post('/marketplace/sellers/:id/verify', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const isVerified = Boolean(req.body.is_verified);
  const { pool } = await import('../db/pool.js');
  const sellerId = Number(req.params.id);
  const { rowCount } = await pool.query(
    `UPDATE seller_profiles SET is_verified = $1, updated_at = NOW() WHERE user_id = $2`,
    [isVerified, sellerId]
  );
  if (!rowCount) { res.status(404).json({ success: false, message: 'Người bán không tồn tại.' }); return; }
  try {
    const profile = await sellerRepo.getSellerProfileSettings(sellerId);
    if (profile?.email) await sendSellerStatusEmail(profile.email, profile.store_name, isVerified);
  } catch (e) {
    console.warn('Failed to send seller status email', e);
  }
  res.json({ success: true });
}));

// GET /api/admin/marketplace/orders — list all orders (admin view)
adminRouter.get('/marketplace/orders', requireAdmin, asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const status = String(req.query.status ?? '').trim();

  const { pool } = await import('../db/pool.js');
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

  res.json({
    orders: dataResult.rows,
    total: Number(countResult.rows[0]?.total ?? 0),
    limit, offset,
  });
}));

// PUT /api/admin/marketplace/orders/:id/status — admin update order status
adminRouter.put('/marketplace/orders/:id/status', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await marketplaceService.updateOrderStatus(
    0, // admin doesn't need real userId
    req.params.id,
    req.body,
    true // isAdmin = true
  );
  res.json(result);
}));
