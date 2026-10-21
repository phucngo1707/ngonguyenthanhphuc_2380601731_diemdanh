import { Router } from 'express';
import {
  listFaculties,
  createFaculty,
  updateFaculty,
  deleteFaculty,
} from '../controllers/academic.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.get('/', listFaculties);
router.post('/', requireAdmin, createFaculty);
router.put('/:id', requireAdmin, updateFaculty);
router.delete('/:id', requireAdmin, deleteFaculty);

export default router;
