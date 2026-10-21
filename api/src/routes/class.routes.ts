import { Router } from 'express';
import {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  enrollStudent,
  removeStudentFromClass,
  joinClassByCode,
} from '../controllers/class.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin, requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', listClasses);
router.post('/join', joinClassByCode);
router.get('/:id', getClassById);
router.post('/', requireTeacher, createClass);
router.put('/:id', requireTeacher, updateClass);
router.delete('/:id', requireAdmin, deleteClass);

// Enrollments
router.post('/:id/enroll', requireTeacher, enrollStudent);
router.delete('/:id/enroll/:studentId', requireTeacher, removeStudentFromClass);

export default router;
