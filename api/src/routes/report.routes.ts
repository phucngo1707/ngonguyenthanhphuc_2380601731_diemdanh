import { Router } from 'express';
import { getAttendanceSummaryReport } from '../controllers/auxiliary.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/attendance-summary', getAttendanceSummaryReport);

export default router;
