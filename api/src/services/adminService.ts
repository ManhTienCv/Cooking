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
    throw httpError(422, parsed.error.issues[0]?.message ?? 'Invalid login payload.', {
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
      throw httpError(400, 'Complete reCAPTCHA verification.', { captchaRequired: true });
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
    throw httpError(401, 'Invalid credentials.', { captchaRequired: captchaNow });
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
    throw httpError(401, 'Invalid credentials.', { captchaRequired: captchaNow });
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
