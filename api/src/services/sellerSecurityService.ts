import { createCipheriv, createHash, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { z } from 'zod';
import { env } from '../env.js';
import { httpError } from '../lib/httpError.js';
import { sendOtpEmail } from './mailService.js';
import * as sellerRepo from '../repos/sellerSettingsRepo.js';

const BCRYPT_COST = 12;
const STEP_UP_TTL_MS = 15 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SESSION_TTL_MS = 10 * 60 * 1000;
export const SELLER_SECURITY_PURPOSE = 'seller_payout';

const passwordSchema = z.object({
  password: z.string().min(1).max(128),
});

const otpSchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/),
});

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

function verifiedUntil(verifiedAt?: number): number | null {
  if (!verifiedAt) return null;
  const until = verifiedAt + STEP_UP_TTL_MS;
  return until > Date.now() ? until : null;
}

export function getSellerSecurityState(req: Request) {
  const passwordVerifiedUntil = verifiedUntil(req.session.sellerSecurityVerifiedAt);
  const otpVerifiedAt = req.session.sellerOtpVerifiedAt;
  const otpVerifiedUntil =
    otpVerifiedAt && req.session.sellerOtpPurpose === SELLER_SECURITY_PURPOSE && otpVerifiedAt + OTP_SESSION_TTL_MS > Date.now()
      ? otpVerifiedAt + OTP_SESSION_TTL_MS
      : null;

  return {
    passwordVerified: Boolean(passwordVerifiedUntil),
    passwordVerifiedUntil,
    otpVerified: Boolean(otpVerifiedUntil),
    otpVerifiedUntil,
  };
}

export async function verifySellerPassword(req: Request) {
  const userId = req.session.userId;
  if (!userId) throw httpError(401, 'Vui lòng đăng nhập.');

  const payload = parsePayload(passwordSchema, req.body);
  const row = await sellerRepo.getUserPasswordAndEmail(userId);
  if (!row) throw httpError(404, 'Không tìm thấy người dùng.');

  const ok = await bcrypt.compare(payload.password, row.password_hash);
  if (!ok) throw httpError(401, 'Mật khẩu không chính xác.');

  const now = Date.now();
  req.session.sellerSecurityVerifiedAt = now;
  req.session.sellerOtpVerifiedAt = undefined;
  req.session.sellerOtpPurpose = undefined;

  return {
    success: true,
    security: getSellerSecurityState(req),
  };
}

export async function requestSellerOtp(req: Request) {
  const userId = req.session.userId;
  if (!userId) throw httpError(401, 'Vui lòng đăng nhập.');

  const row = await sellerRepo.getUserPasswordAndEmail(userId);
  if (!row) throw httpError(404, 'Không tìm thấy người dùng.');

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_COST);
  await sellerRepo.deleteOpenChallenges(userId, SELLER_SECURITY_PURPOSE);
  await sellerRepo.createSecurityChallenge(userId, SELLER_SECURITY_PURPOSE, otpHash, new Date(Date.now() + OTP_TTL_MS));

  const sent = await sendOtpEmail(row.email, otp, 'seller_security');
  if (!sent) throw httpError(503, 'Không thể gửi email chứa mã OTP.');

  return { success: true, message: 'Mã OTP đã được gửi đến email của bạn.' };
}

export async function verifySellerOtp(req: Request) {
  const userId = req.session.userId;
  if (!userId) throw httpError(401, 'Vui lòng đăng nhập.');

  const payload = parsePayload(otpSchema, req.body);
  const challenge = await sellerRepo.getLatestSecurityChallenge(userId, SELLER_SECURITY_PURPOSE);
  if (!challenge) throw httpError(400, 'Không tìm thấy yêu cầu OTP đang hoạt động.');
  if (challenge.expires_at < new Date()) {
    await sellerRepo.deleteOpenChallenges(userId, SELLER_SECURITY_PURPOSE);
    throw httpError(400, 'Mã OTP đã hết hạn.');
  }
  if (challenge.attempt_count >= OTP_MAX_ATTEMPTS) {
    await sellerRepo.deleteOpenChallenges(userId, SELLER_SECURITY_PURPOSE);
    throw httpError(429, 'Bạn đã nhập sai OTP quá nhiều lần.');
  }

  const ok = (/^\d{6}$/.test(env.testOtpCode) && payload.otp === env.testOtpCode) || (await bcrypt.compare(payload.otp, challenge.otp_hash));
  if (!ok) {
    const nextAttempts = challenge.attempt_count + 1;
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await sellerRepo.deleteOpenChallenges(userId, SELLER_SECURITY_PURPOSE);
      throw httpError(429, 'Bạn đã nhập sai OTP quá nhiều lần.');
    }
    await sellerRepo.incrementChallengeAttempts(challenge.id, nextAttempts);
    throw httpError(401, `Mã OTP không chính xác. Bạn còn lại ${OTP_MAX_ATTEMPTS - nextAttempts} lần thử.`);
  }

  await sellerRepo.consumeChallenge(challenge.id);
  req.session.sellerOtpVerifiedAt = Date.now();
  req.session.sellerOtpPurpose = SELLER_SECURITY_PURPOSE;

  return { success: true, security: getSellerSecurityState(req) };
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(env.sessionSecret).digest();
}

export function encryptSensitiveText(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}
