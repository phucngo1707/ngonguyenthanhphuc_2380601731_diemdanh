import request from 'supertest';
import app from '../src/app';

describe('RBAC Authorization Middleware Tests', () => {
  let studentToken: string;
  let teacherToken: string;
  let adminToken: string;

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

    // Admin Token
    const aLogin = await request(app).post('/api/v1/auth/login').send({
      emailOrUsername: 'admin@prime.edu.vn',
      password: 'Admin@123456',
    });
    const aOtp = await request(app).post('/api/v1/auth/verify-otp').send({
      sessionToken: aLogin.body.data.sessionToken,
      otp: '170723',
    });
    adminToken = aOtp.body.data.tokens.accessToken;
  });

  it('STUDENT should be forbidden (403) from accessing admin user list', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('TEACHER should be forbidden (403) from creating faculties', async () => {
    const res = await request(app)
      .post('/api/v1/faculties')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ code: 'TEST', name: 'Test Faculty' });

    expect(res.status).toBe(403);
  });

  it('ADMIN should be allowed to access users list', async () => {
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});
