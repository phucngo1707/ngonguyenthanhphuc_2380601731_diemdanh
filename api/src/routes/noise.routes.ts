import { Router } from 'express';
import { logSessionNoise } from '../controllers/auxiliary.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/log', requireTeacher, logSessionNoise);

export default router;
