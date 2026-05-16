import type { Request, Response, NextFunction } from 'express';
import { SELLER_SECURITY_PURPOSE, getSellerSecurityState } from '../services/sellerSecurityService.js';

export function requireSellerStepUp(req: Request, res: Response, next: NextFunction): void {
  const state = getSellerSecurityState(req);
  if (!state.passwordVerified) {
    res.status(403).json({
      success: false,
      message: 'Vui long xac thuc mat khau de tiep tuc.',
      securityRequired: 'password',
      security: state,
    });
    return;
  }
  next();
}

export function requireSellerOtp(req: Request, res: Response, next: NextFunction): void {
  const state = getSellerSecurityState(req);
  if (!state.otpVerified || req.session.sellerOtpPurpose !== SELLER_SECURITY_PURPOSE) {
    res.status(403).json({
      success: false,
      message: 'Vui long xac thuc OTP email de tiep tuc.',
      securityRequired: 'otp',
      security: state,
    });
    return;
  }
  next();
}
