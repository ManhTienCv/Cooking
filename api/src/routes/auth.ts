import { randomInt } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { ensureCsrfToken, requireCsrf } from '../middleware/csrf.js';
import {
  authForgotPasswordRateLimit,
  authLoginRateLimit,
  authRegisterOtpRateLimit,
  authRegisterRateLimit,
} from '../middleware/rateLimits.js';
import { captchaRequiredAfterFailures, clearLoginFailure, recordLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV2 } from '../lib/recaptchaVerify.js';
import { logAuthLogin } from '../lib/auditLog.js';
import { env } from '../env.js';
import { sendOtpEmail } from '../services/mailService.js';

const OTP_EXPIRY_MS = 15 * 60 * 1000;

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

export const authRouter = Router();

authRouter.use(ensureCsrfToken);

authRouter.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

authRouter.get('/me', async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.json({ authenticated: false });
    return;
  }
  const r = await pool.query('SELECT id, full_name, email, avatar_url, bio FROM users WHERE id = $1 LIMIT 1', [userId]);
  const user = r.rows[0];
  if (!user) {
    req.session.destroy(() => {
      res.json({ authenticated: false });
    });
    return;
  }
  const s = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM recipes WHERE author_id = $1) AS recipe_count,
       (SELECT COUNT(*)::int FROM blog_posts WHERE author_id = $1) AS post_count,
       (SELECT COALESCE(SUM(views), 0)::bigint FROM recipes WHERE author_id = $1) AS recipe_views_sum`,
    [userId]
  );
  const st = s.rows[0] as { recipe_count: number; post_count: number; recipe_views_sum: string | number };
  res.json({
    authenticated: true,
    user,
    stats: {
      recipe_count: Number(st.recipe_count),
      post_count: Number(st.post_count),
      recipe_views_sum: Number(st.recipe_views_sum),
    },
  });
});

authRouter.post('/login', authLoginRateLimit, requireCsrf, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email.includes('@') || !password) {
    logAuthLogin('user', { success: false, email: email || '(invalid)', req });
    res.status(422).json({ success: false, message: 'Invalid login payload.' });
    return;
  }

  const needCaptcha = env.recaptchaSecretKey && captchaRequiredAfterFailures('user', req);
  if (needCaptcha) {
    const token = String((req.body as Record<string, unknown>)?.recaptchaToken ?? '');
    const ip = String(req.ip || req.socket.remoteAddress || '');
    const ok = await verifyRecaptchaV2(env.recaptchaSecretKey, token, ip);
    if (!ok) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng hoàn tất xác thực reCAPTCHA.',
        captchaRequired: true,
      });
      return;
    }
  }

  const r = await pool.query(
    'SELECT id, full_name, email, password_hash, avatar_url, bio FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  const row = r.rows[0] as Record<string, unknown> | undefined;
  if (!row || !(await bcrypt.compare(password, String(row.password_hash)))) {
    recordLoginFailure('user', req);
    logAuthLogin('user', { success: false, email, req });
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('user', req));
    res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      captchaRequired: captchaNow,
    });
    return;
  }

  clearLoginFailure('user', req);

  const userId = Number(row.id);
  const userJson = {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    avatar_url: row.avatar_url,
    bio: row.bio,
  };

  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Login failed.' });
      return;
    }
    req.session.userId = userId;
    logAuthLogin('user', { success: true, email, req, subjectId: userId });
    res.json({
      success: true,
      message: 'Login successful.',
      user: userJson,
    });
  });
});

// Avoid raw Express "Cannot GET" if someone opens this URL in the browser.
authRouter.get('/register', (_req, res) => {
  res.status(405).setHeader('Allow', 'POST');
  res.json({
    success: false,
    message: 'Đăng ký: POST /api/auth/register/request-otp rồi /api/auth/register/verify (JSON).',
  });
});

/** Bước 1 đăng ký: gửi OTP tới email (email chưa tồn tại trong users). */
authRouter.post('/register/request-otp', authRegisterOtpRateLimit, requireCsrf, async (req, res) => {
  const fullName = String(req.body?.full_name ?? '').trim();
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const password = String(req.body?.password ?? '');

  if (fullName.length < 3) {
    res.status(422).json({ success: false, message: 'Họ tên ít nhất 3 ký tự.' });
    return;
  }
  if (!email.includes('@')) {
    res.status(422).json({ success: false, message: 'Email không hợp lệ.' });
    return;
  }
  if (password.length < 8) {
    res.status(422).json({ success: false, message: 'Mật khẩu ít nhất 8 ký tự.' });
    return;
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ success: false, message: 'Email đã được đăng ký.' });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const passHash = await bcrypt.hash(password, 10);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);

  try {
    await pool.query(
      `INSERT INTO pending_registrations (email, full_name, password_hash, otp_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         otp_hash = EXCLUDED.otp_hash,
         expires_at = EXCLUDED.expires_at,
         updated_at = CURRENT_TIMESTAMP`,
      [email, fullName, passHash, otpHash, exp]
    );
  } catch (e) {
    console.error('pending_registrations insert:', e);
    res.status(503).json({
      success: false,
      message: 'Chưa thể lưu mã đăng ký. Chạy migration database/migration_pending_registrations.sql trên CookingDB.',
    });
    return;
  }

  const sent = await sendOtpEmail(email, otp, 'register');
  if (!sent) {
    res.status(503).json({
      success: false,
      message: 'Không gửi được email. Cấu hình SMTP trong .env hoặc xem console (chế độ dev).',
    });
    return;
  }

  res.json({ success: true, message: 'Đã gửi mã OTP đến email của bạn.' });
});

/** Bước 2 đăng ký: xác thực OTP và tạo tài khoản. */
authRouter.post('/register/verify', authRegisterRateLimit, requireCsrf, async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const otp = String(req.body?.otp ?? '').trim();

  if (!email.includes('@')) {
    res.status(422).json({ success: false, message: 'Email không hợp lệ.' });
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    res.status(422).json({ success: false, message: 'Mã OTP phải gồm 6 số.' });
    return;
  }

  const r = await pool.query(
    'SELECT email, full_name, password_hash, otp_hash, expires_at FROM pending_registrations WHERE email = $1',
    [email]
  );
  const row = r.rows[0] as
    | {
        email: string;
        full_name: string;
        password_hash: string;
        otp_hash: string;
        expires_at: Date;
      }
    | undefined;

  if (!row) {
    res.status(400).json({
      success: false,
      message: 'Không có yêu cầu đăng ký cho email này. Gửi mã OTP lại ở bước trước.',
    });
    return;
  }

  if (new Date(row.expires_at) < new Date()) {
    await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);
    res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại từ đầu.' });
    return;
  }

  const otpOk = await bcrypt.compare(otp, row.otp_hash);
  if (!otpOk) {
    res.status(401).json({ success: false, message: 'Mã OTP không đúng.' });
    return;
  }

  await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);

  const ins = await pool.query(
    'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [row.full_name, email, row.password_hash]
  );
  const insertId = Number(ins.rows[0]?.id);

  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Đăng ký thất bại.' });
      return;
    }
    req.session.userId = insertId;
    res.json({
      success: true,
      message: 'Đăng ký thành công.',
      user: {
        id: insertId,
        full_name: row.full_name,
        email,
        avatar_url: null,
        bio: null,
      },
    });
  });
});

authRouter.post('/forgot-password', authForgotPasswordRateLimit, requireCsrf, async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  if (!email.includes('@')) {
    res.status(422).json({ success: false, message: 'Email không hợp lệ.' });
    return;
  }

  const u = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (u.rows.length === 0) {
    res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản với email này.' });
    return;
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);
  await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3', [
    otpHash,
    exp,
    email,
  ]);

  const sent = await sendOtpEmail(email, otp, 'reset');
  if (!sent) {
    res.status(503).json({
      success: false,
      message: 'Không gửi được email. Kiểm tra SMTP hoặc console (dev).',
    });
    return;
  }

  res.json({ success: true, message: 'Đã gửi mã OTP đến email đã đăng ký.' });
});

authRouter.post('/reset-password', requireCsrf, async (req, res) => {
  const email = normalizeEmail(String(req.body?.email ?? ''));
  const otp = String(req.body?.otp ?? '').trim();
  const newPassword = String(req.body?.new_password ?? '');

  if (!email.includes('@')) {
    res.status(422).json({ success: false, message: 'Email không hợp lệ.' });
    return;
  }
  if (!/^\d{6}$/.test(otp)) {
    res.status(422).json({ success: false, message: 'Mã OTP phải gồm 6 số.' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(422).json({ success: false, message: 'Mật khẩu mới ít nhất 8 ký tự.' });
    return;
  }

  const r = await pool.query(
    'SELECT id, reset_token, reset_token_expiry FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  const row = r.rows[0] as
    | { id: number; reset_token: string | null; reset_token_expiry: Date | null }
    | undefined;

  if (!row?.reset_token || !row.reset_token_expiry) {
    res.status(400).json({
      success: false,
      message: 'Chưa có yêu cầu đặt lại mật khẩu. Dùng Quên mật khẩu để nhận OTP.',
    });
    return;
  }

  if (new Date(row.reset_token_expiry) < new Date()) {
    await pool.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = $1', [
      row.id,
    ]);
    res.status(400).json({ success: false, message: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.' });
    return;
  }

  const otpOk = await bcrypt.compare(otp, row.reset_token);
  if (!otpOk) {
    res.status(401).json({ success: false, message: 'Mã OTP không đúng.' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
    [hash, row.id]
  );

  res.json({ success: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.' });
});

authRouter.post('/logout', requireCsrf, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Logout failed.' });
      return;
    }
    res.clearCookie('cook.sid', { path: '/' });
    res.json({ success: true, message: 'Logout successful.' });
  });
});
