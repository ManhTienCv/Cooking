import { z } from 'zod';
import { verifyRecaptchaV3 } from '../lib/recaptchaVerify.js';
import { env } from '../env.js';
import { httpError } from '../lib/httpError.js';
import * as sellerRepo from '../repos/sellerSettingsRepo.js';
import { encryptSensitiveText } from './sellerSecurityService.js';

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const storeSchema = z.object({
  store_name: z.string().trim().min(2).max(200),
  store_description: nullableText(1000),
  phone: nullableText(20),
  address: nullableText(500),
});

const verificationSchema = z.object({
  legal_name: z.string().trim().min(3).max(160),
  business_type: z.enum(['individual', 'household', 'company']).default('individual'),
  tax_code: nullableText(40),
  identity_number: z.string().trim().min(6).max(32).regex(/^[A-Za-z0-9-]+$/),
});

const preferencesSchema = z.object({
  chat_enabled: z.boolean(),
  order_notifications: z.boolean(),
  account_notifications: z.boolean(),
  marketing_notifications: z.boolean(),
  profile_visible: z.boolean(),
  show_phone: z.boolean(),
  show_address: z.boolean(),
});

const payoutSchema = z.object({
  bank_name: z.string().trim().min(2).max(120),
  account_name: z.string().trim().min(2).max(160),
  account_number: z.string().trim().min(4).max(40).regex(/^[0-9A-Za-z -]+$/),
  is_default: z.boolean().optional().default(false),
});

function parsePayload<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw httpError(422, parsed.error.issues[0]?.message ?? 'Invalid request payload.', {
      details: parsed.error.flatten(),
    });
  }
  return parsed.data;
}

function maskPayout(row: sellerRepo.SellerPayoutAccountRow) {
  return {
    id: row.id,
    bank_name: row.bank_name,
    account_name: row.account_name,
    account_number_last4: row.account_number_last4,
    is_default: row.is_default,
    verification_status: row.verification_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getSettings(userId: number) {
  const profile = await sellerRepo.getSellerProfileSettings(userId);
  if (!profile) throw httpError(403, 'Ban chua dang ky ban hang.');

  const settings = await sellerRepo.ensureSellerSettings(userId);
  const payoutAccounts = await sellerRepo.listPayoutAccounts(userId);

  return {
    profile,
    settings,
    payout_accounts: payoutAccounts.map(maskPayout),
  };
}

export async function updateStore(userId: number, body: unknown) {
  const payload = parsePayload(storeSchema, body);
  const profile = await sellerRepo.updateStoreProfile(userId, payload);
  if (!profile) throw httpError(404, 'Seller profile not found.');
  return { success: true, profile };
}

export async function submitVerification(userId: number, body: unknown) {
  const payload = parsePayload(verificationSchema, body);
  // server-side recaptcha v3: if configured, require token inside body
  const token = (body as any)?.recaptcha_token as string | undefined;
  if (env.recaptchaSecretKey) {
    if (!token) throw httpError(403, 'Missing reCAPTCHA token.');
    const ok = await verifyRecaptchaV3(env.recaptchaSecretKey, token, 'seller_verification', env.recaptchaMinScore);
    if (!ok) {
      throw httpError(403, 'reCAPTCHA verification failed.');
    }
  }
  const identityLast4 = payload.identity_number.replace(/\D/g, '').slice(-4).padStart(4, '0');
  const profile = await sellerRepo.updateVerificationProfile(userId, {
    legal_name: payload.legal_name,
    business_type: payload.business_type,
    tax_code: payload.tax_code,
    identity_last4: identityLast4,
  });
  if (!profile) throw httpError(404, 'Seller profile not found.');
  return { success: true, profile };
}

export async function updatePreferences(userId: number, body: unknown) {
  const payload = parsePayload(preferencesSchema, body);
  const settings = await sellerRepo.updatePreferences(userId, payload);
  return { success: true, settings };
}

export async function createPayoutAccount(userId: number, body: unknown) {
  const payload = parsePayload(payoutSchema, body);
  const compactAccount = payload.account_number.replace(/\s+/g, '');
  const last4 = compactAccount.slice(-4);
  const account = await sellerRepo.createPayoutAccount(userId, {
    bank_name: payload.bank_name,
    account_name: payload.account_name,
    account_number_encrypted: encryptSensitiveText(compactAccount),
    account_number_last4: last4,
    is_default: payload.is_default,
  });
  return { success: true, payout_account: maskPayout(account) };
}

export async function deletePayoutAccount(userId: number, idRaw: unknown) {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Invalid payout account ID.');
  const ok = await sellerRepo.deletePayoutAccount(userId, id);
  if (!ok) throw httpError(404, 'Payout account not found.');
  return { success: true };
}

export async function setDefaultPayoutAccount(userId: number, idRaw: unknown) {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Invalid payout account ID.');
  const ok = await sellerRepo.setDefaultPayoutAccount(userId, id);
  if (!ok) throw httpError(404, 'Payout account not found.');
  return { success: true };
}
