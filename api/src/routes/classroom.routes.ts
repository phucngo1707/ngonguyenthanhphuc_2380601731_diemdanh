import { Router } from 'express';
import {
  listClassrooms,
  createClassroom,
} from '../controllers/academic.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.get('/', listClassrooms);
router.post('/', requireAdmin, createClassroom);

export default router;
