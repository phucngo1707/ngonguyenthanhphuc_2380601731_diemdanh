import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { UserRole } from '@prisma/client';

export const listClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query.search as string | undefined;
    const where: any = {};

    if (req.user?.role === UserRole.TEACHER) {
      where.teacherId = req.user.id;
    } else if (req.user?.role === UserRole.STUDENT) {
      where.enrollments = {
        some: { studentId: req.user.id },
      };
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { name: { contains: search } },
        { subjectName: { contains: search } },
      ];
    }

    const classes = await prisma.class.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: { select: { id: true, fullName: true, email: true, teacherCode: true } },
        _count: {
          select: {
            enrollments: true,
            sessions: true,
          },
        },
      },
    });

    sendSuccess(res, 'Lấy danh sách lớp học phần thành công', classes);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách lớp học phần', 500);
  }
};

export const getClassById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        teacher: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        enrollments: {
          include: {
            student: {
              select: { id: true, fullName: true, studentCode: true, email: true, phoneNumber: true },
            },
          },
        },
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!classData) {
      sendError(res, 'Không tìm thấy lớp học phần', 404);
      return;
    }

    sendSuccess(res, 'Lấy chi tiết lớp học phần thành công', classData);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin lớp học phần', 500);
  }
};

export const createClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, subjectName, teacherId, room, schedule, semester } = req.body;

    if (!code || !name || !subjectName || !teacherId) {
      sendError(res, 'Vui lòng cung cấp mã lớp, tên lớp, môn học và giảng viên phụ trách', 400);
      return;
    }

    const newClass = await prisma.class.create({
      data: {
        code,
        name,
        subjectName,
        teacherId,
        room: room || 'P.A1-301',
        schedule: schedule || 'Thứ 2 (07:30 - 11:00)',
        semester: semester || 'HK1-2025-2026',
      },
      include: {
        teacher: { select: { id: true, fullName: true } },
      },
    });

    sendSuccess(res, 'Tạo lớp học phần mới thành công', newClass, 201);
  } catch (error: any) {
    sendError(res, 'Mã lớp học phần đã tồn tại hoặc dữ liệu không hợp lệ', 400);
  }
};

export const updateClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, subjectName, teacherId, room, schedule, semester } = req.body;

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subjectName && { subjectName }),
        ...(teacherId && { teacherId }),
        ...(room !== undefined && { room }),
        ...(schedule !== undefined && { schedule }),
        ...(semester && { semester }),
      },
      include: { teacher: { select: { fullName: true } } },
    });

    sendSuccess(res, 'Cập nhật lớp học phần thành công', updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật lớp học phần', 500);
  }
};

export const deleteClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.class.delete({ where: { id } });
    sendSuccess(res, 'Đã xóa lớp học phần thành công');
  } catch (error: any) {
    sendError(res, 'Không thể xóa lớp đã có sinh viên hoặc phiên điểm danh', 400);
  }
};

export const enrollStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: classId } = req.params;
    const { studentId } = req.body;

    if (!studentId) {
      sendError(res, 'Vui lòng cung cấp studentId', 400);
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId,
        classId,
      },
      include: {
        student: { select: { id: true, fullName: true, studentCode: true } },
      },
    });

    sendSuccess(res, 'Thêm sinh viên vào lớp thành công', enrollment, 201);
  } catch (error: any) {
    sendError(res, 'Sinh viên đã có trong lớp hoặc thông tin không hợp lệ', 400);
  }
};

export const removeStudentFromClass = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: classId, studentId } = req.params;

    await prisma.enrollment.delete({
      where: {
        unique_student_class: {
          studentId,
          classId,
        },
      },
    });

    sendSuccess(res, 'Đã xóa sinh viên khỏi lớp thành công');
  } catch (error: any) {
    sendError(res, 'Không tìm thấy sinh viên trong lớp', 404);
  }
};
