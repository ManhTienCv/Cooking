import { Router } from 'express';
import { requireCsrf } from '../middleware/csrf.js';
import { adminLoginRateLimit } from '../middleware/rateLimits.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminRepo } from '../repos/adminRepo.js';
import * as adminService from '../services/adminService.js';
import * as marketplaceRepo from '../repos/marketplaceRepo.js';
import * as marketplaceService from '../services/marketplaceService.js';
import { pool } from '../db/pool.js';
import { httpError } from '../lib/httpError.js';
import * as ghnService from '../services/ghnService.js';
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
    delete req.session.adminId;
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
  delete req.session.adminId;
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
  const type = String(req.params.type ?? '').trim();
  if (type !== 'recipe' && type !== 'blog' && type !== 'product') {
    res.status(400).json({ success: false, message: 'Loại danh mục không hợp lệ' });
    return;
  }
  const categories = await adminRepo.getCategories(type);
  const totalCategories = categories.length;
  const totalItems = categories.reduce((sum: number, c: any) => sum + Number(c.item_count || 0), 0);
  res.json({
    categories,
    stats: {
      totalCategories,
      totalItems,
      activeRate: '100%'
    }
  });
}));

adminRouter.post('/categories/:type', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.createCategory(String(req.params.type ?? ''), req.body);
  res.json(result);
}));

adminRouter.put('/categories/:type/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.updateCategory(String(req.params.type ?? ''), req.params.id, req.body);
  res.json(result);
}));

adminRouter.delete('/categories/:type/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const result = await adminService.deleteCategory(String(req.params.type ?? ''), req.params.id);
  res.json(result);
}));

/* ================================================================
 * Marketplace Admin
 * ================================================================ */

// GET /api/admin/marketplace/stats — get marketplace KPI stats
adminRouter.get('/marketplace/stats', requireAdmin, asyncHandler(async (_req, res) => {
  const stats = await adminRepo.getMarketplaceStats();
  res.json(stats);
}));

// GET /api/admin/marketplace/products — list products (filterable by status)
adminRouter.get('/marketplace/products', requireAdmin, asyncHandler(async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);

  const { products, total } = await adminRepo.getMarketplaceProducts(status, limit, offset);

  res.json({ products, total, limit, offset });
}));

// POST /api/admin/marketplace/products — admin create new product
adminRouter.post('/marketplace/products', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const { name, category_id, price, sale_price, stock, unit, image_url, images, specs, description, product_type, is_featured, is_available } = req.body;
  if (!name || !price || !category_id) {
    res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tên, danh mục và giá sản phẩm.' });
    return;
  }
  const product = await adminRepo.createAdminProduct({
    name: String(name).trim(),
    category_id: Number(category_id),
    price: Number(price),
    sale_price: sale_price ? Number(sale_price) : null,
    stock: Number(stock) || 0,
    unit: unit ? String(unit).trim() : 'cái',
    image_url: image_url || null,
    images: Array.isArray(images) ? images : [],
    specs: specs || {},
    description: description || null,
    product_type: 'equipment',
    is_featured: Boolean(is_featured),
    is_available: is_available !== undefined ? Boolean(is_available) : true,
  });
  res.json({ success: true, product });
}));

// PUT /api/admin/marketplace/products/:id — admin update product
adminRouter.put('/marketplace/products/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const ok = await adminRepo.updateAdminProduct(productId, req.body);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Cập nhật thất bại hoặc không tìm thấy sản phẩm.' });
    return;
  }
  res.json({ success: true });
}));

// DELETE /api/admin/marketplace/products/:id — admin soft-delete product
adminRouter.delete('/marketplace/products/:id', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const ok = await adminRepo.deleteAdminProduct(productId);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Xóa thất bại hoặc không tìm thấy sản phẩm.' });
    return;
  }
  res.json({ success: true });
}));


// GET /api/admin/marketplace/orders — list all orders (admin view)
adminRouter.get('/marketplace/orders', requireAdmin, asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = Math.max(0, Number(req.query.offset) || 0);
  const status = String(req.query.status ?? '').trim();

  const { orders, total } = await adminRepo.getMarketplaceOrders(status, limit, offset);

  res.json({ orders, total, limit, offset });
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

// POST /api/admin/marketplace/orders/:id/ghn-create — Admin (Chủ cửa hàng) 1-Click tạo vận đơn GHN Express
adminRouter.post('/marketplace/orders/:id/ghn-create', requireAdmin, requireCsrf, asyncHandler(async (req, res) => {
  const orderId = Number(req.params.id);
  const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
  const order = orderRows[0];
  if (!order) {
    throw httpError(404, 'Đơn hàng không tồn tại.');
  }

  if (order.ghn_order_code) {
    return res.json({
      success: true,
      message: 'Đơn hàng đã có mã vận đơn GHN.',
      order_code: order.ghn_order_code,
    });
  }

  const { rows: itemRows } = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
  const toDistrictId = order.to_district_id || req.body.to_district_id || 1442;
  const toWardCode = order.to_ward_code || req.body.to_ward_code || '20101';
  const isPaidOnline = order.payment_status === 'paid' || order.payment_method !== 'cod';

  const ghnResult = await ghnService.createShippingOrder({
    orderId: order.id,
    toName: order.shipping_name,
    toPhone: order.shipping_phone,
    toAddress: order.shipping_address,
    toDistrictId: Number(toDistrictId),
    toWardCode: String(toWardCode),
    codAmount: order.payment_method === 'cod' ? Number(order.total_amount) : 0,
    isPaidOnline,
    paymentMethod: order.payment_method,
    items: itemRows.map((item: any) => ({
      name: item.product_name,
      quantity: item.quantity,
      price: Number(item.unit_price),
    })),
  });

  const estimatedDelivery = ghnResult.expected_delivery_time
    ? new Date(ghnResult.expected_delivery_time)
    : new Date(Date.now() + 3 * 86400000);

  await pool.query(
    `UPDATE orders
     SET status = 'shipping',
         tracking_code = $1,
         ghn_order_code = $1,
         shipping_partner = 'GHN Express',
         estimated_delivery_at = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [ghnResult.order_code, estimatedDelivery, order.id]
  );

  await pool.query(
    `INSERT INTO order_transit_logs (order_id, status, current_location, description)
     VALUES ($1, 'picked_up', 'Bưu cục GHN Tiếp nhận', $2)`,
    [order.id, `Đơn hàng đã được tạo thành công trên hệ thống GHN Express. Mã vận đơn: ${ghnResult.order_code}.`]
  );

  res.json({
    success: true,
    message: 'Tạo vận đơn GHN thành công!',
    order_code: ghnResult.order_code,
    expected_delivery_time: ghnResult.expected_delivery_time,
  });
}));
