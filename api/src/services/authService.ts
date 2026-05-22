import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { sendOtpEmail } from './mailService.js';
import { User, UserStats } from '../types/auth.js';
import { captchaRequiredAfterFailures, recordLoginFailure, clearLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV3 } from '../lib/recaptchaVerify.js';
import { logAuthLogin } from '../lib/auditLog.js';
import { httpError } from '../lib/httpError.js';
import { processImageBase64 } from '../lib/processImage.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_SENDS_PER_PENDING = 5;
const OTP_MIN_RESEND_MS = 60 * 1000;
const BCRYPT_COST = 12;

const emailSchema = z.string().trim().toLowerCase().email().max(150);
const recaptchaTokenSchema = z.string().trim().max(4096).optional().default('');

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
  recaptchaToken: recaptchaTokenSchema,
});

const registerRequestSchema = z.object({
  full_name: z.string().trim().min(3).max(120),
  email: emailSchema,
  password: z.string().min(8).max(128),
  recaptchaToken: recaptchaTokenSchema,
});

const otpVerifySchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(/^\d{6}$/),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
  recaptchaToken: recaptchaTokenSchema,
});

const resetPasswordSchema = z.object({
  email: emailSchema,
  otp: z.string().trim().regex(/^\d{6}$/),
  new_password: z.string().min(8).max(128),
});

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(3).max(120),
  bio: z.string().trim().max(2000).optional().default(''),
});

const emailChangeRequestSchema = z.object({
  email: emailSchema,
});

const emailChangeVerifySchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(8).max(128),
});

type PendingRegistrationRow = {
  email: string;
  full_name: string;
  password_hash: string;
  otp_hash: string;
  expires_at: Date;
  attempt_count: number;
  resend_count: number;
  updated_at: Date;
};

type PasswordResetRow = {
  id: number;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  reset_token_attempts: number;
};

