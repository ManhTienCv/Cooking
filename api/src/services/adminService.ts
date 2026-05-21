import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { isBcryptHash } from '../lib/adminPassword.js';
import { captchaRequiredAfterFailures, recordLoginFailure, clearLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV3 } from '../lib/recaptchaVerify.js';
import { logAuthLogin } from '../lib/auditLog.js';
import { slugify } from '../data/defaultCategories.js';
import { adminRepo } from '../repos/adminRepo.js';
import type { Request } from 'express';
import { httpError } from '../lib/httpError.js';

const adminLoginSchema = z.object({
  email: z.string().trim().email().max(150),
  password: z.string().min(1).max(128),
  recaptchaToken: z.string().trim().max(4096).optional().default(''),
});

function parseAdminLogin(input: unknown): z.infer<typeof adminLoginSchema> {
  const parsed = adminLoginSchema.safeParse(input);
  if (!parsed.success) {
    throw httpError(422, parsed.error.issues[0]?.message ?? 'Dữ liệu đăng nhập không hợp lệ.', {
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

export async function getMe(adminId: number) {
  const r = await pool.query(
    'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email FROM quantrivien WHERE "MaAD" = $1 LIMIT 1',
    [adminId]
  );
  const admin = r.rows[0];
  if (!admin) return { authenticated: false };
  return { authenticated: true, admin };
}

export async function login(req: Request) {
  const payload = parseAdminLogin(req.body);

  const needCaptcha = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req));
  if (needCaptcha) {
    const ip = String(req.ip || req.socket.remoteAddress || '');
    const ok = await verifyRecaptchaV3(env.recaptchaSecretKey, payload.recaptchaToken, 'admin_login', env.recaptchaMinScore, ip);
    if (!ok) {
      throw httpError(400, 'Vui lòng hoàn thành xác minh reCAPTCHA.', { captchaRequired: true });
    }
  }

  const r = await pool.query(
    'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email, "MatKhau" AS password_hash FROM quantrivien WHERE "Email" = $1 LIMIT 1',
    [payload.email]
  );
  const admin = r.rows[0];
  if (!admin) {
    recordLoginFailure('admin', req);
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req));
    throw httpError(401, 'Thông tin đăng nhập không chính xác.', { captchaRequired: captchaNow });
  }

  let ok = false;
  if (isBcryptHash(admin.password_hash)) {
    try {
      ok = await bcrypt.compare(payload.password, admin.password_hash);
    } catch {
      ok = false;
    }
  }

  if (!ok) {
    recordLoginFailure('admin', req);
    logAuthLogin('admin', { success: false, email: payload.email, req });
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req));
    throw httpError(401, 'Thông tin đăng nhập không chính xác.', { captchaRequired: captchaNow });
  }

  clearLoginFailure('admin', req);
  return {
    adminId: Number(admin.id),
    admin: { id: admin.id, full_name: admin.full_name, email: admin.email }
  };
}

export async function resetAdminPassword(idRaw: unknown, newPasswordRaw: unknown) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã quản trị viên không hợp lệ.' };
  const newPassword = String(newPasswordRaw ?? '');
  if (newPassword.length < 8) throw { status: 422, message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' };
  await adminRepo.resetAdminPassword(id, newPassword);
  return { success: true, message: 'Đặt lại mật khẩu quản trị viên thành công.' };
}

export async function createCategory(typeRaw: string, nameRaw: unknown) {
  const type = typeRaw;
  if (type !== 'recipe' && type !== 'blog') throw { status: 400, message: 'Loại danh mục không hợp lệ' };
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  
  const name = String(nameRaw ?? '').trim();
  if (!name) throw { status: 400, message: 'Tên là bắt buộc' };
  const slug = slugify(name);
  if (!slug) throw { status: 422, message: 'Tên danh mục không hợp lệ.' };
  
  const created = await adminRepo.createCategory(table, name, slug);
  if (!created) throw { status: 409, message: 'Danh mục đã tồn tại.' };
  return { success: true };
}

export async function updateCategory(typeRaw: string, idRaw: unknown, nameRaw: unknown) {
  const type = typeRaw;
  if (type !== 'recipe' && type !== 'blog') throw { status: 400, message: 'Loại danh mục không hợp lệ' };
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã danh mục không hợp lệ.' };
  
  const name = String(nameRaw ?? '').trim();
  if (!name) throw { status: 400, message: 'Name is required' };
  const slug = slugify(name);
  if (!slug) throw { status: 422, message: 'Tên danh mục không hợp lệ.' };
  
  await adminRepo.updateCategory(table, id, name, slug);
  return { success: true };
}

export async function deleteCategory(typeRaw: string, idRaw: unknown) {
  const type = typeRaw;
  if (type !== 'recipe' && type !== 'blog') throw { status: 400, message: 'Loại danh mục không hợp lệ' };
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Mã danh mục không hợp lệ.' };
  
  await adminRepo.deleteCategory(table, id);
  return { success: true };
}

export async function processWithdrawal(id: string, action: 'approve' | 'reject', adminNote: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const wRes = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE', [id]);
    if (wRes.rowCount === 0) throw new Error('Không tìm thấy yêu cầu rút tiền');
    const w = wRes.rows[0];
    if (w.status !== 'pending' && w.status !== 'processing') throw new Error('Trạng thái không hợp lệ');
    
    if (action === 'approve') {
      await client.query('UPDATE withdrawal_requests SET status = $1, admin_note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['completed', adminNote, id]);
      await client.query('UPDATE wallets SET frozen_balance = frozen_balance - $1 WHERE user_id = $2', [w.amount, w.user_id]);
      await client.query('UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND type = $3', ['completed', 'withdraw-'+id, 'withdrawal']);
    } else {
      await client.query('UPDATE withdrawal_requests SET status = $1, admin_note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', ['rejected', adminNote, id]);
      await client.query('UPDATE wallets SET balance = balance + $1, frozen_balance = frozen_balance - $1 WHERE user_id = $2', [w.amount, w.user_id]);
      await client.query('UPDATE wallet_transactions SET status = $1 WHERE reference_id = $2 AND type = $3', ['failed', 'withdraw-'+id, 'withdrawal']);
    }
    
    await client.query('COMMIT');
    return { success: true };
  } catch(e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
