import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      'Bạn đã thao tác đăng nhập quá nhiều lần. Vui lòng đợi 15 phút trước khi thử lại.',
      429
    );
  },
});

export const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(
      res,
      'Số lần xác minh OTP đã vượt quá giới hạn an toàn. Vui lòng thử lại sau 15 phút.',
      429
    );
  },
});
