import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { generateDynamicQrToken } from '../utils/crypto';
import { SessionStatus, UserRole } from '@prisma/client';

export const listSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, status } = req.query;
    const where: any = {};

    if (classId) where.classId = classId as string;
    if (status) where.status = status as SessionStatus;

    if (req.user?.role === UserRole.TEACHER) {
      where.teacherId = req.user.id;
    } else if (req.user?.role === UserRole.STUDENT) {
      where.class = {
        enrollments: { some: { studentId: req.user.id } },
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        class: { select: { id: true, code: true, name: true, subjectName: true } },
        teacher: { select: { id: true, fullName: true } },
        _count: { select: { records: true } },
      },
    });

    sendSuccess(res, 'Lấy danh sách phiên điểm danh thành công', sessions);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách phiên điểm danh', 500);
  }
};

export const getSessionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        class: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: { id: true, fullName: true, studentCode: true, email: true },
                },
              },
            },
          },
        },
        teacher: { select: { id: true, fullName: true } },
        records: {
          include: {
            student: { select: { id: true, fullName: true, studentCode: true } },
          },
          orderBy: { checkInTime: 'desc' },
        },
      },
    });

    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    // Auto-close session if expired
    if (session.status === SessionStatus.ACTIVE && new Date() > session.endTime) {
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.CLOSED },
      });
      session.status = SessionStatus.CLOSED;
    }

    sendSuccess(res, 'Lấy chi tiết phiên điểm danh thành công', session);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy thông tin phiên điểm danh', 500);
  }
};

export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classId, title, durationMinutes } = req.body;

    if (!classId || !title) {
      sendError(res, 'Vui lòng cung cấp mã lớp và tiêu đề phiên điểm danh', 400);
      return;
    }

    const classData = await prisma.class.findUnique({ where: { id: classId } });
    if (!classData) {
      sendError(res, 'Không tìm thấy lớp học phần', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && classData.teacherId !== req.user.id) {
      sendError(res, 'Bạn không thể tạo phiên điểm danh cho lớp không phụ trách', 403);
      return;
    }

    // Check if there is an active session
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        classId,
        status: SessionStatus.ACTIVE,
        endTime: { gt: new Date() },
      },
    });

    if (activeSession) {
      sendError(res, 'Lớp học phần này đang có phiên điểm danh đang mở. Vui lòng đóng phiên cũ trước.', 400);
      return;
    }

    const duration = durationMinutes ? parseInt(durationMinutes, 10) : 15;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const sessionCode = `SES_${Date.now()}`;

    const session = await prisma.attendanceSession.create({
      data: {
        classId,
        teacherId: classData.teacherId,
        sessionCode,
        title,
        startTime,
        endTime,
        durationMinutes: duration,
        status: SessionStatus.ACTIVE,
      },
      include: { class: true },
    });

    sendSuccess(res, 'Tạo và mở phiên điểm danh thành công', session, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi khi tạo phiên điểm danh', 500);
  }
};

export const updateSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(SessionStatus).includes(status)) {
      sendError(res, 'Trạng thái phiên không hợp lệ', 400);
      return;
    }

    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && session.teacherId !== req.user.id) {
      sendError(res, 'Bạn không thể thay đổi trạng thái phiên của giảng viên khác', 403);
      return;
    }

    const updated = await prisma.attendanceSession.update({
      where: { id },
      data: {
        status,
        ...(status === SessionStatus.CLOSED && { endTime: new Date() }),
      },
    });

    sendSuccess(res, `Cập nhật trạng thái phiên thành ${status} thành công`, updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật trạng thái phiên', 500);
  }
};

/**
 * Generate Anti-Cheat Signed Dynamic QR Token (10s duration)
 */
export const generateQrToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await prisma.attendanceSession.findUnique({ where: { id } });
    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && session.teacherId !== req.user.id) {
      sendError(res, 'Chỉ giảng viên phụ trách mới có quyền sinh mã QR', 403);
      return;
    }

    const now = new Date();
    if (session.status !== SessionStatus.ACTIVE || now > session.endTime) {
      sendError(res, 'Phiên điểm danh hiện không mở hoặc đã hết hạn', 400);
      return;
    }

    const signed = generateDynamicQrToken(session.id, session.teacherId);

    sendSuccess(res, 'Sinh mã QR động chống gian lận thành công', {
      token: signed.token,
      payload: signed.payload,
      expiresInSeconds: 10,
    });
  } catch (error: any) {
    sendError(res, 'Lỗi khi tạo mã QR động', 500);
  }
};
