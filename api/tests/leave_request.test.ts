import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

describe('Leave Requests & Review Workflow Tests', () => {
  let studentToken: string;
  let teacherToken: string;
  let sectionId: string;
  let leaveRequestId: string;

  beforeAll(async () => {
    // Student Token
    const sLogin = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'Student@123456',
    });
    const sOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken: sLogin.body.data.sessionToken,
      otp: '170723',
    });
    studentToken = sOtp.body.data.tokens.accessToken;

    // Teacher Token
    const tLogin = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'teacher@prime.edu.vn',
      password: 'Teacher@123456',
    });
    const tOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken: tLogin.body.data.sessionToken,
      otp: '170723',
    });
    teacherToken = tOtp.body.data.tokens.accessToken;

    const section = await prisma.classSection.findFirst({
      where: { code: '261IT3101_01' },
    });
    if (section) sectionId = section.id;
  });

  it('POST /leave-requests - Student creates a new leave request', async () => {
    const res = await request(app)
      .post('/api/v1/leave-requests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        classSectionId: sectionId,
        reason: 'Em bị sốt xuất huyết cần đi bệnh viện kiểm tra',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
        ocrText: 'BỆNH VIỆN BÌNH THẠNH - GIẤY NHẬP VIỆN',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');

    leaveRequestId = res.body.data.id;
  });

  it('PATCH /leave-requests/:id/review - Teacher approves leave request', async () => {
    const res = await request(app)
      .patch(`/api/v1/leave-requests/${leaveRequestId}/review`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        status: 'APPROVED',
        reviewNotes: 'Giảng viên đồng ý cho nghỉ phép. Chúc em sớm khỏe.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('APPROVED');
    expect(res.body.data.reviewedById).toBeDefined();
  });
});
