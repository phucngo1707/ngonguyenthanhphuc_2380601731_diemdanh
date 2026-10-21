import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { generateDynamicQrToken } from '../utils/crypto';
import { SessionStatus, UserRole } from '@prisma/client';
import { emitToSession } from '../socket/socketHandler';

export const listSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classSectionId, status } = req.query;
    const where: any = {};

    if (classSectionId) where.classSectionId = classSectionId as string;
    if (status) where.status = status as SessionStatus;

    // If teacher, only show sessions of sections taught by them (unless admin)
    if (req.user?.role === UserRole.TEACHER) {
      where.teacherId = req.user.id;
    }

    // If student, filter by enrolled sections
    if (req.user?.role === UserRole.STUDENT) {
      where.classSection = {
        enrollments: {
          some: { studentId: req.user.id },
        },
      };
    }

    const sessions = await prisma.attendanceSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        classSection: {
          select: { id: true, code: true, name: true, subject: { select: { name: true } } },
        },
        teacher: { select: { id: true, fullName: true, email: true } },
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
        classSection: {
          include: {
            subject: true,
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    fullName: true,
                    studentCode: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        teacher: { select: { id: true, fullName: true, email: true } },
        records: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                studentCode: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { checkInTime: 'asc' },
        },
      },
    });

    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    // Auto close session if expired and still marked ACTIVE
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
    const {
      classSectionId,
      title,
      durationMinutes,
      allowNfc,
      allowBiometric,
      allowGps,
    } = req.body;

    if (!classSectionId || !title) {
      sendError(res, 'Vui lòng cung cấp lớp học phần và tiêu đề buổi học', 400);
      return;
    }

    // Verify section and teacher permission
    const section = await prisma.classSection.findUnique({
      where: { id: classSectionId },
    });

    if (!section) {
      sendError(res, 'Không tìm thấy lớp học phần', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && section.teacherId !== req.user.id) {
      sendError(res, 'Bạn không thể tạo phiên điểm danh cho lớp không phụ trách', 403);
      return;
    }

    // Check if there is already an ACTIVE session for this class section
    const activeSession = await prisma.attendanceSession.findFirst({
      where: {
        classSectionId,
        status: SessionStatus.ACTIVE,
        endTime: { gt: new Date() },
      },
    });

    if (activeSession) {
      sendError(
        res,
        'Lớp học phần này hiện đang có một phiên điểm danh đang mở. Vui lòng đóng phiên cũ trước khi tạo phiên mới.',
        400
      );
      return;
    }

    const duration = durationMinutes ? parseInt(durationMinutes, 10) : 15;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
    const sessionCode = `SES_${Date.now()}`;

    const newSession = await prisma.attendanceSession.create({
      data: {
        classSectionId,
        teacherId: section.teacherId,
        sessionCode,
        title,
        startTime,
        endTime,
        durationMinutes: duration,
        status: SessionStatus.ACTIVE,
        allowNfc: allowNfc !== undefined ? allowNfc : true,
        allowBiometric: allowBiometric !== undefined ? allowBiometric : false,
        allowGps: allowGps !== undefined ? allowGps : false,
      },
      include: {
        classSection: { select: { id: true, code: true, name: true } },
      },
    });

    sendSuccess(res, 'Tạo và mở phiên điểm danh thành công', newSession, 201);
  } catch (error: any) {
    console.error('Create session error:', error);
    sendError(res, 'Lỗi khi tạo phiên điểm danh', 500);
  }
};

export const updateSessionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, cancelReason } = req.body;

    if (!status || !Object.values(SessionStatus).includes(status)) {
      sendError(res, 'Trạng thái phiên không hợp lệ', 400);
      return;
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
      include: { classSection: true },
    });

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

    // If cancelled, record in audit log
    if (status === SessionStatus.CANCELLED) {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'CANCEL_ATTENDANCE_SESSION',
          entityType: 'AttendanceSession',
          entityId: session.id,
          newValues: JSON.stringify({ reason: cancelReason || 'Hủy bởi giảng viên' }),
        },
      });
    }

    emitToSession(session.id, 'session:status_changed', {
      sessionId: session.id,
      status,
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

    const session = await prisma.attendanceSession.findUnique({
      where: { id },
    });

    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && session.teacherId !== req.user.id) {
      sendError(res, 'Chỉ giảng viên phụ trách mới có quyền sinh mã QR', 403);
      return;
    }

    // Check if session is ACTIVE
    const now = new Date();
    if (session.status !== SessionStatus.ACTIVE || now > session.endTime) {
      sendError(res, 'Phiên điểm danh hiện không ở trạng thái mở hoặc đã hết hạn', 400);
      return;
    }

    const signedQrData = generateDynamicQrToken(session.id, session.teacherId);

    sendSuccess(res, 'Sinh mã QR động chống gian lận thành công', {
      token: signedQrData.token,
      payload: signedQrData.payload,
      expiresInSeconds: 10,
    });
  } catch (error: any) {
    sendError(res, 'Lỗi khi tạo mã QR động', 500);
  }
};