function parsePayload<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw httpError(422, parsed.error.issues[0]?.message ?? 'Dữ liệu yêu cầu không hợp lệ.', {
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

function generateOtp(): string {
  if (/^\d{6}$/.test(env.testOtpCode)) {
    return env.testOtpCode;
  }
  return String(randomInt(100000, 1000000));
}

function hashOtp(email: string, otp: string): string {
  return `hmac:${createHmac('sha256', env.sessionSecret).update(`${email}:${otp}`).digest('hex')}`;
}

async function verifyOtpHash(email: string, otp: string, storedHash: string): Promise<boolean> {
  if (/^\d{6}$/.test(env.testOtpCode) && otp === env.testOtpCode) {
    return true;
  }
  if (storedHash.startsWith('hmac:')) {
    const expected = Buffer.from(hashOtp(email, otp));
    const actual = Buffer.from(storedHash);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  return bcrypt.compare(otp, storedHash);
}

function remoteIp(req: Request): string {
  return String(req.ip || req.socket.remoteAddress || '');
}

async function verifyRecaptchaIfConfigured(
  req: Request,
  token: string,
  action: string,
  message = 'Xác minh reCAPTCHA thất bại.'
): Promise<void> {
  if (!env.recaptchaSecretKey) return;
  const ok = await verifyRecaptchaV3(env.recaptchaSecretKey, token, action, env.recaptchaMinScore, remoteIp(req));
  if (!ok) {
    throw httpError(400, message, { captchaRequired: true });
  }
}

export async function getCurrentUser(userId: number): Promise<{ authenticated: boolean; user?: User; stats?: UserStats }> {
  const r = await pool.query<User>(
    'SELECT id, full_name, email, avatar_url, bio, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  const user = r.rows[0];
  if (!user) return { authenticated: false };

  const s = await pool.query<{
    recipe_count: number;
    post_count: number;
    recipe_views_sum: string | number;
  }>(
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
  const payload = parsePayload(loginSchema, req.body);
  const needCaptcha = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('user', req));

  if (needCaptcha) {
    await verifyRecaptchaIfConfigured(req, payload.recaptchaToken, 'login', 'Vui lòng hoàn thành xác minh reCAPTCHA.');
  }

  const r = await pool.query<{
    id: number;
    full_name: string;
    email: string;
    password_hash: string;
    avatar_url: string | null;
    bio: string | null;
  }>(
    'SELECT id, full_name, email, password_hash, avatar_url, bio FROM users WHERE email = $1 LIMIT 1',
    [payload.email]
  );
  const row = r.rows[0];
  if (!row || !(await bcrypt.compare(payload.password, row.password_hash))) {
    recordLoginFailure('user', req);
    logAuthLogin('user', { success: false, email: payload.email, req });
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('user', req));
    throw httpError(401, 'Email hoặc mật khẩu không đúng.', { captchaRequired: captchaNow });
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

export async function requestRegisterOtp(req: Request) {
  const payload = parsePayload(registerRequestSchema, req.body);
  await verifyRecaptchaIfConfigured(req, payload.recaptchaToken, 'register');

  const existing = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [payload.email]);
  if (existing.rows.length > 0) throw httpError(409, 'Email này đã được đăng ký.');

  const pending = await pool.query<Pick<PendingRegistrationRow, 'expires_at' | 'resend_count' | 'updated_at'>>(
    'SELECT expires_at, resend_count, updated_at FROM pending_registrations WHERE email = $1 LIMIT 1',
    [payload.email]
  );
  const activePending = pending.rows[0];
  let resendCount = 1;
  if (activePending && activePending.expires_at > new Date()) {
    const elapsedMs = Date.now() - activePending.updated_at.getTime();
    if (elapsedMs < OTP_MIN_RESEND_MS) {
      throw httpError(429, 'Vui lòng chờ khoảng 1 phút trước khi gửi lại mã OTP.');
    }
    if (activePending.resend_count >= OTP_MAX_SENDS_PER_PENDING) {
      throw httpError(429, 'Bạn đã yêu cầu quá nhiều mã OTP. Vui lòng thử lại sau.');
    }
    resendCount = activePending.resend_count + 1;
  }

  const otp = generateOtp();
  const otpHash = hashOtp(payload.email, otp);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);
  const [sent, passHash] = await Promise.all([
    sendOtpEmail(payload.email, otp, 'register'),
    bcrypt.hash(payload.password, BCRYPT_COST),
  ]);
  if (!sent) throw httpError(503, 'Không gửi được email OTP. Vui lòng kiểm tra cấu hình SMTP hoặc thử lại sau.');

  await pool.query(
    `INSERT INTO pending_registrations (email, full_name, password_hash, otp_hash, expires_at, attempt_count, resend_count)
     VALUES ($1, $2, $3, $4, $5, 0, $6)
     ON CONFLICT (email) DO UPDATE SET
       full_name = EXCLUDED.full_name,
       password_hash = EXCLUDED.password_hash,
       otp_hash = EXCLUDED.otp_hash,
       expires_at = EXCLUDED.expires_at,
       attempt_count = 0,
       resend_count = EXCLUDED.resend_count,
       updated_at = CURRENT_TIMESTAMP`,
    [payload.email, payload.full_name, passHash, otpHash, exp, resendCount]
  );

  return { success: true, message: 'Mã OTP đã được gửi tới email của bạn.' };
}

export async function verifyRegisterOtp(body: unknown) {
  const payload = parsePayload(otpVerifySchema, body);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const r = await client.query<PendingRegistrationRow>(
      'SELECT email, full_name, password_hash, otp_hash, expires_at, attempt_count, resend_count, updated_at FROM pending_registrations WHERE email = $1 FOR UPDATE',
      [payload.email]
    );
    const row = r.rows[0];

    if (!row) throw httpError(400, 'Không tìm thấy yêu cầu đăng ký cho email này.');

    if (row.expires_at < new Date()) {
      await client.query('DELETE FROM pending_registrations WHERE email = $1', [payload.email]);
      throw httpError(400, 'Mã OTP đã hết hạn. Vui lòng đăng ký lại.');
    }

    if (row.attempt_count >= OTP_MAX_ATTEMPTS) {
      await client.query('DELETE FROM pending_registrations WHERE email = $1', [payload.email]);
      throw httpError(429, 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.');
    }

    const otpOk = await verifyOtpHash(payload.email, payload.otp, row.otp_hash);
    if (!otpOk) {
      const nextAttempts = row.attempt_count + 1;
      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        await client.query('DELETE FROM pending_registrations WHERE email = $1', [payload.email]);
        throw httpError(429, 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.');
      }
      await client.query('UPDATE pending_registrations SET attempt_count = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2', [
        nextAttempts,
        payload.email,
      ]);
      throw httpError(401, `Mã OTP không chính xác. Bạn còn lại ${OTP_MAX_ATTEMPTS - nextAttempts} lần thử.`);
    }

    await client.query('DELETE FROM pending_registrations WHERE email = $1', [payload.email]);

    const ins = await client.query<{ id: number }>(
      'INSERT INTO users (full_name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [row.full_name, payload.email, row.password_hash]
    );
    await client.query('COMMIT');

    const insertId = Number(ins.rows[0]?.id);
    return {
      userId: insertId,
      user: {
        id: insertId,
        full_name: row.full_name,
        email: payload.email,
        avatar_url: null,
        bio: null,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function forgotPassword(req: Request) {
  const payload = parsePayload(forgotPasswordSchema, req.body);
  await verifyRecaptchaIfConfigured(req, payload.recaptchaToken, 'forgot_password');

  const u = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [payload.email]);
  if (u.rows.length === 0) {
    return { success: true, message: 'Nếu email tồn tại, mã OTP đã được gửi.' };
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_COST);
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);
  await pool.query(
    'UPDATE users SET reset_token = $1, reset_token_expiry = $2, reset_token_attempts = 0 WHERE email = $3',
    [otpHash, exp, payload.email]
  );

  const sent = await sendOtpEmail(payload.email, otp, 'reset');
  if (!sent) throw httpError(503, 'Không thể gửi email chứa mã OTP.');

  return { success: true, message: 'Nếu email tồn tại, mã OTP đã được gửi.' };
}

export async function resetPassword(body: unknown) {
  const payload = parsePayload(resetPasswordSchema, body);

  const r = await pool.query<PasswordResetRow>(
    'SELECT id, reset_token, reset_token_expiry, reset_token_attempts FROM users WHERE email = $1 LIMIT 1',
    [payload.email]
  );
  const row = r.rows[0];

  if (!row?.reset_token || !row.reset_token_expiry) {
    throw httpError(400, 'Không có yêu cầu đặt lại mật khẩu nào đang hoạt động.');
  }

  if (row.reset_token_expiry < new Date()) {
    await pool.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL, reset_token_attempts = 0 WHERE id = $1', [
      row.id,
    ]);
    throw httpError(400, 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.');
  }

  if (row.reset_token_attempts >= OTP_MAX_ATTEMPTS) {
    await pool.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL, reset_token_attempts = 0 WHERE id = $1', [
      row.id,
    ]);
    throw httpError(429, 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.');
  }

  const otpOk = await bcrypt.compare(payload.otp, row.reset_token);
  if (!otpOk) {
    const nextAttempts = row.reset_token_attempts + 1;
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await pool.query('UPDATE users SET reset_token = NULL, reset_token_expiry = NULL, reset_token_attempts = 0 WHERE id = $1', [
        row.id,
      ]);
      throw httpError(429, 'Nhập sai OTP quá nhiều lần. Vui lòng yêu cầu mã mới.');
    }
    await pool.query('UPDATE users SET reset_token_attempts = $1 WHERE id = $2', [nextAttempts, row.id]);
    throw httpError(401, `Mã OTP không chính xác. Bạn còn lại ${OTP_MAX_ATTEMPTS - nextAttempts} lần thử.`);
  }

  const hash = await bcrypt.hash(payload.new_password, BCRYPT_COST);
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, reset_token_attempts = 0, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [hash, row.id]
  );

  return { success: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.' };
}

export async function updateProfile(userId: number, body: unknown) {
  const payload = parsePayload(updateProfileSchema, body);
  const bio = payload.bio.trim() || null;

  const r = await pool.query<Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url' | 'bio'>>(
    'UPDATE users SET full_name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, full_name, email, avatar_url, bio',
    [payload.full_name, bio, userId]
  );
  if (r.rows.length === 0) throw httpError(404, 'Không tìm thấy người dùng.');
  return { success: true, message: 'Cập nhật hồ sơ thành công.', user: r.rows[0] };
}

export async function requestEmailChangeOtp(userId: number, body: unknown) {
  const payload = parsePayload(emailChangeRequestSchema, body);
  const newEmail = payload.email.trim().toLowerCase();

  const current = await pool.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
  const row = current.rows[0];
  if (!row) throw httpError(404, 'Không tìm thấy người dùng.');
  if (row.email.toLowerCase() === newEmail) {
    throw httpError(400, 'Email mới trùng với email hiện tại.');
  }

  const existing = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [newEmail]);
  if (existing.rows.length > 0) throw httpError(409, 'Email đã được sử dụng.');

  const otp = generateOtp();
  const exp = new Date(Date.now() + OTP_EXPIRY_MS);
  await pool.query(
    'UPDATE users SET pending_email = $1, email_otp = $2, email_otp_expiry = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
    [newEmail, otp, exp, userId]
  );

  const sent = await sendOtpEmail(newEmail, otp, 'email_change');
  if (!sent) {
    await pool.query(
      'UPDATE users SET pending_email = NULL, email_otp = NULL, email_otp_expiry = NULL WHERE id = $1',
      [userId]
    );
    throw httpError(503, 'Không gửi được email OTP.');
  }

  return { success: true, message: 'Mã OTP đã được gửi tới email mới.' };
}

