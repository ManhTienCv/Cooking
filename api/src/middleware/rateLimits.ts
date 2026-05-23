import rateLimit from 'express-rate-limit';
import { env } from '../env.js';

const skipTestRequests = (req: any) => {
  return (
    req.headers['x-test-bypass'] === 'true' ||
    (env.testOtpCode && req.headers['x-test-bypass'] === env.testOtpCode) ||
    process.env.NODE_ENV === 'test' ||
    process.env.NODE_ENV === 'development'
  );
};

export const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
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
  skip: skipTestRequests,
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
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều yêu cầu gửi mã. Vui lòng thử lại sau.',
    });
  },
});

export const authRegisterOtpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
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
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Try again later.',
    });
  },
});

export const feedbackSubmitRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 feedback submissions per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều yêu cầu phản hồi. Vui lòng thử lại sau 1 giờ.',
    });
  },
});

/* ── Marketplace Rate Limits ────────────────────────────── */

export const orderCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều đơn hàng. Vui lòng thử lại sau.',
    });
  },
});

export const reviewCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều đánh giá. Vui lòng thử lại sau.',
    });
  },
});

export const sellerProductRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Quá nhiều sản phẩm được đăng. Vui lòng thử lại sau.',
    });
  },
});

export const sellerSecurityRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Qua nhieu lan xac thuc. Vui long thu lai sau.',
    });
  },
});

export const sellerOtpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipTestRequests,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Qua nhieu yeu cau OTP. Vui long thu lai sau.',
    });
  },
});
