import { lookup } from 'node:dns/promises';
import https from 'node:https';
import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';
import { env } from '../env.js';

export type OtpEmailPurpose = 'register' | 'reset' | 'seller_security' | 'ewallet' | 'email_change';

let transporter: nodemailer.Transporter | null = null;
const brevoEndpoint = new URL('https://api.brevo.com/v3/smtp/email');

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
      connectionTimeout: 6_000,
      greetingTimeout: 6_000,
      socketTimeout: 10_000,
    };
    transporter = nodemailer.createTransport(options);
  }
  return transporter;
}

async function sendResendEmail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  const apiKey = env.resendApiKey?.trim();
  if (!apiKey) return false;

  try {
    const payload = JSON.stringify({
      from: env.resendSenderEmail || `${env.mailBrand} <onboarding@resend.dev>`,
      to: [to],
      subject,
      text,
      html,
    });

    const res = await new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
      const req = https.request(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 10_000,
        },
        (response) => {
          let body = '';
          response.on('data', (d) => (body += d));
          response.on('end', () => {
            const status = response.statusCode || 0;
            resolve({ ok: status >= 200 && status < 300, status, text: body });
          });
        }
      );
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    if (!res.ok) {
      console.error('[Resend] sendEmail FAILED:', res.status, res.text);
      return false;
    }
    console.info(`[Resend] email sent to ${to}`);
    return true;
  } catch (err) {
    console.error('[Resend] sendEmail FAILED:', err);
    return false;
  }
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
  if (purpose === 'email_change') {
    return {
      title: 'Xac thuc thay doi email',
      subtitle: 'Ban vua yeu cau doi email cho tai khoan. Dung ma nay de xac nhan.',
      subject: 'Ma xac thuc doi email',
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

type BrevoSendResponse = {
  messageId?: string;
};

type BrevoHttpResponse = {
  ok: boolean;
  status: number;
  text: string;
  json?: BrevoSendResponse;
};

function getBrevoSender(): { email: string; name?: string } | null {
  const email = env.brevoSenderEmail.trim();
  if (!email) return null;
  const name = env.brevoSenderName.trim() || env.mailBrand || undefined;
  return { email, name };
}

async function sendBrevoEmail(
  to: string,
  subject: string,
  text: string,
  html: string,
  tag?: string
): Promise<boolean> {
  if (!env.brevoApiKey) {
    console.error('[Brevo] Missing BREVO_API_KEY; cannot send email.');
    return false;
  }
  const sender = getBrevoSender();
  if (!sender) {
    console.error('[Brevo] Missing BREVO_SENDER_EMAIL; cannot send email.');
    return false;
  }

  const payload = {
    sender,
    to: [{ email: to }],
    subject,
    textContent: text,
    htmlContent: html,
    tags: tag ? [tag] : undefined,
  };

  const parseJson = (raw: string): BrevoSendResponse | undefined => {
    try {
      return JSON.parse(raw) as BrevoSendResponse;
    } catch {
      return undefined;
    }
  };

  const sendRequest = async (useIpv4: boolean): Promise<BrevoHttpResponse> => {
    if (!useIpv4) {
      const res = await fetch(brevoEndpoint.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': env.brevoApiKey,
        },
        body: JSON.stringify(payload),
      });
      const raw = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        text: raw,
        json: parseJson(raw),
      };
    }

    const data = JSON.stringify(payload);
    return await new Promise<BrevoHttpResponse>((resolve, reject) => {
      const req = https.request(
        {
          protocol: brevoEndpoint.protocol,
          hostname: brevoEndpoint.hostname,
          port: brevoEndpoint.port || 443,
          path: `${brevoEndpoint.pathname}${brevoEndpoint.search}`,
          method: 'POST',
          family: 4,
          servername: brevoEndpoint.hostname,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'api-key': env.brevoApiKey,
            Host: brevoEndpoint.hostname,
          },
        },
        (res) => {
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
          });
          res.on('end', () => {
            const status = res.statusCode ?? 0;
            resolve({
              ok: status >= 200 && status < 300,
              status,
              text: body,
              json: parseJson(body),
            });
          });
        }
      );
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  };

  try {
    let res: BrevoHttpResponse;
    try {
      res = await sendRequest(false);
    } catch (err) {
      console.warn('[Brevo] Primary send failed; retrying with IPv4.', err);
      res = await sendRequest(true);
    }

    if (!res.ok) {
      console.error('[Brevo] sendEmail FAILED:', {
        to,
        status: res.status,
        body: res.text.slice(0, 500),
      });
      return false;
    }

    console.info(`[Brevo] email sent to ${to} - messageId: ${res.json?.messageId ?? 'n/a'}`);
    return true;
  } catch (err) {
    console.error('[Brevo] sendEmail FAILED:', err);
    return false;
  }
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

  // 1. Thử gửi qua Brevo HTTP API
  const sentBrevo = await sendBrevoEmail(to, subject, text, html, 'otp');
  if (sentBrevo) return true;

  // 2. Thử gửi qua Resend HTTP API (nếu có cấu hình RESEND_API_KEY)
  const sentResend = await sendResendEmail(to, subject, text, html);
  if (sentResend) return true;

  // 3. Fallback qua SMTP (Gmail App Password, v.v.)
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
      console.info(`[SMTP] OTP sent to ${to} - messageId: ${info.messageId}`);
      return true;
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      console.error('[SMTP] sendOtpEmail FAILED:', {
        to,
        code: err.code ?? '?',
        responseCode: err.responseCode ?? '?',
        message: err.message ?? String(e),
      });
    }
  }

  if (env.nodeEnv !== 'production') {
    console.info(`[dev] OTP email to ${to} (${subject}): ${code}`);
    return true;
  }

  // Nếu có testOtpCode (như "000000" trên môi trường test/demo), cho phép vượt qua và ghi log
  if (env.testOtpCode && /^\d{6}$/.test(env.testOtpCode)) {
    console.warn(`[OTP] Email delivery failed, but TEST_OTP_CODE is enabled (${env.testOtpCode}). Allowing test OTP for ${to}`);
    return true;
  }

  console.error('All email delivery methods (Brevo, Resend, SMTP) failed; cannot send OTP.');
  return false;
}

