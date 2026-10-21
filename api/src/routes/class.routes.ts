import { Router } from 'express';
import {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  enrollStudent,
  removeStudentFromClass,
} from '../controllers/class.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin, requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', listClasses);
router.get('/:id', getClassById);
router.post('/', requireAdmin, createClass);
router.put('/:id', requireAdmin, updateClass);
router.delete('/:id', requireAdmin, deleteClass);

// Enrollments
router.post('/:id/enroll', requireTeacher, enrollStudent);
router.delete('/:id/enroll/:studentId', requireTeacher, removeStudentFromClass);

export default router;
