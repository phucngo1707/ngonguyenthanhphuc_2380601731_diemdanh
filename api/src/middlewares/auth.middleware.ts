import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { prisma } from '../config/prisma';

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Yêu cầu đăng nhập để truy cập tài nguyên này', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyAccessToken(token);

  if (!payload) {
    sendError(res, 'Phiên đăng nhập đã hết hạn hoặc token không hợp lệ', 401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true, email: true, role: true, fullName: true, isActive: true },
  });

  if (!user || !user.isActive) {
    sendError(res, 'Tài khoản không tồn tại hoặc đã bị khóa', 403);
    return;
  }

  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
  };

  next();
};
