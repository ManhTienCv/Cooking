import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export function ensureCsrfToken(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  next();
}

function tokenFromRequest(req: Request): string | undefined {
  const h = req.headers['x-csrf-token'];
  if (typeof h === 'string' && h) return h;
  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body.csrf_token === 'string') return body.csrf_token;
  return undefined;
}

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  const token = tokenFromRequest(req);
  if (!token || !req.session.csrfToken || token !== req.session.csrfToken) {
    res.status(403).json({
      success: false,
      message: 'Lỗi bảo mật (CSRF). Vui lòng tải lại trang và thử lại.',
    });
    return;
  }
  next();
}
