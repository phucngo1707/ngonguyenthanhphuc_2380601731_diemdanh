import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('Smart Anti-Cheat Dynamic QR & Attendance Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let studentId: string;
  let sessionId: string;
  let qrToken: string;
  let recordId: string;

  beforeAll(async () => {
    // 1. Authenticate Teacher
    const tLogin = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'teacher@prime.edu.vn',
      password: 'Teacher@123456',
    });
    const tOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken: tLogin.body.data.sessionToken,
      otp: '170723',
    });
    teacherToken = tOtp.body.data.tokens.accessToken;

    // 2. Authenticate Student
    const sLogin = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'Student@123456',
    });
    const sOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken: sLogin.body.data.sessionToken,
      otp: '170723',
    });
    studentToken = sOtp.body.data.tokens.accessToken;
    studentId = sOtp.body.data.user.id;

    // 3. Find active session
    const session = await prisma.attendanceSession.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (session) {
      sessionId = session.id;
      // Clean previous records for student in this session if any
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId: session.id, studentId },
      });
    }
  });

  it('POST /attendance-sessions/:id/generate-qr-token - Teacher generates signed dynamic QR', async () => {
    const res = await request(app)
      .post(`/api/v1/attendance-sessions/${sessionId}/generate-qr-token`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.expiresInSeconds).toBe(10);

    qrToken = res.body.data.token;
  });

  it('POST /attendance-records/check-in-qr - Student checks in with valid dynamic QR', async () => {
    const res = await request(app)
      .post('/api/v1/attendance-records/check-in-qr')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrToken,
        deviceInfo: 'Jest Automated Test Device',
        verifiedBiometric: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.studentId).toBe(studentId);

    recordId = res.body.data.id;
  });

  it('Anti-Replay Attack: Reusing the same QR token MUST be rejected', async () => {
    // Attempt to check in again with the exact same QR token
    const res = await request(app)
      .post('/api/v1/attendance-records/check-in-qr')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrToken,
        deviceInfo: 'Attacker Replay Device',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('đã được sử dụng');
  });

  it('Duplicate Check-in Prevention: Generating a new QR token for already checked-in student MUST be rejected', async () => {
    // Generate fresh QR token
    const qrRes = await request(app)
      .post(`/api/v1/attendance-sessions/${sessionId}/generate-qr-token`)
      .set('Authorization', `Bearer ${teacherToken}`);

    const freshQr = qrRes.body.data.token;

    const res = await request(app)
      .post('/api/v1/attendance-records/check-in-qr')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrToken: freshQr,
        deviceInfo: 'Duplicate Test Device',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('đã hoàn tất điểm danh');
  });

  it('PUT /attendance-records/:id - Teacher manually adjusts attendance with audit log', async () => {
    const res = await request(app)
      .put(`/api/v1/attendance-records/${recordId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        status: 'EXCUSED',
        modifiedReason: 'Sinh viên có giấy báo phép hợp lệ kiểm tra bởi giảng viên',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('EXCUSED');
    expect(res.body.data.modifiedReason).toContain('giấy báo phép');

    // Verify audit log entry in database
    const auditLog = await prisma.auditLog.findFirst({
      where: { entityId: recordId, action: 'UPDATE_ATTENDANCE_STATUS' },
    });
    expect(auditLog).toBeDefined();
  });
});
