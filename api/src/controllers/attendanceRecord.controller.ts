import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { verifyDynamicQrToken, consumeNonce } from '../utils/crypto';
import { AttendanceStatus, CheckInMethod, SessionStatus, UserRole } from '@prisma/client';
import { emitToSession } from '../socket/socketHandler';

export const checkInDynamicQr = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    if (!studentId || req.user?.role !== UserRole.STUDENT) {
      sendError(res, 'Chỉ sinh viên mới có quyền thực hiện điểm danh', 403);
      return;
    }

    const { qrToken, deviceInfo, latitude, longitude, verifiedBiometric } = req.body;

    if (!qrToken) {
      sendError(res, 'Vui lòng cung cấp mã QR điểm danh', 400);
      return;
    }

    // 1. Verify dynamic QR cryptographically & Anti-Replay
    const verification = verifyDynamicQrToken(qrToken);
    if (!verification.isValid || !verification.payload) {
      sendError(res, verification.error || 'Mã QR không hợp lệ', 400);
      return;
    }

    const { sessionId, nonce, expiresAt } = verification.payload;

    // 2. Check session status
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { classSection: true },
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

    // 3. Verify student enrollment in the section
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        unique_student_section: {
          studentId,
          classSectionId: session.classSectionId,
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'Bạn không có tên trong danh sách đăng ký của lớp học phần này', 403);
      return;
    }

    // 4. Check if student already checked in
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        unique_session_student: {
          sessionId,
          studentId,
        },
      },
    });

    if (existingRecord) {
      sendError(res, 'Bạn đã hoàn tất điểm danh cho phiên này trước đó rồi', 400);
      return;
    }

    // 5. Consume nonce immediately so no one else or replay can use this token
    consumeNonce(nonce, expiresAt);

    // 6. Determine status: PRESENT or LATE
    // If check-in is done in the first 10 minutes of session -> PRESENT, otherwise LATE
    const elapsedMinutes = (now.getTime() - session.startTime.getTime()) / (1000 * 60);
    const status = elapsedMinutes > 10 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        checkInTime: now,
        status,
        method: CheckInMethod.DYNAMIC_QR,
        deviceInfo: deviceInfo || 'Flutter Mobile Client',
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        verifiedBiometric: Boolean(verifiedBiometric),
      },
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
    });

    // 7. Emit realtime event to Teacher screen
    emitToSession(sessionId, 'attendance:checked_in', {
      record,
      sessionId,
      message: `Sinh viên ${record.student.fullName} (${record.student.studentCode}) đã điểm danh thành công!`,
    });

    sendSuccess(res, 'Điểm danh thành công!', record, 201);
  } catch (error: any) {
    console.error('Check-in error:', error);
    sendError(res, 'Lỗi hệ thống khi điểm danh: ' + error.message, 500);
  }
};

export const checkInNfc = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, tagUid } = req.body;

    if (!sessionId || !tagUid) {
      sendError(res, 'Vui lòng cung cấp mã phiên và UID thẻ NFC', 400);
      return;
    }

    // Match NFC tag to registered student
    const nfcTag = await prisma.registeredNfcTag.findUnique({
      where: { tagUid },
      include: { student: true },
    });

    if (!nfcTag || !nfcTag.isActive) {
      sendError(res, 'Thẻ NFC chưa được đăng ký trong hệ thống hoặc đã bị khóa', 404);
      return;
    }

    const studentId = nfcTag.studentId;

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.status !== SessionStatus.ACTIVE || new Date() > session.endTime) {
      sendError(res, 'Phiên điểm danh không hợp lệ hoặc đã đóng', 400);
      return;
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        unique_student_section: {
          studentId,
          classSectionId: session.classSectionId,
        },
      },
    });

    if (!enrollment) {
      sendError(res, 'Sinh viên gắn thẻ này không thuộc lớp học phần này', 403);
      return;
    }

    // Check duplicate
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        unique_session_student: {
          sessionId,
          studentId,
        },
      },
    });

    if (existing) {
      sendError(res, 'Sinh viên đã điểm danh cho phiên này rồi', 400);
      return;
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        sessionId,
        studentId,
        status: AttendanceStatus.PRESENT,
        method: CheckInMethod.NFC,
        deviceInfo: `NFC Card: ${tagUid}`,
      },
      include: {
        student: {
          select: { id: true, fullName: true, studentCode: true, email: true },
        },
      },
    });

    emitToSession(sessionId, 'attendance:checked_in', {
      record,
      sessionId,
      message: `Sinh viên ${record.student.fullName} đã điểm danh qua thẻ NFC!`,
    });

    sendSuccess(res, 'Điểm danh qua thẻ NFC thành công', record, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi điểm danh qua NFC', 500);
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
      sendError(res, 'Vui lòng cung cấp lý do điều chỉnh điểm danh thủ công để lưu nhật ký kiểm toán', 400);
      return;
    }

    // Security: Student cannot update attendance records
    if (req.user?.role === UserRole.STUDENT) {
      sendError(res, 'Sinh viên không được phép tự điều chỉnh bản ghi điểm danh', 403);
      return;
    }

    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: { session: true },
    });

    if (!existingRecord) {
      sendError(res, 'Không tìm thấy bản ghi điểm danh', 404);
      return;
    }

    // Teacher check
    if (req.user?.role === UserRole.TEACHER && existingRecord.session.teacherId !== req.user.id) {
      sendError(res, 'Bạn chỉ được điều chỉnh điểm danh của lớp mình phụ trách', 403);
      return;
    }

    const oldStatus = existingRecord.status;

    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        status,
        method: CheckInMethod.MANUAL,
        modifiedByTeacherId: req.user?.id,
        modifiedReason,
      },
      include: {
        student: { select: { id: true, fullName: true, studentCode: true } },
        modifiedBy: { select: { id: true, fullName: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'UPDATE_ATTENDANCE_STATUS',
        entityType: 'AttendanceRecord',
        entityId: id,
        oldValues: JSON.stringify({ status: oldStatus }),
        newValues: JSON.stringify({ status, reason: modifiedReason }),
        ipAddress: req.ip,
      },
    });

    emitToSession(existingRecord.sessionId, 'attendance:updated', {
      recordId: id,
      newStatus: status,
      modifiedReason,
    });

    sendSuccess(res, 'Cập nhật trạng thái điểm danh thủ công thành công', updatedRecord);
  } catch (error: any) {
    sendError(res, 'Lỗi khi cập nhật điểm danh', 500);
  }
};

export const getStudentAttendanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.query.studentId ? (req.query.studentId as string) : req.user?.id;

    if (!studentId) {
      sendError(res, 'Thiếu thông tin mã sinh viên', 400);
      return;
    }

    // Role check: Students can only view their own history
    if (req.user?.role === UserRole.STUDENT && studentId !== req.user.id) {
      sendError(res, 'Bạn chỉ có thể xem lịch sử điểm danh của chính mình', 403);
      return;
    }

    const history = await prisma.attendanceRecord.findMany({
      where: { studentId },
      orderBy: { checkInTime: 'desc' },
      include: {
        session: {
          include: {
            classSection: {
              include: { subject: true, teacher: { select: { fullName: true } } },
            },
          },
        },
      },
    });

    sendSuccess(res, 'Lấy lịch sử điểm danh thành công', history);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy lịch sử điểm danh', 500);
  }
};
