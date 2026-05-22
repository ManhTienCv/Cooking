import { Router } from 'express';
import { ensureCsrfToken, requireCsrf } from '../middleware/csrf.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  authForgotPasswordRateLimit,
  authLoginRateLimit,
  authRegisterOtpRateLimit,
  authRegisterRateLimit,
} from '../middleware/rateLimits.js';
import { logAuthLogin } from '../lib/auditLog.js';
import * as authService from '../services/authService.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { env } from '../env.js';

export const authRouter = Router();

function isLocalOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

const usesCrossSiteHttpsCookies =
  env.nodeEnv === 'production' ||
  env.corsOrigins.some((origin) => origin.startsWith('https://') && !isLocalOrigin(origin));
const sessionCookieOptions = {
  path: '/',
  sameSite: usesCrossSiteHttpsCookies ? 'none' : 'lax',
  secure: usesCrossSiteHttpsCookies,
} as const;

authRouter.use(ensureCsrfToken);

authRouter.get('/csrf', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

authRouter.get('/me', asyncHandler(async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    res.json({ authenticated: false });
    return;
  }
  const result = await authService.getCurrentUser(userId);
  if (!result.authenticated) {
    req.session.destroy(() => {
      res.json({ authenticated: false });
    });
    return;
  }
  res.json(result);
}));

authRouter.post('/login', authLoginRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const { userId, user } = await authService.login(req);

  const oldCsrfToken = req.session.csrfToken;
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Login failed.' });
      return;
    }
    req.session.csrfToken = oldCsrfToken;
    req.session.userId = userId;
    logAuthLogin('user', { success: true, email: user.email, req, subjectId: userId });
    res.json({
      success: true,
      message: 'Login successful.',
      user,
    });
  });
}));

// Avoid raw Express "Cannot GET" if someone opens this URL in the browser.
authRouter.get('/register', (_req, res) => {
  res.status(405).setHeader('Allow', 'POST');
  res.json({
    success: false,
    message: 'Đăng ký: POST /api/auth/register/request-otp rồi /api/auth/register/verify (JSON).',
  });
});

/** Bước 1 đăng ký: gửi OTP tới email (email chưa tồn tại trong users). */
authRouter.post('/register/request-otp', authRegisterOtpRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.requestRegisterOtp(req);
  res.json(result);
}));

/** Bước 2 đăng ký: xác thực OTP và tạo tài khoản. */
authRouter.post('/register/verify', authRegisterRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const { userId, user } = await authService.verifyRegisterOtp(req.body);

  const oldCsrfToken = req.session.csrfToken;
  req.session.regenerate((regenErr) => {
    if (regenErr) {
      res.status(500).json({ success: false, message: 'Đăng ký thất bại.' });
      return;
    }
    req.session.csrfToken = oldCsrfToken;
    req.session.userId = userId;
    res.json({
      success: true,
      message: 'Đăng ký thành công.',
      user,
    });
  });
}));

authRouter.post('/forgot-password', authForgotPasswordRateLimit, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req);
  res.json(result);
}));

authRouter.post('/reset-password', requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json(result);
}));

authRouter.post('/profile', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.updateProfile(req.session.userId!, req.body);
  res.json(result);
}));

authRouter.post('/avatar', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.updateAvatar(req.session.userId!, req.body);
  res.json(result);
}));


authRouter.post('/email/request-otp', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.requestEmailChangeOtp(req.session.userId!, req.body);
  res.json(result);
}));

authRouter.post('/email/verify', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.verifyEmailChangeOtp(req.session.userId!, req.body);
  res.json(result);
}));

authRouter.post('/password', requireAuth, requireCsrf, asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.session.userId!, req.body);
  res.json(result);
}));

authRouter.post('/logout', requireCsrf, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ success: false, message: 'Logout failed.' });
      return;
    }
    res.clearCookie('cook.sid', sessionCookieOptions);
    res.json({ success: true, message: 'Logout successful.' });
  });
});
