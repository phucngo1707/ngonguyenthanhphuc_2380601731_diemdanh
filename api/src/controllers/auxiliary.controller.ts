import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { UserRole } from '@prisma/client';

// -----------------------------------------------------------------------------
// Classroom Noise Logging (Sensor D1)
// -----------------------------------------------------------------------------
export const logSessionNoise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, soundLevelAvgDb, soundPeakDb } = req.body;

    if (!sessionId || soundLevelAvgDb === undefined) {
      sendError(res, 'Vui lòng cung cấp mã phiên và chỉ số độ ồn decibel (dB)', 400);
      return;
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      sendError(res, 'Không tìm thấy phiên điểm danh', 404);
      return;
    }

    if (req.user?.role === UserRole.TEACHER && session.teacherId !== req.user.id) {
      sendError(res, 'Chỉ giảng viên phụ trách mới có quyền cập nhật thông số độ ồn của lớp', 403);
      return;
    }

    const updated = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        soundLevelAvgDb: parseFloat(soundLevelAvgDb),
        soundPeakDb: soundPeakDb ? parseFloat(soundPeakDb) : undefined,
      },
    });

    sendSuccess(res, 'Ghi nhận thông số độ ồn phòng học thành công', updated);
  } catch (error: any) {
    sendError(res, 'Lỗi khi ghi nhận độ ồn', 500);
  }
};

// -----------------------------------------------------------------------------
// NFC Tags (Sensor E2)
// -----------------------------------------------------------------------------
export const registerNfcTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagUid, tagLabel, studentId } = req.body;
    const targetStudentId = studentId || req.user?.id;

    if (!tagUid) {
      sendError(res, 'Vui lòng cung cấp UID của thẻ NFC', 400);
      return;
    }

    const existingTag = await prisma.registeredNfcTag.findUnique({
      where: { tagUid },
    });

    if (existingTag) {
      sendError(res, 'Thẻ NFC này đã được đăng ký cho một tài khoản khác trong hệ thống', 400);
      return;
    }

    const newTag = await prisma.registeredNfcTag.create({
      data: {
        studentId: targetStudentId,
        tagUid,
        tagLabel: tagLabel || 'Thẻ điểm danh cá nhân',
        isActive: true,
      },
    });

    sendSuccess(res, 'Đăng ký thẻ NFC thành công', newTag, 201);
  } catch (error: any) {
    sendError(res, 'Lỗi khi đăng ký thẻ NFC', 500);
  }
};

export const getMyNfcTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await prisma.registeredNfcTag.findMany({
      where: { studentId: req.user?.id },
      orderBy: { registeredAt: 'desc' },
    });
    sendSuccess(res, 'Lấy danh sách thẻ NFC thành công', tags);
  } catch (error: any) {
    sendError(res, 'Lỗi khi lấy danh sách thẻ NFC', 500);
  }
};

// -----------------------------------------------------------------------------
// Attendance Reports & Statistics
// -----------------------------------------------------------------------------
export const getAttendanceSummaryReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { classSectionId } = req.query;

    const where: any = {};
    if (classSectionId) where.classSectionId = classSectionId as string;

    if (req.user?.role === UserRole.TEACHER) {
      where.teacherId = req.user.id;
    }

    const [totalSessions, totalRecords, presentRecords, lateRecords, absentRecords] =
      await Promise.all([
        prisma.attendanceSession.count({ where }),
        prisma.attendanceRecord.count({
          where: classSectionId
            ? { session: { classSectionId: classSectionId as string } }
            : undefined,
        }),
        prisma.attendanceRecord.count({
          where: {
            status: 'PRESENT',
            ...(classSectionId && { session: { classSectionId: classSectionId as string } }),
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            status: 'LATE',
            ...(classSectionId && { session: { classSectionId: classSectionId as string } }),
          },
        }),
        prisma.attendanceRecord.count({
          where: {
            status: 'ABSENT',
            ...(classSectionId && { session: { classSectionId: classSectionId as string } }),
          },
        }),
      ]);

    const attendanceRate =
      totalRecords > 0 ? (((presentRecords + lateRecords) / totalRecords) * 100).toFixed(1) : '100';

    sendSuccess(res, 'Lấy báo cáo tổng hợp chuyên cần thành công', {
      totalSessions,
      totalRecords,
      presentRecords,
      lateRecords,
      absentRecords,
      attendanceRate: `${attendanceRate}%`,
    });
  } catch (error: any) {
    sendError(res, 'Lỗi khi tổng hợp báo cáo chuyên cần', 500);
  }
};
