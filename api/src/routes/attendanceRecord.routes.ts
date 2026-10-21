import { Router } from 'express';
import {
  checkInDynamicQr,
  checkInNfc,
  updateRecordStatusManual,
  getStudentAttendanceHistory,
} from '../controllers/attendanceRecord.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStudent, requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/check-in-qr', requireStudent, checkInDynamicQr);
router.post('/check-in-nfc', checkInNfc);
router.get('/my-history', getStudentAttendanceHistory);
router.put('/:id', requireTeacher, updateRecordStatusManual);

export default router;
