import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendError } from '../utils/response';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Yêu cầu đăng nhập trước khi thực hiện', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Bạn không có quyền thực hiện thao tác này. Quyền yêu cầu: [${allowedRoles.join(', ')}]`,
        403
      );
      return;
    }

    next();
  };
};

export const requireAdmin = requireRoles(UserRole.ADMIN);
export const requireTeacher = requireRoles(UserRole.TEACHER, UserRole.ADMIN);
export const requireStudent = requireRoles(UserRole.STUDENT, UserRole.ADMIN);
