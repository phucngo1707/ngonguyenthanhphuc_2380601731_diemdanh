import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.query.role as UserRole | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
        { studentCode: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        studentCode: true,
        teacherCode: true,
        isActive: true,
        createdAt: true,
      },
    });

    sendSuccess(res, 'Lấy danh sách người dùng thành công', users);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách người dùng', 500);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.role === UserRole.STUDENT && req.user.id !== id) {
      sendError(res, 'Sinh viên không được phép xem hồ sơ của người khác', 403);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        studentCode: true,
        teacherCode: true,
        isActive: true,
      },
    });

    if (!user) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    sendSuccess(res, 'Lấy thông tin người dùng thành công', user);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin người dùng', 500);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName, role, phoneNumber, studentCode, teacherCode } =
      req.body;

    if (!username || !email || !password || !fullName || !role) {
      sendError(res, 'Vui lòng cung cấp đầy đủ thông tin bắt buộc', 400);
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existing) {
      sendError(res, 'Tên đăng nhập hoặc email đã tồn tại', 400);
      return;
    }

    const passwordHash = await argon2.hash(password);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        role,
        phoneNumber,
        studentCode,
        teacherCode,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        studentCode: true,
        teacherCode: true,
      },
    });

    sendSuccess(res, 'Tạo tài khoản người dùng thành công', newUser, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi khi tạo người dùng', 500);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber, studentCode, teacherCode, isActive, password } = req.body;

    const data: any = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber;
    if (studentCode !== undefined) data.studentCode = studentCode;
    if (teacherCode !== undefined) data.teacherCode = teacherCode;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = await argon2.hash(password);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    sendSuccess(res, 'Cập nhật tài khoản thành công', updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật người dùng', 500);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (req.user?.id === id) {
      sendError(res, 'Không thể tự xóa tài khoản của chính mình', 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            enrollments: true,
            attendanceRecords: true,
            taughtClasses: true,
            leaveRequests: true,
          },
        },
      },
    });

    if (!user) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    if (
      user._count.enrollments > 0 ||
      user._count.attendanceRecords > 0 ||
      user._count.taughtClasses > 0 ||
      user._count.leaveRequests > 0
    ) {
      // Soft-deactivate to preserve historical attendance data
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      sendSuccess(res, 'Tài khoản có dữ liệu lịch sử hoạt động nên đã được khóa / vô hiệu hóa an toàn');
      return;
    }

    await prisma.user.delete({ where: { id } });
    sendSuccess(res, 'Xóa người dùng thành công');
  } catch (error: any) {
    sendError(res, 'Không thể xóa người dùng có ràng buộc dữ liệu', 400);
  }
};
