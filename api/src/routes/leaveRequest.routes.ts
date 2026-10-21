import { Router } from 'express';
import {
  listLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  reviewLeaveRequest,
} from '../controllers/leaveRequest.controller';
import { authenticateJwt } from '../middlewares/auth.middleware';
import { requireStudent, requireTeacher } from '../middlewares/role.middleware';
import { uploadAttachment } from '../middlewares/upload.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', listLeaveRequests);
router.get('/:id', getLeaveRequestById);
router.post('/', requireStudent, uploadAttachment.single('attachment'), createLeaveRequest);
router.put('/:id', updateLeaveRequest);
router.patch('/:id/review', requireTeacher, reviewLeaveRequest);

export default router;
