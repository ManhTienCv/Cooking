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

  /** SMTP — để gửi OTP; nếu trống, dev sẽ log OTP ra console */
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: (process.env.SMTP_SECURE ?? '').toLowerCase() === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? 'CookingWeb <noreply@localhost>',
  /** Tên hiển thị trong template email OTP */
  mailBrand: process.env.MAIL_BRAND ?? 'CookingWeb',

  /** Google reCAPTCHA v2 secret — bắt buộc sau N lần đăng nhập sai (xem loginFailures) */
  recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY ?? '',
};
