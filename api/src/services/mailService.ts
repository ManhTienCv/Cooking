import { lookup } from 'node:dns/promises';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { env } from '../env.js';

export type OtpEmailPurpose = 'register' | 'reset' | 'seller_security' | 'ewallet';

let transporter: nodemailer.Transporter | null = null;

async function resolveSmtpHost(host: string): Promise<string> {
  try {
    const result = await lookup(host, { family: 4 });
    return result.address;
  } catch (err) {
    console.warn('[SMTP] IPv4 DNS lookup failed; falling back to configured host:', err);
    return host;
  }
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (!env.smtpHost || !env.smtpUser) return null;
  if (!transporter) {
    const smtpHost = await resolveSmtpHost(env.smtpHost);
    const options: SMTPTransport.Options = {
      host: smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      tls: { rejectUnauthorized: false, servername: env.smtpHost },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    };
    transporter = nodemailer.createTransport(options);
  }
  return transporter;
}

function otpDigits(code: string): string[] {
  return code.replace(/\D/g, '').slice(0, 6).padStart(6, '0').split('');
}

function copyForPurpose(purpose: OtpEmailPurpose): { title: string; subtitle: string; subject: string } {
  if (purpose === 'register') {
    return {
      title: 'Xac thuc dang ky tai khoan',
      subtitle: 'Ban dang tao tai khoan. Dung ma ben duoi de hoan tat dang ky.',
      subject: 'Ma xac thuc dang ky',
    };
  }
  if (purpose === 'seller_security') {
    return {
      title: 'Xac thuc bao mat nguoi ban',
      subtitle: 'Ban dang thuc hien thao tac nhay cam cho kenh ban hang. Dung ma nay de xac nhan.',
      subject: 'Ma xac thuc nguoi ban',
    };
  }
  if (purpose === 'ewallet') {
    return {
      title: 'Xac thuc Vi Dien Tu',
      subtitle: 'Ban dang thuc hien yeu cau rut tien hoac them Ngan hang. Dung ma nay de xac nhan.',
      subject: 'Ma xac thuc Vi Dien Tu',
    };
  }
  return {
    title: 'Dat lai mat khau',
    subtitle: 'Ban vua yeu cau dat lai mat khau. Dung ma ben duoi trong ung dung.',
    subject: 'Ma dat lai mat khau',
  };
}

