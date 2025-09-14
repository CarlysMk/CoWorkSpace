const request = require('supertest');
const { app, ensureSchema } = require('../src/app');

describe('Admin routes protected', () => {
  beforeAll(async () => { await ensureSchema(); });
  it('blocks admin routes without token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect([401,403]).toContain(res.statusCode);
  });
});
