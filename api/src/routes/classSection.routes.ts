import { Router } from 'express';
import {
  listClassSections,
  getClassSectionById,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  addStudentToSection,
  removeStudentFromSection,
} from '../controllers/academic.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireAdmin, requireTeacher } from '../middlewares/role.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', listClassSections);
router.get('/:id', getClassSectionById);
router.post('/', requireAdmin, createClassSection);
router.put('/:id', requireAdmin, updateClassSection);
router.delete('/:id', requireAdmin, deleteClassSection);

// Enrollment endpoints
router.post('/:id/students', requireTeacher, addStudentToSection);
router.delete('/:id/students/:studentId', requireTeacher, removeStudentFromSection);

export default router;
