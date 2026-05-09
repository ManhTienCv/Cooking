import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { sendOtpEmail } from './mailService.js';
import { User, UserStats } from '../types/auth.js';
import { captchaRequiredAfterFailures, recordLoginFailure, clearLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV2 } from '../lib/recaptchaVerify.js';
import { logAuthLogin } from '../lib/auditLog.js';
import type { Request } from 'express';

const OTP_EXPIRY_MS = 15 * 60 * 1000;

function normalizeEmail(s: string): string {
  return s.trim().toLowerCase();
}

function generateOtp(): string {
  if (env.nodeEnv !== 'production' && /^\d{6}$/.test(env.testOtpCode)) {
    return env.testOtpCode;
  }
  return String(randomInt(100000, 1000000));
}

export async function getCurrentUser(userId: number): Promise<{ authenticated: boolean; user?: User; stats?: UserStats }> {
  const r = await pool.query('SELECT id, full_name, email, avatar_url, bio, created_at, updated_at FROM users WHERE id = $1 LIMIT 1', [userId]);
  const user = r.rows[0];
  if (!user) return { authenticated: false };

  const s = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM recipes WHERE author_id = $1) AS recipe_count,
       (SELECT COUNT(*)::int FROM blog_posts WHERE author_id = $1) AS post_count,
       (SELECT COALESCE(SUM(views), 0)::bigint FROM recipes WHERE author_id = $1) AS recipe_views_sum`,
    [userId]
  );
  const st = s.rows[0];
  
  return {
    authenticated: true,
    user,
    stats: {
      recipe_count: Number(st.recipe_count),
      post_count: Number(st.post_count),
      recipe_views_sum: Number(st.recipe_views_sum),
    },
  };
}

export async function login(req: Request) {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email.includes('@') || !password) {
    logAuthLogin('user', { success: false, email: email || '(invalid)', req });
    throw { status: 422, message: 'Invalid login payload.' };
  }

  const needCaptcha = env.recaptchaSecretKey && captchaRequiredAfterFailures('user', req);
  if (needCaptcha) {
    const token = String((req.body as any)?.recaptchaToken ?? '');
    const ip = String(req.ip || req.socket.remoteAddress || '');
    const ok = await verifyRecaptchaV2(env.recaptchaSecretKey, token, ip);
    if (!ok) {
      throw {
        status: 400,
        message: 'Vui lòng hoàn tất xác thực reCAPTCHA.',
        captchaRequired: true,
      };
    }
  }

  const r = await pool.query(
    'SELECT id, full_name, email, password_hash, avatar_url, bio FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  const row = r.rows[0];
  if (!row || !(await bcrypt.compare(password, String(row.password_hash)))) {
    recordLoginFailure('user', req);
    logAuthLogin('user', { success: false, email, req });
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('user', req));
    throw {
      status: 401,
      message: 'Invalid email or password.',
      captchaRequired: captchaNow,
    };
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

  return { userId, user: userJson };
}

export async function requestRegisterOtp(body: any) {
  const fullName = String(body?.full_name ?? '').trim();
  const email = normalizeEmail(String(body?.email ?? ''));
  const password = String(body?.password ?? '');

  if (fullName.length < 3) throw { status: 422, message: 'Họ tên ít nhất 3 ký tự.' };
  if (!email.includes('@')) throw { status: 422, message: 'Email không hợp lệ.' };
  if (password.length < 8) throw { status: 422, message: 'Mật khẩu ít nhất 8 ký tự.' };

  const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (existing.rows.length > 0) throw { status: 409, message: 'Email đã được đăng ký.' };

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const passHash = await bcrypt.hash(password, 10);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);

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

  const sent = await sendOtpEmail(email, otp, 'register');
  if (!sent) throw { status: 503, message: 'Không gửi được email. Cấu hình SMTP trong .env hoặc xem console (chế độ dev).' };

  return { success: true, message: 'Đã gửi mã OTP đến email của bạn.' };
}

export async function verifyRegisterOtp(body: any) {
  const email = normalizeEmail(String(body?.email ?? ''));
  const otp = String(body?.otp ?? '').trim();

  if (!email.includes('@')) throw { status: 422, message: 'Email không hợp lệ.' };
  if (!/^\d{6}$/.test(otp)) throw { status: 422, message: 'Mã OTP phải gồm 6 số.' };

  const r = await pool.query(
    'SELECT email, full_name, password_hash, otp_hash, expires_at FROM pending_registrations WHERE email = $1',
    [email]
  );
  const row = r.rows[0];

  if (!row) throw { status: 400, message: 'Không có yêu cầu đăng ký cho email này. Gửi mã OTP lại ở bước trước.' };

  if (new Date(row.expires_at) < new Date()) {
    await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);
    throw { status: 400, message: 'Mã OTP đã hết hạn. Vui lòng đăng ký lại từ đầu.' };
  }

  const otpOk = await bcrypt.compare(otp, row.otp_hash);
  if (!otpOk) throw { status: 401, message: 'Mã OTP không đúng.' };

  await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);

  const ins = await pool.query(
    'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [row.full_name, email, row.password_hash]
  );
  const insertId = Number(ins.rows[0]?.id);

  return {
    userId: insertId,
    user: {
      id: insertId,
      full_name: row.full_name,
      email,
      avatar_url: null,
      bio: null,
    },
  };
}

export async function forgotPassword(emailRaw: unknown) {
  const email = normalizeEmail(String(emailRaw ?? ''));
  if (!email.includes('@')) throw { status: 422, message: 'Email không hợp lệ.' };

  const u = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
  if (u.rows.length === 0) throw { status: 404, message: 'Không tìm thấy tài khoản với email này.' };

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);
  await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3', [
    otpHash,
    exp,
    email,
  ]);

  const sent = await sendOtpEmail(email, otp, 'reset');
  if (!sent) throw { status: 503, message: 'Không gửi được email. Kiểm tra SMTP hoặc console (dev).' };

  return { success: true, message: 'Đã gửi mã OTP đến email đã đăng ký.' };
}

export async function resetPassword(body: any) {
  const email = normalizeEmail(String(body?.email ?? ''));
  const otp = String(body?.otp ?? '').trim();
  const newPassword = String(body?.new_password ?? '');

  if (!email.includes('@')) throw { status: 422, message: 'Email không hợp lệ.' };
  if (!/^\d{6}$/.test(otp)) throw { status: 422, message: 'Mã OTP phải gồm 6 số.' };
  if (newPassword.length < 8) throw { status: 422, message: 'Mật khẩu mới ít nhất 8 ký tự.' };

  const r = await pool.query(
    'SELECT id, reset_token, reset_token_expiry FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  const row = r.rows[0];

  if (!row?.reset_token || !row.reset_token_expiry) {
    throw { status: 400, message: 'Chưa có yêu cầu đặt lại mật khẩu. Dùng Quên mật khẩu để nhận OTP.' };
  }

  if (new Date(row.reset_token_expiry) < new Date()) {
    await pool.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL WHERE id = $1', [row.id]);
    throw { status: 400, message: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã.' };
  }

  const otpOk = await bcrypt.compare(otp, row.reset_token);
  if (!otpOk) throw { status: 401, message: 'Mã OTP không đúng.' };

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
    [hash, row.id]
  );

  return { success: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập.' };
}

export async function updateProfile(userId: number, body: any) {
  const fullName = String(body?.full_name ?? '').trim();
  const bio = String(body?.bio ?? '').trim() || null;

  if (fullName.length < 3) throw { status: 422, message: 'Họ và tên tối thiểu 3 ký tự.' };

  const r = await pool.query(
    'UPDATE users SET full_name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, full_name, email, avatar_url, bio',
    [fullName, bio, userId]
  );
  if (r.rows.length === 0) throw { status: 404, message: 'Người dùng không tồn tại.' };
  return { success: true, message: 'Cập nhật hồ sơ thành công.', user: r.rows[0] };
}

export async function changePassword(userId: number, body: any) {
  const currentPassword = String(body?.current_password ?? '');
  const newPassword = String(body?.new_password ?? '');

  if (newPassword.length < 8) throw { status: 422, message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' };

  const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (r.rows.length === 0) throw { status: 404, message: 'Người dùng không tồn tại.' };
  const row = r.rows[0];

  const currentMatch = await bcrypt.compare(currentPassword, String(row.password_hash));
  if (!currentMatch) throw { status: 401, message: 'Mật khẩu hiện tại không chính xác.' };

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);

  return { success: true, message: 'Đổi mật khẩu thành công.' };
}
