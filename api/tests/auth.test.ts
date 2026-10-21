import request from 'supertest';
import app from '../src/app';

describe('Auth & 3-Step Verification API', () => {
  let sessionToken: string;

  it('POST /api/v1/auth/login - should fail with wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'WrongPassword123',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/login - should succeed with valid credentials and return sessionToken', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'Student@123456',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionToken).toBeDefined();
    expect(res.body.data.isDemoAccount).toBe(true);

    sessionToken = res.body.data.sessionToken;
  });

  it('POST /api/v1/auth/verify-otp - should fail with wrong OTP', async () => {
    const res = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken,
      otp: '000000',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/verify-otp - should succeed with valid Demo OTP and return tokens', async () => {
    const res = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken,
      otp: '170723',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('student@prime.edu.vn');
    expect(res.body.data.user.role).toBe('STUDENT');
  });

  it('GET /api/v1/auth/me - should reject without bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/auth/me - should succeed with valid bearer token', async () => {
    // Login as Admin
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'admin@prime.edu.vn',
      password: 'Admin@123456',
    });
    const otpRes = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken: loginRes.body.data.sessionToken,
      otp: '170723',
    });
    const token = otpRes.body.data.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.role).toBe('ADMIN');
  });
});
