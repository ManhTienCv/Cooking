import rateLimit from 'express-rate-limit';

export const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau.',
    });
  },
});

export const authRegisterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều lần đăng ký từ địa chỉ này. Vui lòng thử lại sau.',
    });
  },
});

export const authForgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều yêu cầu gửi mã. Vui lòng thử lại sau.',
    });
  },
});

export const authRegisterOtpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều lần gửi mã đăng ký. Vui lòng thử lại sau.',
    });
  },
});

export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Try again later.',
    });
  },
});
