import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
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
        { teacherCode: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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
      }),
    ]);

    sendSuccess(res, 'Lấy danh sách người dùng thành công', users, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách người dùng', 500);
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
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
        createdAt: true,
      },
    });

    if (!user) {
      sendError(res, 'Không tìm thấy người dùng', 404);
      return;
    }

    sendSuccess(res, 'Lấy chi tiết người dùng thành công', user);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin người dùng', 500);
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, fullName, role, phoneNumber, studentCode, teacherCode } =
      req.body;

    if (!username || !email || !password || !fullName || !role) {
      sendError(res, 'Vui lòng điền đầy đủ các thông tin bắt buộc', 400);
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existingUser) {
      sendError(res, 'Tên đăng nhập hoặc email đã tồn tại trong hệ thống', 400);
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
        phoneNumber: true,
        studentCode: true,
        teacherCode: true,
        createdAt: true,
      },
    });

    sendSuccess(res, 'Tạo người dùng mới thành công', newUser, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi khi tạo người dùng: ' + error.message, 500);
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fullName, phoneNumber, studentCode, teacherCode, isActive, password } = req.body;

    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (studentCode !== undefined) updateData.studentCode = studentCode;
    if (teacherCode !== undefined) updateData.teacherCode = teacherCode;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.passwordHash = await argon2.hash(password);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
        updatedAt: true,
      },
    });

    sendSuccess(res, 'Cập nhật thông tin người dùng thành công', updatedUser);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật người dùng', 500);
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Don't allow deleting own account
    if (req.user?.id === id) {
      sendError(res, 'Không thể tự xóa tài khoản của chính mình', 400);
      return;
    }

    await prisma.user.delete({ where: { id } });
    sendSuccess(res, 'Đã xóa người dùng thành công');
  } catch (error: any) {
    sendError(res, 'Không thể xóa người dùng này do có dữ liệu liên quan. Vui lòng chuyển trạng thái sang Không hoạt động.', 400);
  }
};
