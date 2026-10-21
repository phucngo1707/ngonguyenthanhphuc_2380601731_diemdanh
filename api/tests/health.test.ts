import request from 'supertest';
import app from '../src/app';

describe('Health Check API', () => {
  it('GET /health - should return 200 with healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBe('1.0.0');
    expect(res.body.uptimeSeconds).toBeDefined();
  });

  it('GET /health/ready - should return 200 with database connected', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
    expect(res.body.responseTimeMs).toBeDefined();
  });
});
