import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const uid = req.session.userId;
  if (!uid) {
    res.status(401).json({ success: false, message: 'Vui lòng đăng nhập.', authenticated: false });
    return;
  }
  next();
}
