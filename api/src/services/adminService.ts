import bcrypt from 'bcryptjs';
import { pool } from '../db/pool.js';
import { env } from '../env.js';
import { isBcryptHash } from '../lib/adminPassword.js';
import { captchaRequiredAfterFailures, recordLoginFailure, clearLoginFailure } from '../lib/loginFailures.js';
import { verifyRecaptchaV2 } from '../lib/recaptchaVerify.js';
import { logAuthLogin } from '../lib/auditLog.js';
import { slugify } from '../data/defaultCategories.js';
import { adminRepo } from '../repos/adminRepo.js';
import type { Request } from 'express';

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
  const email = String(req.body?.email ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    logAuthLogin('admin', { success: false, email: email || '(invalid)', req });
    throw { status: 422, message: 'Email/password required.' };
  }

  const needCaptcha = env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req);
  if (needCaptcha) {
    const token = String((req.body as any)?.recaptchaToken ?? '');
    const ip = String(req.ip || req.socket.remoteAddress || '');
    const ok = await verifyRecaptchaV2(env.recaptchaSecretKey, token, ip);
    if (!ok) {
      throw {
        status: 400,
        message: 'Complete reCAPTCHA verification.',
        captchaRequired: true,
      };
    }
  }

  const r = await pool.query(
    'SELECT "MaAD" AS id, "HoTen" AS full_name, "Email" AS email, "MatKhau" AS password_hash FROM quantrivien WHERE "Email" = $1 LIMIT 1',
    [email]
  );
  const admin = r.rows[0];
  if (!admin) {
    recordLoginFailure('admin', req);
    const captchaNow = Boolean(env.recaptchaSecretKey && captchaRequiredAfterFailures('admin', req));
    throw { status: 401, message: 'Invalid credentials.', captchaRequired: captchaNow };
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
    throw { status: 401, message: 'Invalid credentials.', captchaRequired: captchaNow };
  }

  clearLoginFailure('admin', req);
  return {
    adminId: Number(admin.id),
    admin: { id: admin.id, full_name: admin.full_name, email: admin.email }
  };
}

export async function resetAdminPassword(idRaw: unknown, newPasswordRaw: unknown) {
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid admin id.' };
  const newPassword = String(newPasswordRaw ?? '');
  if (newPassword.length < 8) throw { status: 422, message: 'Password must be at least 8 chars.' };
  await adminRepo.resetAdminPassword(id, newPassword);
  return { success: true, message: 'Admin password reset successful.' };
}

export async function createCategory(typeRaw: string, nameRaw: unknown) {
  const type = typeRaw;
  if (type !== 'recipe' && type !== 'blog') throw { status: 400, message: 'Invalid category type' };
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  
  const name = String(nameRaw ?? '').trim();
  if (!name) throw { status: 400, message: 'Name is required' };
  const slug = slugify(name);
  if (!slug) throw { status: 422, message: 'Invalid category name.' };
  
  const created = await adminRepo.createCategory(table, name, slug);
  if (!created) throw { status: 409, message: 'Category already exists.' };
  return { success: true };
}

export async function updateCategory(typeRaw: string, idRaw: unknown, nameRaw: unknown) {
  const type = typeRaw;
  if (type !== 'recipe' && type !== 'blog') throw { status: 400, message: 'Invalid category type' };
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid category id.' };
  
  const name = String(nameRaw ?? '').trim();
  if (!name) throw { status: 400, message: 'Name is required' };
  const slug = slugify(name);
  if (!slug) throw { status: 422, message: 'Invalid category name.' };
  
  await adminRepo.updateCategory(table, id, name, slug);
  return { success: true };
}

export async function deleteCategory(typeRaw: string, idRaw: unknown) {
  const type = typeRaw;
  if (type !== 'recipe' && type !== 'blog') throw { status: 400, message: 'Invalid category type' };
  const table = type === 'recipe' ? 'recipe_categories' : 'blog_categories';
  const id = Number(idRaw);
  if (!id) throw { status: 400, message: 'Invalid category id.' };
  
  await adminRepo.deleteCategory(table, id);
  return { success: true };
}
