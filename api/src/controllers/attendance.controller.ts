import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { verifyDynamicQrToken, consumeNonce } from '../utils/crypto';
import { AttendanceStatus, SessionStatus, UserRole } from '@prisma/client';

export const checkInDynamicQr = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    if (!studentId || req.user?.role !== UserRole.STUDENT) {
      sendError(res, 'Chỉ sinh viên mới có quyền thực hiện điểm danh', 403);
      return;
    }

    const { qrToken, deviceInfo, verifiedBiometric } = req.body;
    if (!qrToken) {
      sendError(res, 'Vui lòng cung cấp mã QR điểm danh', 400);
      return;
    }

    // 1. Verify dynamic QR cryptographic signature, timestamp (10s) and replay
    const verification = verifyDynamicQrToken(qrToken);
    if (!verification.isValid || !verification.payload) {
      sendError(res, verification.error || 'Mã QR không hợp lệ', 400);
      return;
    }

    const { sessionId, nonce, expiresAt } = verification.payload;

    // 2. Check session status
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { class: true },
    });

    if (!session) {
      sendError(res, 'Phiên điểm danh không tồn tại', 404);
      return;
    }

    const now = new Date();
    if (session.status !== SessionStatus.ACTIVE || now > session.endTime) {
      sendError(res, 'Phiên điểm danh đã kết thúc hoặc bị đóng', 400);
      return;
    }

    // 3. Verify student is enrolled in the class
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        unique_student_class: {
          studentId,
          classId: session.classId,
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'Bạn không có tên trong danh sách lớp học phần này', 403);
      return;
    }

    // 4. Check if student already checked in
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        unique_session_student: {
          sessionId,
          studentId,
        },
      },
    });

    if (existing) {
      sendError(res, 'Bạn đã hoàn tất điểm danh cho phiên này rồi', 400);
      return;
    }

    // 5. Consume nonce immediately so it cannot be replayed
    consumeNonce(nonce, expiresAt);

    // 6. Check-in status (first 5 mins = PRESENT, after 5 mins = LATE)
    const elapsedMinutes = (now.getTime() - session.startTime.getTime()) / (1000 * 60);
    const status = elapsedMinutes > 5 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        checkInTime: now,
        status,
        method: 'DYNAMIC_QR',
        deviceInfo: deviceInfo || 'Flutter Mobile App',
        verifiedBiometric: Boolean(verifiedBiometric),
      },
      include: {
        student: { select: { id: true, fullName: true, studentCode: true } },
      },
    });

    sendSuccess(res, 'Điểm danh thành công!', record, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi hệ thống khi điểm danh: ' + error.message, 500);
  }
};

export const getMyAttendanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      sendError(res, 'Yêu cầu đăng nhập', 401);
      return;
    }

    const history = await prisma.attendanceRecord.findMany({
      where: { studentId },
      orderBy: { checkInTime: 'desc' },
      include: {
        session: {
          include: {
            class: { select: { id: true, code: true, name: true, subjectName: true } },
          },
        },
      },
    });

    sendSuccess(res, 'Lấy lịch sử điểm danh thành công', history);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy lịch sử điểm danh', 500);
  }
};

export const getSessionAttendance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    if (req.user?.role === UserRole.STUDENT) {
      sendError(res, 'Sinh viên không có quyền xem danh sách điểm danh toàn phiên', 403);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && session.teacherId !== req.user.id) {
      sendError(res, 'Bạn chỉ được xem danh sách điểm danh của lớp mình phụ trách', 403);
      return;
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { sessionId },
      orderBy: { checkInTime: 'asc' },
      include: {
        student: { select: { id: true, fullName: true, studentCode: true, email: true } },
        modifiedBy: { select: { id: true, fullName: true } },
      },
    });

    sendSuccess(res, 'Lấy danh sách điểm danh phiên thành công', records);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách điểm danh', 500);
  }
};

export const updateRecordStatusManual = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, modifiedReason } = req.body;

    if (!status || !Object.values(AttendanceStatus).includes(status)) {
      sendError(res, 'Trạng thái điểm danh không hợp lệ', 400);
      return;
    }

    if (!modifiedReason) {
      sendError(res, 'Vui lòng cung cấp lý do điều chỉnh điểm danh thủ công', 400);
      return;
    }

    // Student cannot modify their own record
    if (req.user?.role === UserRole.STUDENT) {
      sendError(res, 'Sinh viên không được phép tự điều chỉnh điểm danh', 403);
      return;
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!record) {
      sendError(res, 'Không tìm thấy bản ghi điểm danh', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && record.session.teacherId !== req.user.id) {
      sendError(res, 'Bạn chỉ được điều chỉnh điểm danh của lớp mình phụ trách', 403);
      return;
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        status,
        method: 'MANUAL',
        modifiedByTeacherId: req.user?.id,
        modifiedReason,
        modifiedAt: new Date(),
      },
      include: {
        student: { select: { fullName: true, studentCode: true } },
      },
    });

    sendSuccess(res, 'Điều chỉnh điểm danh thủ công thành công', updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật điểm danh', 500);
  }
};
