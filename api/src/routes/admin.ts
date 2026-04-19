import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { hashPlainPasswordForAdminStorage, isBcryptHash } from '../lib/adminPassword.js';
import { captchaRequiredAfterFailures, clearLoginFailure, recordLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV2 } from '../lib/recaptchaVerify.js';
import { requireCsrf } from '../middleware/csrf.js';
import { adminLoginRateLimit } from '../middleware/rateLimits.js';
import { logAuthLogin } from '../lib/auditLog.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

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
  const [admins, users, recipes, blogs, feedback, pendingRecipes, pendingBlogs] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM quantrivien'),
    pool.query('SELECT COUNT(*)::int AS total FROM users'),
    pool.query('SELECT COUNT(*)::int AS total FROM recipes'),
    pool.query('SELECT COUNT(*)::int AS total FROM blog_posts'),
    pool.query('SELECT COUNT(*)::int AS total FROM feedback'),
    pool.query("SELECT COUNT(*)::int AS total FROM recipes WHERE status = 'pending'"),
    pool.query("SELECT COUNT(*)::int AS total FROM blog_posts WHERE status = 'pending'"),
  ]);

  res.json({
    admins: admins.rows[0]?.total ?? 0,
    users: users.rows[0]?.total ?? 0,
    recipes: recipes.rows[0]?.total ?? 0,
    blogs: blogs.rows[0]?.total ?? 0,
    feedback: feedback.rows[0]?.total ?? 0,
    pendingRecipes: pendingRecipes.rows[0]?.total ?? 0,
    pendingBlogs: pendingBlogs.rows[0]?.total ?? 0,
  });
});

adminRouter.get('/admins', requireAdmin, async (_req, res) => {
  const r = await pool.query(
    'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email, created_at FROM quantrivien ORDER BY "MaAD" ASC'
  );
  res.json({ admins: r.rows });
});

adminRouter.post('/admins/:id/reset-password', requireAdmin, requireCsrf, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ success: false, message: 'Invalid admin id.' });
    return;
  }
  const newPassword = String(req.body?.newPassword ?? '123456');
  if (newPassword.length < 8) {
    res.status(422).json({ success: false, message: 'Password must be at least 8 chars.' });
    return;
  }
  const hash = await hashPlainPasswordForAdminStorage(newPassword);
  await pool.query('UPDATE quantrivien SET "MatKhau" = $1 WHERE "MaAD" = $2', [hash, id]);
  res.json({ success: true, message: 'Admin password reset successful.' });
});

adminRouter.get('/users', requireAdmin, async (_req, res) => {
  const r = await pool.query(
    'SELECT id, full_name, email, avatar_url, created_at FROM users ORDER BY created_at DESC LIMIT 200'
  );
  res.json({ users: r.rows });
});

adminRouter.get('/recipes', requireAdmin, async (req, res) => {
  const status = String(req.query.status ?? 'all');
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
  res.json({ recipes: r.rows });
});

adminRouter.get('/blogs', requireAdmin, async (req, res) => {
  const status = String(req.query.status ?? 'all');
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
  res.json({ blogs: r.rows });
});

adminRouter.get('/feedback', requireAdmin, async (_req, res) => {
  const r = await pool.query(
    `SELECT f.id, f.name, f.email, f.message, f.created_at, u.full_name, u.avatar_url
     FROM feedback f
     LEFT JOIN users u ON f.user_id = u.id
     ORDER BY f.created_at DESC
     LIMIT 300`
  );
  res.json({ feedback: r.rows });
});

adminRouter.post('/recipes/:id/approve', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query("UPDATE recipes SET status = 'approved' WHERE id = $1", [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.post('/recipes/:id/reject', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query("UPDATE recipes SET status = 'rejected' WHERE id = $1", [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.post('/blogs/:id/approve', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query("UPDATE blog_posts SET status = 'approved' WHERE id = $1", [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.post('/blogs/:id/reject', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query("UPDATE blog_posts SET status = 'rejected' WHERE id = $1", [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.delete('/users/:id', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.delete('/recipes/:id', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM recipes WHERE id = $1', [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.delete('/blogs/:id', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM blog_posts WHERE id = $1', [Number(req.params.id)]);
  res.json({ success: true });
});

adminRouter.delete('/feedback/:id', requireAdmin, requireCsrf, async (req, res) => {
  await pool.query('DELETE FROM feedback WHERE id = $1', [Number(req.params.id)]);
  res.json({ success: true });
});
