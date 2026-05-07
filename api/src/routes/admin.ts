import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { isBcryptHash } from '../lib/adminPassword.js';
import { captchaRequiredAfterFailures, clearLoginFailure, recordLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV2 } from '../lib/recaptchaVerify.js';
import { requireCsrf } from '../middleware/csrf.js';
import { adminLoginRateLimit } from '../middleware/rateLimits.js';
import { logAuthLogin } from '../lib/auditLog.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { slugify } from '../data/defaultCategories.js';
import { adminRepo } from '../repos/adminRepo.js';

export const adminRouter = Router();

adminRouter.get('/me', async (req, res) => {
  const adminId = req.session.adminId;
  if (!adminId) {
    res.json({ authenticated: false });
    return;
  }
  const r = await pool.query(
    'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email FROM quantrivien WHERE "MaAD" = $1 LIMIT 1',
    [adminId]
  );
  const admin = r.rows[0];
  if (!admin) {
    req.session.adminId = undefined;
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, admin });
});

adminRouter.post('/login', adminLoginRateLimit, requireCsrf, async (req, res) => {
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    logAuthLogin('admin', { success: false, email: email || '(invalid)', req });
    res.status(422).json({ success: false, message: 'Email/password required.' });
    return;
  }

  const needCaptcha = env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req);
  if (needCaptcha) {
    const token = String((req.body as Record<string, unknown>)?.recaptchaToken ?? '');
    const ip = String(req.ip || req.socket.remoteAddress || '');
    const ok = await verifyRecaptchaV2(env.recaptchaSecretKey, token, ip);
    if (!ok) {
      res.status(400).json({
        success: false,
        message: 'Complete reCAPTCHA verification.',
        captchaRequired: true,
      });
      return;
    }
  }

  const r = await pool.query(
    'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email, "MatKhau" AS password_hash FROM quantrivien WHERE "Email" = $1 LIMIT 1',
    [email]
  );
  const admin = r.rows[0] as
    | { id: number; full_name: string; email: string; password_hash: string }
    | undefined;
  if (!admin) {
    recordLoginFailure('admin', req);
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req));
    res.status(401).json({
      success: false,
      message: 'Invalid credentials.',
      captchaRequired: captchaNow,
    });
    return;
  }

  let ok = false;
  if (isBcryptHash(admin.password_hash)) {
    try {
      ok = await bcrypt.compare(password, admin.password_hash);
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    recordLoginFailure('admin', req);
    logAuthLogin('admin', { success: false, email, req });
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req));
    res.status(401).json({
      success: false,
      message: 'Invalid credentials.',
      captchaRequired: captchaNow,
    });
    return;
  }

  clearLoginFailure('admin', req);

  const adminPayload = { id: admin.id, full_name: admin.full_name, email: admin.email };
  const adminId = Number(admin.id);

  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Login failed.' });
      return;
    }
    req.session.adminId = adminId;
    logAuthLogin('admin', { success: true, email, req, subjectId: adminId });
    res.json({ success: true, admin: adminPayload });
  });
});

adminRouter.post('/logout', requireCsrf, (req, res) => {
  req.session.adminId = undefined;
  res.json({ success: true });
});

adminRouter.get('/dashboard', requireAdmin, async (_req, res) => {
  const stats = await adminRepo.getDashboardStats();
  res.json(stats);
});

adminRouter.get('/admins', requireAdmin, async (_req, res) => {
  const admins = await adminRepo.getAdmins();
  res.json({ admins });
});

adminRouter.post('/admins/:id/reset-password', requireAdmin, requireCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid admin id.' });
    return;
  }
  const newPassword = String(req.body?.newPassword ?? '');
  if (newPassword.length < 8) {
    res.status(422).json({ success: false, message: 'Password must be at least 8 chars.' });
    return;
  }
  await adminRepo.resetAdminPassword(id, newPassword);
  res.json({ success: true, message: 'Admin password reset successful.' });
});

adminRouter.get('/users', requireAdmin, async (_req, res) => {
  const users = await adminRepo.getUsers();
  res.json({ users });
});

adminRouter.get('/recipes', requireAdmin, async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const recipes = await adminRepo.getRecipes(status);
  res.json({ recipes });
});

adminRouter.get('/blogs', requireAdmin, async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const blogs = await adminRepo.getBlogs(status);
  res.json({ blogs });
});

adminRouter.get('/feedback', requireAdmin, async (_req, res) => {
  const feedback = await adminRepo.getFeedback();
  res.json({ feedback });
});

adminRouter.post('/recipes/:id/approve', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.updateRecipeStatus(Number(req.params.id), 'approved');
  res.json({ success: true });
});

adminRouter.post('/recipes/:id/reject', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.updateRecipeStatus(Number(req.params.id), 'rejected');
  res.json({ success: true });
});

adminRouter.post('/blogs/:id/approve', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.updateBlogStatus(Number(req.params.id), 'approved');
  res.json({ success: true });
});

adminRouter.post('/blogs/:id/reject', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.updateBlogStatus(Number(req.params.id), 'rejected');
  res.json({ success: true });
});

adminRouter.delete('/users/:id', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.deleteUser(Number(req.params.id));
  res.json({ success: true });
});

adminRouter.delete('/recipes/:id', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.deleteRecipe(Number(req.params.id));
  res.json({ success: true });
});

adminRouter.delete('/blogs/:id', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.deleteBlog(Number(req.params.id));
  res.json({ success: true });
});

adminRouter.delete('/feedback/:id', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.deleteFeedback(Number(req.params.id));
  res.json({ success: true });
});

adminRouter.get('/comments', requireAdmin, async (_req, res) => {
  const comments = await adminRepo.getComments();
  res.json({ comments });
});

adminRouter.delete('/comments/:id', requireAdmin, requireCsrf, async (req, res) => {
  await adminRepo.deleteComment(Number(req.params.id));
  res.json({ success: true });
});

adminRouter.get('/categories/:type', requireAdmin, async (req, res) => {
  const type = req.params.type;
  if (type !== 'recipe' && type !== 'blog') return res.status(400).json({ success: false });
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  
  const categories = await adminRepo.getCategories(table);
  res.json({ categories });
});

adminRouter.post('/categories/:type', requireAdmin, requireCsrf, async (req, res) => {
  const type = req.params.type;
  if (type !== 'recipe' && type !== 'blog') return res.status(400).json({ success: false });
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
  const slug = slugify(name);
  if (!slug) return res.status(422).json({ success: false, message: 'Invalid category name.' });
  
  const created = await adminRepo.createCategory(table, name, slug);
  if (!created) {
    res.status(409).json({ success: false, message: 'Category already exists.' });
    return;
  }
  res.json({ success: true });
});

adminRouter.put('/categories/:type/:id', requireAdmin, requireCsrf, async (req, res) => {
  const type = req.params.type;
  if (type !== 'recipe' && type !== 'blog') return res.status(400).json({ success: false });
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid category id.' });
  
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
  const slug = slugify(name);
  if (!slug) return res.status(422).json({ success: false, message: 'Invalid category name.' });
  
  await adminRepo.updateCategory(table, id, name, slug);
  res.json({ success: true });
});

adminRouter.delete('/categories/:type/:id', requireAdmin, requireCsrf, async (req, res) => {
  const type = req.params.type;
  if (type !== 'recipe' && type !== 'blog') return res.status(400).json({ success: false });
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Invalid category id.' });
  
  await adminRepo.deleteCategory(table, id);
  res.json({ success: true });
});
