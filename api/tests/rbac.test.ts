import request from 'supertest';
import app from '../src/app';

describe('RBAC Authorization Middleware Tests', () => {
  let studentToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Student Token
    const sLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'student@prime.edu.vn',
      password: 'Student@123',
    });
    const sOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: sLogin.body.data.sessionToken,
      otp: '123456',
    });
    studentToken = sOtp.body.data.token;

    // Admin Token
    const aLogin = await request(app).post('/api/auth/login').send({
      emailOrUsername: 'admin@prime.edu.vn',
      password: 'Admin@123',
    });
    const aOtp = await request(app).post('/api/auth/verify-otp').send({
      sessionToken: aLogin.body.data.sessionToken,
      otp: '123456',
    });
    adminToken = aOtp.body.data.token;
  });

  it('STUDENT should be forbidden (403) from accessing admin user list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('ADMIN should be allowed to access users list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});
