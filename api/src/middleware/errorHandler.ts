import type { Request, Response, NextFunction } from 'express';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function statusFromError(err: unknown): number {
  if (!isRecord(err) || typeof err.status !== 'number') return 500;
  return err.status >= 400 && err.status < 600 ? err.status : 500;
}

function messageFromError(err: unknown): string {
  if (isRecord(err) && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return 'System error. Please try again later.';
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = statusFromError(err);
  const message = messageFromError(err);
  const captchaRequired = isRecord(err) && typeof err.captchaRequired === 'boolean' ? err.captchaRequired : undefined;
  const details = isRecord(err) && err.details !== undefined ? err.details : undefined;

  console.error(`[Error] ${req.method} ${req.path}:`, err);

  res.status(status).json({
    success: false,
    message,
    captchaRequired,
    details,
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
}
