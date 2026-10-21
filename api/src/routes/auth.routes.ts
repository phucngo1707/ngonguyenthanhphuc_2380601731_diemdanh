import { Router } from 'express';
import {
  login,
  verifyOtp,
  resendOtp,
  refreshToken,
  logout,
  getMe,
} from '../controllers/auth.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { loginRateLimiter, otpVerifyRateLimiter } from '../middlewares/rateLimit.middleware';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/verify-otp', otpVerifyRateLimiter, verifyOtp);
router.post('/resend-otp', loginRateLimiter, resendOtp);
router.post('/refresh-token', refreshToken);
router.post('/logout', authenticateJwt, logout);
router.get('/me', authenticateJwt, getMe);

export default router;