export async function verifyEmailChangeOtp(userId: number, body: unknown) {
  const payload = parsePayload(emailChangeVerifySchema, body);
  const otp = payload.otp.trim();

  const r = await pool.query<{
    email: string;
    pending_email: string | null;
    email_otp: string | null;
    email_otp_expiry: Date | null;
  }>(
    'SELECT email, pending_email, email_otp, email_otp_expiry FROM users WHERE id = $1',
    [userId]
  );
  const row = r.rows[0];
  if (!row) throw httpError(404, 'Không tìm thấy người dùng.');
  if (!row.pending_email || !row.email_otp || !row.email_otp_expiry) {
    throw httpError(400, 'Không có yêu cầu đổi email nào.');
  }
  if (row.email_otp_expiry < new Date()) {
    await pool.query(
      'UPDATE users SET pending_email = NULL, email_otp = NULL, email_otp_expiry = NULL WHERE id = $1',
      [userId]
    );
    throw httpError(400, 'OTP đã hết hạn. Vui lòng gửi lại mã.');
  }
  if (row.email_otp !== otp) {
    throw httpError(401, 'OTP không đúng.');
  }

  const existing = await pool.query<{ id: number }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [row.pending_email]);
  if (existing.rows.length > 0 && existing.rows[0].id !== userId) {
    throw httpError(409, 'Email đã được sử dụng.');
  }

  const updated = await pool.query<Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url' | 'bio'>>(
    'UPDATE users SET email = $1, pending_email = NULL, email_otp = NULL, email_otp_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, full_name, email, avatar_url, bio',
    [row.pending_email, userId]
  );
  const user = updated.rows[0];
  if (!user) throw httpError(404, 'Không tìm thấy người dùng.');

  return { success: true, message: 'Đổi email thành công.', user };
}

