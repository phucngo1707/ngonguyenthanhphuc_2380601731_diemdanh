import { Router } from 'express';
import {
  checkInDynamicQr,
  getMyAttendanceHistory,
  getSessionAttendance,
  updateRecordStatusManual,
} from '../controllers/attendance.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStudent, requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/check-in-qr', requireStudent, checkInDynamicQr);
router.get('/my-history', getMyAttendanceHistory);
router.get('/session/:sessionId', getSessionAttendance);
router.put('/:id', requireTeacher, updateRecordStatusManual);

export default router;
