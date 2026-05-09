import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  status?: number;
  message: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || 500;
  const message = err.message || 'Lỗi hệ thống. Vui lòng thử lại sau.';

  console.error(`[Error] ${req.method} ${req.path}:`, err);

  res.status(status).json({
    success: false,
    message,
    // Trả về stack trace chỉ khi ở môi trường development
    error: process.env.NODE_ENV === 'development' ? err : undefined,
  });
}
