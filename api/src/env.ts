import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(): void {
  const root = resolve(__dirname, '..');
  const path = resolve(root, '.env');
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadDotEnv();

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? 'development') === 'production';
}

function getEnvOrDefault(name: string, fallback: string): string {
  const val = process.env[name];
  if (val !== undefined && val.trim() !== '') return val;
  if (isProduction()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return fallback;
}

export const env = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER ?? 'Cooking',
    password: getEnvOrDefault('DB_PASSWORD', 'change-me-local-db-password'),
    database: process.env.DB_NAME ?? 'CookingDB',
  },
  sessionSecret: getEnvOrDefault('SESSION_SECRET', 'dev-only-change-me'),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  aiApiKey: process.env.AI_API_KEY ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  /** SMTP — để gửi OTP; nếu trống, dev sẽ log OTP ra console */
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'CookingWeb <noreply@localhost>',
  /** Tên hiển thị trong template email OTP */
  mailBrand: process.env.MAIL_BRAND ?? 'CookingWeb',

  /** Brevo (HTTP API) — preferred on cloud where SMTP is blocked */
  brevoApiKey: process.env.BREVO_API_KEY ?? '',
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL ?? '',
  brevoSenderName: process.env.BREVO_SENDER_NAME ?? '',

  /** Resend (HTTP API) — alternative cloud provider */
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendSenderEmail: process.env.RESEND_SENDER_EMAIL ?? '',

  /** Google reCAPTCHA v3 secret. Login checks are enforced after repeated failures. */
  otpEmailMode: (process.env.OTP_EMAIL_MODE ?? 'auto').toLowerCase(),
  testOtpCode: (process.env.NODE_ENV === 'production' ? '' : (process.env.TEST_OTP_CODE ?? '')).trim(),
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY ?? '',
  recaptchaMinScore: Number(process.env.RECAPTCHA_MIN_SCORE) || 0.5,

  /** GHN Express API */
  ghn: {
    apiUrl: process.env.GHN_API_URL ?? 'https://online-gateway.ghn.vn/shiip/public-api',
    apiToken: process.env.GHN_API_TOKEN ?? '5a8e6646-a763-11f1-be93-ea52ad3d88b7',
    shopId: Number(process.env.GHN_SHOP_ID) || 6643423,
    verifySsl: (process.env.GHN_VERIFY_SSL ?? 'false').toLowerCase() !== 'false',
    senderDistrictId: Number(process.env.GHN_SENDER_DISTRICT_ID) || 1485,
    senderWardCode: String(process.env.GHN_SENDER_WARD_CODE ?? '1A0607').replace(/['"]/g, ''),
  },

  /** MoMo Sandbox Payment Gateway */
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE ?? 'MOMOR78120260520_TEST',
    accessKey: process.env.MOMO_ACCESS_KEY ?? 'LcNmWV2YZglxe76U',
    secretKey: process.env.MOMO_SECRET_KEY ?? 'lYj7X4SNGWKIuLEbrgVjNwiNhJ2xNK6r',
    endpoint: process.env.MOMO_ENDPOINT ?? 'https://test-payment.momo.vn/v2/gateway/api/create',
    redirectUrl: process.env.MOMO_REDIRECT_URL ?? 'http://127.0.0.1:8000/order-success',
    ipnUrl: process.env.MOMO_IPN_URL ?? 'http://127.0.0.1:8000/api/v1/payment/momo/ipn',
  },
};
