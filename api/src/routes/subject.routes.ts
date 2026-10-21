import { Router } from 'express';
import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from '../controllers/academic.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);
router.get('/', listSubjects);
router.post('/', requireAdmin, createSubject);
router.put('/:id', requireAdmin, updateSubject);
router.delete('/:id', requireAdmin, deleteSubject);

export default router;
