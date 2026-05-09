import { Router } from 'express';
import { requireCsrf } from '../middleware/csrf.js';
import { adminLoginRateLimit } from '../middleware/rateLimits.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { adminRepo } from '../repos/adminRepo.js';
import * as adminService from '../services/adminService.js';
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

  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Login failed.' });
      return;
    }
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
