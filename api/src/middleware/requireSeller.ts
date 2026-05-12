import type { Request, Response, NextFunction } from 'express';
import * as marketplaceRepo from '../repos/marketplaceRepo.js';

/**
 * Middleware: yêu cầu user đã đăng ký seller_profiles.
 * Phải đặt SAU requireAuth.
 */
export function requireSeller(req: Request, res: Response, next: NextFunction): void {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.' });
    return;
  }

  marketplaceRepo.isSeller(userId).then((isSeller) => {
    if (!isSeller) {
      res.status(403).json({ success: false, message: 'Bạn chưa đăng ký bán hàng.' });
      return;
    }
    next();
  }).catch(() => {
    res.status(500).json({ success: false, message: 'Lỗi kiểm tra quyền bán hàng.' });
  });
}
