const request = require('supertest');
const { app, ensureSchema } = require('../src/app');

describe('Auth & Register', () => {
  beforeAll(async () => { await ensureSchema(); });

  it('register creates customer by default', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'testuser@example.com', password: 'Abcd' });
    expect(res.statusCode).toBe(201);
    expect(res.body.role).toBe('customer');
    expect(res.body.token).toBeTruthy();
  });
});