export async function sendFeedbackEmail(to: string, name: string): Promise<boolean> {
  const brand = env.mailBrand;
  const subject = `[${brand}] Da nhan phan hoi`;
  const text = `Cam on ${name} da gui phan hoi cho ${brand}.\n\nChung toi da ghi nhan y kien cua ban va se xem xet som nhat.`;
  const html = `<!DOCTYPE html><html lang="vi"><body><h2>Cam on ban da gui phan hoi!</h2><p>Chao <strong>${name}</strong>,</p><p>Chung toi da nhan duoc phan hoi cua ban.</p><p><strong>${brand}</strong></p></body></html>`;

  const sent = await sendBrevoEmail(to, subject, text, html, 'feedback');
  if (sent) return true;

  const sentResend = await sendResendEmail(to, subject, text, html);
  if (sentResend) return true;

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
    }
  }

  console.info(`[dev] Feedback email to ${to} (delivered via fallback log)`);
  return true;
}

export async function sendSellerStatusEmail(to: string, storeName: string, isVerified: boolean): Promise<boolean> {
  const brand = env.mailBrand;
  const subject = `[${brand}] Trạng thái xác minh người bán`;
  const statusText = isVerified ? 'đã được duyệt' : 'chưa được duyệt / bị hủy';
  const text = `Cửa hàng "${storeName}" ${statusText}. Vui lòng đăng nhập để xem chi tiết.`;
  const html = `<!doctype html><html lang="vi"><body><p>Xin chào,</p><p>Cửa hàng <strong>${storeName}</strong> <strong>${statusText}</strong>.</p><p>Truy cập tài khoản của bạn để biết thông tin chi tiết.</p><p><strong>${brand}</strong></p></body></html>`;

  const sent = await sendBrevoEmail(to, subject, text, html, 'seller-status');
  if (sent) return true;

  const sentResend = await sendResendEmail(to, subject, text, html);
  if (sentResend) return true;

  const t = await getTransporter();
  if (t) {
    try {
      await t.sendMail({ from: env.mailFrom, to, subject, text, html });
      return true;
    } catch (e) {
      console.error('[SMTP] sendSellerStatusEmail FAILED:', e);
    }
  }

  console.info(`[dev] sendSellerStatusEmail to ${to} (delivered via fallback log)`);
  return true;
}
