import request from 'supertest';
import app from '../src/app';

describe('Auth & 3-Step Verification API', () => {
  let sessionToken: string;

  it('POST /api/auth/login - should fail with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - should succeed with valid credentials and return sessionToken', async () => {
    const res = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'Student@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionToken).toBeDefined();
    expect(res.body.data.demoOtp).toBe('123456');

    sessionToken = res.body.data.sessionToken;
  });

  it('POST /api/auth/verify-otp - should fail with wrong OTP', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      sessionToken,
      otp: '000000',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/verify-otp - should succeed with valid Demo OTP 123456 and return JWT', async () => {
    const res = await request(app).post('/api/auth/verify-otp').send({
      sessionToken,
      otp: '123456',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('student@prime.edu.vn');
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('GET /api/auth/me - should return authenticated user profile', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'admin@prime.edu.vn',
      password: 'Admin@123',
    });
    const otpRes = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: loginRes.body.data.sessionToken,
      otp: '123456',
    });
    const token = otpRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.role).toBe('ADMIN');
  });

  describe('Registration & Email Verification Workflow', () => {
    const testEmail = `newstudent_${Date.now()}@prime.edu.vn`;
    const testStudentCode = `SV${Date.now().toString().slice(-6)}`;

    it('POST /api/v1/auth/register - should successfully register a new student', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Nguyễn Văn Mới',
        email: testEmail,
        studentCode: testStudentCode,
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testEmail);
    });

    it('POST /api/v1/auth/register - should reject duplicate email', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Người Trùng Email',
        email: testEmail,
        studentCode: 'SV999999',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/register - should reject duplicate studentCode', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Người Trùng MSSV',
        email: `another_${Date.now()}@prime.edu.vn`,
        studentCode: testStudentCode,
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/login - should reject unverified email', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        emailOrUsername: testEmail,
        password: 'Password@123',
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('chưa xác thực email');
    });

    it('POST /api/v1/auth/verify-email - should fail with wrong OTP', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        email: testEmail,
        otp: '999999',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/verify-email - should succeed with valid OTP', async () => {
      const res = await request(app).post('/api/v1/auth/verify-email').send({
        email: testEmail,
        otp: '123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/login - should now succeed after verification', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        emailOrUsername: testEmail,
        password: 'Password@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.sessionToken).toBeDefined();
    });
  });

  describe('Forgot Password & Reset Password Workflow', () => {
    it('POST /api/v1/auth/forgot-password - should succeed and send reset OTP', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({
        email: 'student@prime.edu.vn',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('POST /api/v1/auth/reset-password - should reject invalid OTP', async () => {
      const res = await request(app).post('/api/v1/auth/reset-password').send({
        email: 'student@prime.edu.vn',
        otp: '000000',
        newPassword: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/auth/reset-password - should reset password with valid OTP', async () => {
      const res = await request(app).post('/api/v1/auth/reset-password').send({
        email: 'student@prime.edu.vn',
        otp: '123456',
        newPassword: 'Student@123',
        confirmPassword: 'Student@123',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