function buildOtpHtml(code: string, purpose: OtpEmailPurpose, brand: string): string {
  const copy = copyForPurpose(purpose);
  const digitBoxes = otpDigits(code)
    .map(
      (ch) =>
        `<td style="padding:4px 2px;"><div style="font-family:ui-monospace,Consolas,monospace;font-size:26px;font-weight:700;color:#0f172a;background:#fffbeb;border:2px solid #fbbf24;border-radius:12px;min-width:40px;padding:12px 0;text-align:center;line-height:1;box-shadow:0 2px 8px rgba(251,191,36,0.25);">${ch}</div></td>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 45%,#b45309 100%);padding:28px 24px;text-align:center;">
          <div style="font-size:13px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#fbbf24;margin-bottom:8px;">${brand}</div>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${copy.title}</h1>
          <p style="margin:12px 0 0;font-size:14px;color:#cbd5e1;line-height:1.5;">${copy.subtitle}</p>
        </td></tr>
        <tr><td style="padding:28px 24px 8px;">
          <p style="margin:0 0 16px;font-size:14px;color:#475569;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;">Ma OTP cua ban co hieu luc trong <strong style="color:#0f172a;">5 phut</strong>:</p>
          <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;"><tr>${digitBoxes}</tr></table>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;font-family:system-ui,sans-serif;text-align:center;">Hoac nhap lien: <strong style="color:#334155;letter-spacing:0.15em;font-family:ui-monospace,monospace;">${code.replace(/\s/g, '')}</strong></p>
        </td></tr>
        <tr><td style="padding:0 24px 24px;">
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;">
            <p style="margin:0;font-size:12px;color:#9a3412;line-height:1.55;font-family:system-ui,sans-serif;"><strong>An toan:</strong> Khong chia se ma nay. ${brand} khong bao gio hoi OTP qua dien thoai hoac tin nhan.</p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px 28px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#94a3b8;font-family:system-ui,sans-serif;">${brand}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOtpText(code: string, purpose: OtpEmailPurpose, brand: string): string {
  const copy = copyForPurpose(purpose);
  return `${brand} - ${copy.subject}\n\nMa OTP: ${code}\nHieu luc trong 5 phut.\n\nKhong chia se ma nay cho bat ky ai.`;
}

function subjectForPurpose(purpose: OtpEmailPurpose, brand: string): string {
  return `[${brand}] ${copyForPurpose(purpose).subject}`;
}

function normalizeRecipient(to: string): { local: string; domain: string } {
  const email = to.trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return { local: email, domain: '' };
  return {
    local: email.slice(0, at),
    domain: email.slice(at + 1),
  };
}

function isReservedTestRecipient(to: string): boolean {
  const { local, domain } = normalizeRecipient(to);
  return (
    domain === 'localhost' ||
    domain === 'test.com' ||
    domain.endsWith('.local') ||
    domain.endsWith('.test') ||
    local.startsWith('test+') ||
    local.startsWith('verify_') ||
    local.startsWith('autotest+')
  );
}

function shouldLogOtpOnly(to: string): boolean {
  if (env.otpEmailMode === 'console') return true;
  if (env.otpEmailMode === 'smtp') return false;
  return env.nodeEnv !== 'production' && isReservedTestRecipient(to);
}

function logOtpOnly(to: string, subject: string, code: string, reason: string): void {
  console.info(`[OTP:${reason}] Email delivery skipped for ${to} (${subject}). OTP: ${code}`);
}

export async function sendOtpEmail(to: string, code: string, purpose: OtpEmailPurpose): Promise<boolean> {
  const brand = env.mailBrand;
  const subject = subjectForPurpose(purpose, brand);
  const text = buildOtpText(code, purpose, brand);
  const html = buildOtpHtml(code, purpose, brand);

  if (shouldLogOtpOnly(to)) {
    logOtpOnly(to, subject, code, env.otpEmailMode === 'console' ? 'console-mode' : 'test-recipient');
    return true;
  }

  const t = await getTransporter();
  if (t) {
    try {
      const info = await t.sendMail({
        from: env.mailFrom,
        to,
        subject,
        text,
        html,
      });
      console.info(`[SMTP] OTP sent to ${to} - messageId: ${info.messageId}, response: ${info.response}`);
      return true;
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      console.error('[SMTP] sendOtpEmail FAILED:', {
        to,
        code: err.code ?? '?',
        responseCode: err.responseCode ?? '?',
        response: err.response ?? '?',
        message: err.message ?? String(e),
        command: err.command ?? '?',
      });
      return false;
    }
  }

  if (env.nodeEnv !== 'production') {
    console.info(`[dev] OTP email to ${to} (${subject}): ${code}`);
    return true;
  }

  console.error('SMTP not configured; cannot send OTP in production.');
  return false;
}

export async function sendFeedbackEmail(to: string, name: string): Promise<boolean> {
  const brand = env.mailBrand;
  const subject = `[${brand}] Da nhan phan hoi`;
  const text = `Cam on ${name} da gui phan hoi cho ${brand}.\n\nChung toi da ghi nhan y kien cua ban va se xem xet som nhat.`;
  const html = `<!DOCTYPE html><html lang="vi"><body><h2>Cam on ban da gui phan hoi!</h2><p>Chao <strong>${name}</strong>,</p><p>Chung toi da nhan duoc phan hoi cua ban.</p><p><strong>${brand}</strong></p></body></html>`;

  const t = await getTransporter();
  if (t) {
    try {
      await t.sendMail({
        from: env.mailFrom,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (e) {
      console.error('[SMTP] sendFeedbackEmail FAILED:', e);
      return false;
    }
  }

  console.info(`[dev] Feedback email to ${to} (not sent because SMTP not configured)`);
  return false;
}

export async function sendSellerStatusEmail(to: string, storeName: string, isVerified: boolean): Promise<boolean> {
  const brand = env.mailBrand;
  const subject = `[${brand}] Trạng thái xác minh người bán`;
  const statusText = isVerified ? 'đã được duyệt' : 'chưa được duyệt / bị hủy';
  const text = `Cửa hàng "${storeName}" ${statusText}. Vui lòng đăng nhập để xem chi tiết.`;
  const html = `<!doctype html><html lang="vi"><body><p>Xin chào,</p><p>Cửa hàng <strong>${storeName}</strong> <strong>${statusText}</strong>.</p><p>Truy cập tài khoản của bạn để biết thông tin chi tiết.</p><p><strong>${brand}</strong></p></body></html>`;

  const t = await getTransporter();
  if (t) {
    try {
      await t.sendMail({ from: env.mailFrom, to, subject, text, html });
      return true;
    } catch (e) {
      console.error('[SMTP] sendSellerStatusEmail FAILED:', e);
      return false;
    }
  }
  console.info(`[dev] sendSellerStatusEmail to ${to} (not sent because SMTP not configured)`);
  return false;
}
