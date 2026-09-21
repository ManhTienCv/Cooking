import type { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../lib/adminToken.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  let adminId = req.session?.adminId;

  if (!adminId) {
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
    const raw = typeof authHeader === 'string' ? authHeader : Array.isArray(authHeader) ? authHeader[0] : '';
    const token = raw.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      const verifiedId = verifyAdminToken(token);
      if (verifiedId) {
        adminId = verifiedId;
        if (req.session) {
          req.session.adminId = verifiedId;
        }
      }
    }
  }

  if (!adminId) {
    res.status(401).json({ success: false, message: 'Admin auth required.' });
    return;
  }
  next();
}
