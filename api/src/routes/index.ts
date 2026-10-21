import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import facultyRoutes from './faculty.routes';
import subjectRoutes from './subject.routes';
import classroomRoutes from './classroom.routes';
import classSectionRoutes from './classSection.routes';
import attendanceSessionRoutes from './attendanceSession.routes';
import attendanceRecordRoutes from './attendanceRecord.routes';
import leaveRequestRoutes from './leaveRequest.routes';
import nfcRoutes from './nfc.routes';
import noiseRoutes from './noise.routes';
import reportRoutes from './report.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/faculties', facultyRoutes);
router.use('/subjects', subjectRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/class-sections', classSectionRoutes);
router.use('/attendance-sessions', attendanceSessionRoutes);
router.use('/attendance-records', attendanceRecordRoutes);
router.use('/leave-requests', leaveRequestRoutes);
router.use('/nfc-tags', nfcRoutes);
router.use('/noise', noiseRoutes);
router.use('/reports', reportRoutes);
router.use('/health', healthRoutes);

export default router;
