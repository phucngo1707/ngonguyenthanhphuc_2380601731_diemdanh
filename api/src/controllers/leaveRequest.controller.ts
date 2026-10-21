import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { LeaveStatus, UserRole } from '@prisma/client';

export const listLeaveRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, status } = req.query;
    const where: any = {};

    if (classId) where.classId = classId as string;
    if (status) where.status = status as LeaveStatus;

    if (req.user?.role === UserRole.STUDENT) {
      where.studentId = req.user.id;
    } else if (req.user?.role === UserRole.TEACHER) {
      where.class = { teacherId: req.user.id };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, studentCode: true, email: true } },
        class: { select: { id: true, code: true, name: true, subjectName: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    sendSuccess(res, 'Lấy danh sách đơn xin nghỉ phép thành công', requests);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách đơn nghỉ phép', 500);
  }
};

export const getLeaveRequestById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        student: { select: { id: true, fullName: true, studentCode: true, email: true } },
        class: { include: { teacher: { select: { id: true, fullName: true } } } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!request) {
      sendError(res, 'Không tìm thấy đơn xin nghỉ phép', 404);
      return;
    }

    sendSuccess(res, 'Lấy chi tiết đơn nghỉ phép thành công', request);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin đơn nghỉ phép', 500);
  }
};

export const createLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    if (!studentId || req.user?.role !== UserRole.STUDENT) {
      sendError(res, 'Chỉ sinh viên mới được tạo đơn xin nghỉ phép', 403);
      return;
    }

    const { classId, reason, startDate, endDate, ocrText } = req.body;

    if (!classId || !reason || !startDate || !endDate) {
      sendError(res, 'Vui lòng cung cấp mã lớp, lý do và thời gian xin nghỉ', 400);
      return;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        unique_student_class: {
          studentId,
          classId,
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'Bạn không thuộc danh sách lớp học phần này', 403);
      return;
    }

    const file = req.file;
    const attachmentUrl = file ? file.path.replace(/\\/g, '/') : null;

    const request = await prisma.leaveRequest.create({
      data: {
        studentId,
        classId,
        reason,
        attachmentUrl,
        ocrText: ocrText || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: LeaveStatus.PENDING,
      },
      include: {
        class: { select: { code: true, name: true } },
      },
    });

    sendSuccess(res, 'Gửi đơn xin nghỉ phép thành công', request, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi khi tạo đơn xin nghỉ phép', 500);
  }
};

export const updateLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, startDate, endDate, status } = req.body;

    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Không tìm thấy đơn xin nghỉ phép', 404);
      return;
    }

    if (req.user?.role === UserRole.STUDENT) {
      if (existing.studentId !== req.user.id) {
        sendError(res, 'Bạn không có quyền sửa đơn của sinh viên khác', 403);
        return;
      }
      if (existing.status !== LeaveStatus.PENDING) {
        sendError(res, 'Chỉ có thể chỉnh sửa hoặc hủy đơn khi ở trạng thái Chờ duyệt (PENDING)', 400);
        return;
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        ...(reason && { reason }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status }),
      },
    });

    sendSuccess(res, 'Cập nhật đơn xin nghỉ phép thành công', updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật đơn xin nghỉ phép', 500);
  }
};

export const reviewLeaveRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;

    if (!status || ![LeaveStatus.APPROVED, LeaveStatus.REJECTED].includes(status)) {
      sendError(res, 'Trạng thái duyệt chỉ có thể là APPROVED hoặc REJECTED', 400);
      return;
    }

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { class: true },
    });

    if (!request) {
      sendError(res, 'Không tìm thấy đơn xin nghỉ phép', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && request.class.teacherId !== req.user.id) {
      sendError(res, 'Bạn chỉ có quyền phê duyệt đơn của lớp mình phụ trách', 403);
      return;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: req.user?.id,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
      },
      include: {
        student: { select: { fullName: true, studentCode: true } },
      },
    });

    sendSuccess(res, `Đã ${status === LeaveStatus.APPROVED ? 'chấp thuận' : 'từ chối'} đơn xin nghỉ phép`, updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi phê duyệt đơn xin nghỉ phép', 500);
  }
};
