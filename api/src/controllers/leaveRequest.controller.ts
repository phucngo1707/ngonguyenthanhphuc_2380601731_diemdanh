import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { LeaveStatus, UserRole } from '@prisma/client';

export const listLeaveRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classSectionId, status } = req.query;
    const where: any = {};

    if (classSectionId) where.classSectionId = classSectionId as string;
    if (status) where.status = status as LeaveStatus;

    // Student only sees their own leave requests
    if (req.user?.role === UserRole.STUDENT) {
      where.studentId = req.user.id;
    }

    // Teacher only sees leave requests for sections they teach
    if (req.user?.role === UserRole.TEACHER) {
      where.classSection = { teacherId: req.user.id };
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, fullName: true, studentCode: true, email: true, avatarUrl: true },
        },
        classSection: {
          select: { id: true, code: true, name: true, subject: { select: { name: true } } },
        },
        attachments: true,
        reviewedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    sendSuccess(res, 'Lấy danh sách đơn xin nghỉ phép thành công', leaveRequests);
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
        student: {
          select: { id: true, fullName: true, studentCode: true, email: true },
        },
        classSection: {
          include: { subject: true, teacher: { select: { id: true, fullName: true } } },
        },
        attachments: true,
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    if (!request) {
      sendError(res, 'Không tìm thấy đơn xin nghỉ phép', 404);
      return;
    }

    // Security check
    if (req.user?.role === UserRole.STUDENT && request.studentId !== req.user.id) {
      sendError(res, 'Bạn không có quyền xem đơn của sinh viên khác', 403);
      return;
    }

    if (
      req.user?.role === UserRole.TEACHER &&
      request.classSection.teacherId !== req.user.id
    ) {
      sendError(res, 'Bạn không thể duyệt đơn của lớp do giảng viên khác phụ trách', 403);
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

    const { classSectionId, sessionId, reason, startDate, endDate, ocrText } = req.body;

    if (!classSectionId || !reason || !startDate || !endDate) {
      sendError(res, 'Vui lòng cung cấp lớp học phần, lý do và thời gian xin nghỉ', 400);
      return;
    }

    // Check enrollment
    const isEnrolled = await prisma.enrollment.findUnique({
      where: {
        unique_student_section: {
          studentId,
          classSectionId,
        },
      },
    });

    if (!isEnrolled) {
      sendError(res, 'Bạn không có tên trong danh sách lớp học phần này', 403);
      return;
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        studentId,
        classSectionId,
        sessionId: sessionId || null,
        reason,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: LeaveStatus.PENDING,
      },
    });

    // Handle uploaded file if present
    const file = req.file;
    if (file) {
      await prisma.leaveAttachment.create({
        data: {
          leaveRequestId: newRequest.id,
          fileName: file.originalname,
          filePath: file.path.replace(/\\/g, '/'),
          fileSize: file.size,
          mimeType: file.mimetype,
          ocrText: ocrText || null,
        },
      });
    }

    const created = await prisma.leaveRequest.findUnique({
      where: { id: newRequest.id },
      include: { attachments: true, classSection: true },
    });

    sendSuccess(res, 'Nộp đơn xin nghỉ phép thành công. Đang chờ giảng viên phê duyệt.', created, 201);
  } catch (error: any) {
    console.error('Create leave request error:', error);
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

    // Student can only edit or cancel if PENDING
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
      include: { attachments: true },
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
      include: { classSection: true },
    });

    if (!request) {
      sendError(res, 'Không tìm thấy đơn xin nghỉ phép', 404);
      return;
    }

    if (
      req.user?.role === UserRole.TEACHER &&
      request.classSection.teacherId !== req.user.id
    ) {
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
        student: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });

    sendSuccess(res, `Đã ${status === LeaveStatus.APPROVED ? 'chấp thuận' : 'từ chối'} đơn xin nghỉ phép thành công`, updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi phê duyệt đơn xin nghỉ phép', 500);
  }
};
