import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import classRoutes from './class.routes';
import attendanceSessionRoutes from './attendanceSession.routes';
import attendanceRoutes from './attendance.routes';
import leaveRequestRoutes from './leaveRequest.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/attendance-sessions', attendanceSessionRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/health', healthRoutes);

export default router;
