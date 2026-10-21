import { Router } from 'express';
import {
  register,
  verifyEmail,
  login,
  verifyLoginOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  faceLogin,
  enrollFace,
  getFaceEnrolledPhoto,
} from '../controllers/auth.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/face-login', faceLogin);
router.get('/face-photo', getFaceEnrolledPhoto);
router.post('/enroll-face', authenticateJwt, enrollFace);
router.post('/verify-login-otp', verifyLoginOtp);
router.post('/verify-otp', verifyLoginOtp); // Backwards-compatible alias
router.post('/resend-otp', resendOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', authenticateJwt, logout);
router.get('/me', authenticateJwt, getMe);

export default router;
