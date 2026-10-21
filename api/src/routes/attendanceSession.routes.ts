import { Router } from 'express';
import {
  listSessions,
  getSessionById,
  createSession,
  updateSessionStatus,
  generateQrToken,
} from '../controllers/attendanceSession.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', listSessions);
router.get('/:id', getSessionById);
router.post('/', requireTeacher, createSession);
router.patch('/:id/status', requireTeacher, updateSessionStatus);
router.post('/:id/generate-qr-token', requireTeacher, generateQrToken);

export default router;
