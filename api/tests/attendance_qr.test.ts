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
    const tLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'teacher@prime.edu.vn',
      password: 'Teacher@123',
    });
    const tOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: tLogin.body.data.sessionToken,
      otp: '123456',
    });
    teacherToken = tOtp.body.data.token;

    // 2. Authenticate Student
    const sLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'Student@123',
    });
    const sOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: sLogin.body.data.sessionToken,
      otp: '123456',
    });
    studentToken = sOtp.body.data.token;
    studentId = sOtp.body.data.user.id;

    // 3. Find or reset active session with future endTime
    let session = await prisma.attendanceSession.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!session) {
      session = await prisma.attendanceSession.findFirst();
    }
    if (session) {
      sessionId = session.id;
      await prisma.attendanceSession.update({
        where: { id: session.id },
        data: {
          status: 'ACTIVE',
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      });
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId: session.id },
      });
    }
  });

  it('POST /api/attendance-sessions/:id/generate-qr-token - Teacher generates signed dynamic QR', async () => {
    const res = await request(app)
      .post(`/api/attendance-sessions/${sessionId}/generate-qr-token`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.expiresInSeconds).toBe(10);

    qrToken = res.body.data.token;
  });

  it('POST /api/attendance/check-in-qr - Student checks in with valid dynamic QR', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in-qr')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrToken,
        deviceInfo: 'Flutter Mobile App Test Device',
        verifiedBiometric: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.studentId).toBe(studentId);

    recordId = res.body.data.id;
  });

  it('Anti-Replay Attack: Reusing the same QR token MUST be rejected', async () => {
    const res = await request(app)
      .post('/api/attendance/check-in-qr')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrToken,
        deviceInfo: 'Attacker Replay Device',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('đã được quét');
  });

  it('Duplicate Check-in Prevention: Generating fresh QR for already checked-in student MUST be rejected', async () => {
    const qrRes = await request(app)
      .post(`/api/attendance-sessions/${sessionId}/generate-qr-token`)
      .set('Authorization', `Bearer ${teacherToken}`);

    const freshQr = qrRes.body.data.token;

    const res = await request(app)
      .post('/api/attendance/check-in-qr')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        qrToken: freshQr,
        deviceInfo: 'Duplicate Test Device',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('đã hoàn tất điểm danh');
  });

  it('PUT /api/attendance/:id - Teacher manually adjusts attendance with reason', async () => {
    const res = await request(app)
      .put(`/api/attendance/${recordId}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        status: 'EXCUSED',
        modifiedReason: 'Giảng viên đã xác nhận giấy xin phép của sinh viên',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('EXCUSED');
    expect(res.body.data.modifiedReason).toContain('giấy xin phép');
  });
});