export async function changePassword(userId: number, body: unknown) {
  const payload = parsePayload(changePasswordSchema, body);

  const r = await pool.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (r.rows.length === 0) throw httpError(404, 'Không tìm thấy người dùng.');
  const row = r.rows[0];

  const currentMatch = await bcrypt.compare(payload.current_password, row.password_hash);
  if (!currentMatch) throw httpError(401, 'Mật khẩu hiện tại không chính xác.');

  const newHash = await bcrypt.hash(payload.new_password, BCRYPT_COST);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);

  return { success: true, message: 'Đổi mật khẩu thành công.' };
}

// Cập nhật ảnh đại diện mới của người dùng (xử lý base64 ảnh và cập nhật đường dẫn vào cơ sở dữ liệu)
export async function updateAvatar(userId: number, body: unknown) {
  const payload = parsePayload(
    z.object({
      avatar_data: z.string().trim(),
    }),
    body
  );

  const avatarUrl = processImageBase64(payload.avatar_data);
  if (!avatarUrl) throw httpError(400, 'Không thể xử lý ảnh đại diện.');

  const r = await pool.query<Pick<User, 'id' | 'full_name' | 'email' | 'avatar_url' | 'bio'>>(
    'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, full_name, email, avatar_url, bio',
    [avatarUrl, userId]
  );
  if (r.rows.length === 0) throw httpError(404, 'Không tìm thấy người dùng.');

  return { success: true, message: 'Cập nhật ảnh đại diện thành công.', user: r.rows[0] };
}

