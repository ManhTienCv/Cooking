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

export async function sendOtpEmail(to: string, code: string, purpose: OtpEmailPurpose): Promise<boolean> {
  const brand = env.mailBrand;
  const subject = subjectForPurpose(purpose, brand);
  const text = buildOtpText(code, purpose, brand);
  const html = buildOtpHtml(code, purpose, brand);

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
      console.error('sendOtpEmail failed:', e instanceof Error ? e.message : e);
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
