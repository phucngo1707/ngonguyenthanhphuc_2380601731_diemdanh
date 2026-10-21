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
});
