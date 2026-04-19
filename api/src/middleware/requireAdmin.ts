import type { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminId = req.session.adminId;
  if (!adminId) {
    res.status(401).json({ success: false, message: 'Admin auth required.' });
    return;
  }
  next();
}
