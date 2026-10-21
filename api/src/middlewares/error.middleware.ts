import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { config } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[Error Middleware]:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.';

  // Never return stack trace in production
  const errors = config.env === 'development' ? err.stack : undefined;

  sendError(res, message, statusCode, errors);
};
