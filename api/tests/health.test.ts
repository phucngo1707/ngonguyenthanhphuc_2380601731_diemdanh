import request from 'supertest';
import app from '../src/app';

describe('Health Check API', () => {
  it('GET /api/health - should return 200 with healthy status and database connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database).toBe('connected');
    expect(res.body.apiName).toBe('NgoNguyenThanhPhuc_2380601731_DiemDanhAPI');
  });
});
