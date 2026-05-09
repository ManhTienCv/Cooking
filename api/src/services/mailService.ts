import nodemailer from 'nodemailer';
import { env } from '../env.js';

export type OtpEmailPurpose = 'register' | 'reset';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.smtpHost || !env.smtpUser) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

function otpDigits(code: string): string[] {
  const d = code.replace(/\D/g, '').slice(0, 6).padStart(6, '0');
  return d.split('');
}

function buildOtpHtml(code: string, purpose: OtpEmailPurpose, brand: string): string {
  const title =
    purpose === 'register'
      ? 'Xác thực đăng ký tài khoản'
      : 'Đặt lại mật khẩu';
  const subtitle =
    purpose === 'register'
      ? 'Bạn đang tạo tài khoản trên CookingWeb. Dùng mã bên dưới để hoàn tất.'
      : 'Bạn vừa yêu cầu đặt lại mật khẩu. Dùng mã bên dưới trong ứng dụng.';
  const digits = otpDigits(code);

  const digitBoxes = digits
    .map(
      (ch) =>
        `<td style="padding:4px 2px;">
          <div style="font-family:ui-monospace,Consolas,monospace;font-size:26px;font-weight:700;color:#0f172a;background:#fffbeb;border:2px solid #fbbf24;border-radius:12px;min-width:40px;padding:12px 0;text-align:center;line-height:1;box-shadow:0 2px 8px rgba(251,191,36,0.25);">${ch}</div>
        </td>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 45%,#b45309 100%);padding:28px 24px;text-align:center;">
              <div style="font-size:13px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:#fbbf24;margin-bottom:8px;">${brand}</div>
              <h1 style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">${title}</h1>
              <p style="margin:12px 0 0;font-size:14px;color:#cbd5e1;line-height:1.5;">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <p style="margin:0 0 16px;font-size:14px;color:#475569;font-family:system-ui,-apple-system,sans-serif;line-height:1.6;">Mã OTP của bạn (có hiệu lực <strong style="color:#0f172a;">15 phút</strong>):</p>
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                <tr>${digitBoxes}</tr>
              </table>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;font-family:system-ui,sans-serif;text-align:center;">Hoặc nhập liền: <strong style="color:#334155;letter-spacing:0.15em;font-family:ui-monospace,monospace;">${code.replace(/\s/g, '')}</strong></p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px;">
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;">
                <p style="margin:0;font-size:12px;color:#9a3412;line-height:1.55;font-family:system-ui,sans-serif;">
                  <strong>An toàn:</strong> Không chia sẻ mã này. ${brand} không bao giờ gọi điện hoặc nhắn tin để hỏi OTP. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 28px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;font-family:system-ui,sans-serif;">© ${brand} · Ẩm thực & công thức nấu ăn</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOtpText(code: string, purpose: OtpEmailPurpose, brand: string): string {
  const line =
    purpose === 'register'
      ? 'Mã xác thực đăng ký tài khoản'
      : 'Mã đặt lại mật khẩu';
  return `${brand} — ${line}\n\nMã OTP: ${code}\nCó hiệu lực trong 15 phút.\n\nKhông chia sẻ mã này cho bất kỳ ai.`;
}

function subjectForPurpose(purpose: OtpEmailPurpose, brand: string): string {
  if (purpose === 'register') return `[${brand}] Mã xác thực đăng ký`;
  return `[${brand}] Mã đặt lại mật khẩu`;
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

  const t = getTransporter();
  if (t) {
    try {
      const info = await t.sendMail({
        from: env.mailFrom,
        to,
        subject,
        text,
        html,
      });
      console.info(`[SMTP] OTP sent to ${to} — messageId: ${info.messageId}, response: ${info.response}`);
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
  const subject = `[${brand}] Đã nhận phản hồi`;
  const text = `Cảm ơn ${name} đã gửi phản hồi cho ${brand}!\n\nChúng tôi đã ghi nhận ý kiến của bạn và sẽ xem xét trong thời gian sớm nhất.\n\nTrân trọng,\nĐội ngũ ${brand}`;
  const html = `<!DOCTYPE html>
<html lang="vi">
<body>
  <h2>Cảm ơn bạn đã gửi phản hồi!</h2>
  <p>Chào <strong>${name}</strong>,</p>
  <p>Chúng tôi đã nhận được phản hồi của bạn và sẽ tiến hành xem xét trong thời gian sớm nhất.</p>
  <p>Sự đóng góp của bạn giúp <strong>${brand}</strong> ngày càng hoàn thiện hơn.</p>
  <br>
  <p>Trân trọng,</p>
  <p><strong>Đội ngũ ${brand}</strong></p>
</body>
</html>`;

  const t = getTransporter();
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
