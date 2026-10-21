import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { generateDynamicQrToken } from '../src/utils/crypto';
import * as argon2 from 'argon2';

describe('Comprehensive 4 CRUD & Edge Cases Integration Tests', () => {
  let adminToken: string;
  let teacherToken: string;
  let teacherId: string;
  let studentToken: string;
  let studentId: string;
  let testClassId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // 1. Admin login & OTP
    const aLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'admin@prime.edu.vn',
      password: 'admin123',
    });
    const aOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: aLogin.body.data.sessionToken,
      otp: '123456',
    });
    adminToken = aOtp.body.data.token;

    // 2. Teacher login & OTP
    const tLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'teacher@prime.edu.vn',
      password: 'teacher123',
    });
    const tOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: tLogin.body.data.sessionToken,
      otp: '123456',
    });
    teacherToken = tOtp.body.data.token;
    teacherId = tOtp.body.data.user.id;

    // 3. Student login & OTP
    const sLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'student123',
    });
    const sOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: sLogin.body.data.sessionToken,
      otp: '123456',
    });
    studentToken = sOtp.body.data.token;
    studentId = sOtp.body.data.user.id;
  });

  // ==========================================
  // CRUD 1: Lớp học phần
  // ==========================================
  describe('CRUD 1: Class Management', () => {
    it('Admin can create a new class', async () => {
      const classCode = `TEST_${Date.now()}`;
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: classCode,
          name: 'Lớp Kiểm Thử Tự Động',
          subjectName: 'Đồ án Chuyên ngành',
          teacherId: teacherId,
          room: 'P.Lab 404',
          schedule: 'Thứ 4, Tiết 1-3',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toBe(classCode);
      testClassId = res.body.data.id;
    });

    it('Student CANNOT create a class (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/classes')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          code: `ILLEGAL_${Date.now()}`,
          name: 'Lớp do SV tự tạo',
          subjectName: 'Bị từ chối',
          teacherId: teacherId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Teacher enrolls student into class', async () => {
      const res = await request(app)
        .post(`/api/classes/${testClassId}/enroll`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('List classes returns newly created class', async () => {
      const res = await request(app)
        .get('/api/classes')
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((c: any) => c.id === testClassId)).toBe(true);
    });
  });

  // ==========================================
  // CRUD 2: Phiên điểm danh & Anti-Cheat
  // ==========================================
  describe('CRUD 2: Attendance Session & Edge Cases', () => {
    it('Teacher creates an attendance session for the class', async () => {
      const res = await request(app)
        .post('/api/attendance-sessions')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          classId: testClassId,
          title: 'Điểm danh buổi thực hành số 1',
          durationMinutes: 15,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      testSessionId = res.body.data.id;
    });

    it('Anti-Cheat: Check-in fails when QR token is expired (> 10s)', async () => {
      // Manually create a token expired 11 seconds ago
      const expiredPayload = {
        sessionId: testSessionId,
        teacherId: teacherId,
        timestamp: Date.now() - 15000,
        expiresAt: Date.now() - 5000,
        nonce: `expired_nonce_${Date.now()}`,
      };
      const { config } = require('../src/config/env');
      const raw = JSON.stringify(expiredPayload);
      const b64 = Buffer.from(raw).toString('base64');
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', config.qr.signingSecret).update(raw).digest('hex');
      const expiredToken = `${b64}.${sig}`;

      const res = await request(app)
        .post('/api/attendance/check-in-qr')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ qrToken: expiredToken });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('hết hạn');
    });

    it('Anti-Cheat: Check-in fails when QR signature is forged/tampered', async () => {
      const res = await request(app)
        .post('/api/attendance/check-in-qr')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ qrToken: 'fake_forged_token.invalid_signature' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Valid check-in succeeds with freshly signed dynamic QR', async () => {
      const qrRes = await request(app)
        .post(`/api/attendance-sessions/${testSessionId}/generate-qr-token`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(qrRes.status).toBe(200);
      const freshToken = qrRes.body.data.token;

      const checkInRes = await request(app)
        .post('/api/attendance/check-in-qr')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ qrToken: freshToken, verifiedBiometric: true });

      expect(checkInRes.status).toBe(201);
      expect(checkInRes.body.data.status).toBe('PRESENT');
    });

    it('Teacher closes the attendance session', async () => {
      const res = await request(app)
        .patch(`/api/attendance-sessions/${testSessionId}/status`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ status: 'CLOSED' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CLOSED');
    });

    it('Anti-Cheat: Check-in fails when session is CLOSED', async () => {
      // Even with a signed token, a closed session must reject check-in
      const tokenObj = generateDynamicQrToken(testSessionId, teacherId);

      const res = await request(app)
        .post('/api/attendance/check-in-qr')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ qrToken: tokenObj.token });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('kết thúc hoặc bị đóng');
    });
  });

  // ==========================================
  // RBAC Security: Không cho SV sửa điểm danh của chính mình
  // ==========================================
  describe('RBAC Security Guarantees', () => {
    it('Student CANNOT modify attendance records (403 Forbidden)', async () => {
      const record = await prisma.attendanceRecord.findFirst({
        where: { sessionId: testSessionId, studentId },
      });

      if (record) {
        const res = await request(app)
          .put(`/api/attendance/${record.id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ status: 'PRESENT', modifiedReason: 'Hack' });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
      }
    });

    it('Student CANNOT review or approve leave requests (403 Forbidden)', async () => {
      const res = await request(app)
        .patch('/api/leave-requests/some-fake-id/review')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Student CANNOT view another user profile (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${teacherId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Student CANNOT view full session attendance list (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/session/${testSessionId}`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Teacher Ownership & Deep Edge Cases', () => {
    let secondTeacherToken: string;

    beforeAll(async () => {
      // Create a second teacher
      const t2Email = `teacher2_${Date.now()}@prime.edu.vn`;
      const passHash = await argon2.hash('teacher123');
      await prisma.user.create({
        data: {
          username: `t2_${Date.now()}`,
          email: t2Email,
          passwordHash: passHash,
          fullName: 'ThS. Nguyễn Văn Khác',
          teacherCode: `GV_${Date.now().toString().slice(-5)}`,
          role: 'TEACHER',
          isEmailVerified: true,
          isActive: true,
        },
      });

      const t2Login = await request(app).post('/api/auth/login').send({
        emailOrUsername: t2Email,
        password: 'teacher123',
      });
      const t2Otp = await request(app).post('/api/auth/verify-otp').send({
        sessionToken: t2Login.body.data.sessionToken,
        otp: '123456',
      });
      secondTeacherToken = t2Otp.body.data.token;
    });

    it('Teacher CANNOT enroll student into another teacher class (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/classes/${testClassId}/enroll`)
        .set('Authorization', `Bearer ${secondTeacherToken}`)
        .send({ studentId });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('chỉ có quyền');
    });

    it('Teacher CANNOT view session attendance of another teacher class (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/session/${testSessionId}`)
        .set('Authorization', `Bearer ${secondTeacherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('chỉ được xem danh sách điểm danh của lớp mình');
    });

    it('Teacher CAN view session attendance of their OWN class (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/attendance/session/${testSessionId}`)
        .set('Authorization', `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Duplicate Leave Request: Cannot create overlapping leave requests (409 Conflict)', async () => {
      // First leave request
      const firstRes = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classId: testClassId,
          reason: 'Bị ốm lần 1',
          startDate: '2026-11-01T08:00:00.000Z',
          endDate: '2026-11-03T17:00:00.000Z',
        });
      expect(firstRes.status).toBe(201);

      // Attempt second overlapping leave request
      const secondRes = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classId: testClassId,
          reason: 'Bị ốm lần 2 (trùng ngày)',
          startDate: '2026-11-02T08:00:00.000Z',
          endDate: '2026-11-04T17:00:00.000Z',
        });
      expect(secondRes.status).toBe(409);
      expect(secondRes.body.success).toBe(false);
    });

    it('Leave Approval Sync: Approving leave updates attendance records to EXCUSED', async () => {
      // 1. Create a session on 2026-12-01
      const sessionDate = new Date('2026-12-01T08:00:00.000Z');
      const sessionEnd = new Date('2026-12-01T10:00:00.000Z');
      const session = await prisma.attendanceSession.create({
        data: {
          classId: testClassId,
          teacherId: teacherId,
          sessionCode: `SYNC_${Date.now()}`,
          title: 'Buổi học đồng bộ nghỉ phép',
          startTime: sessionDate,
          endTime: sessionEnd,
          durationMinutes: 120,
          status: 'CLOSED',
        },
      });

      // 2. Student has an ABSENT record in that session
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          studentId: studentId,
          checkInTime: sessionDate,
          status: 'ABSENT',
          method: 'MANUAL',
        },
      });

      // 3. Student requests leave for 2026-12-01
      const leaveRes = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          classId: testClassId,
          reason: 'Đi khám bệnh tại bệnh viện',
          startDate: '2026-12-01T07:00:00.000Z',
          endDate: '2026-12-01T17:00:00.000Z',
        });
      expect(leaveRes.status).toBe(201);
      const leaveId = leaveRes.body.data.id;

      // 4. Teacher approves the leave request
      const reviewRes = await request(app)
        .patch(`/api/v1/leave-requests/${leaveId}/review`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          status: 'APPROVED',
          reviewNotes: 'Đã nhận đủ giấy xác nhận khám bệnh',
        });
      expect(reviewRes.status).toBe(200);

      // 5. Verify attendance record was automatically converted to EXCUSED
      const updatedRecord = await prisma.attendanceRecord.findFirst({
        where: { sessionId: session.id, studentId },
      });
      expect(updatedRecord?.status).toBe('EXCUSED');
      expect(updatedRecord?.modifiedReason).toContain('Đơn xin nghỉ phép đã được phê duyệt');
    });

    it('Soft Deactivation: Deleting user with records sets isActive to false', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/users/${studentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('khóa / vô hiệu hóa');

      const deactivated = await prisma.user.findUnique({ where: { id: studentId } });
      expect(deactivated?.isActive).toBe(false);

      // Re-activate so student can still be used
      await prisma.user.update({ where: { id: studentId }, data: { isActive: true } });
    });
  });
});
