import { Router } from 'express';
import { login, verifyOtp, getMe, logout } from '../controllers/auth.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.get('/me', authenticateJwt, getMe);
router.post('/logout', authenticateJwt, logout);

export default router;
