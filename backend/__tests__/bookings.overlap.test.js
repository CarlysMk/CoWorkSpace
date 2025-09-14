const request = require('supertest');
const { app, ensureSchema } = require('../src/app');
const jwt = require('jsonwebtoken');

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Bookings overlap', () => {
  let token;
  beforeAll(async () => {
    process.env.JWT_SECRET = 'testsecret';
    await ensureSchema();
    const res = await request(app).post('/api/auth/register').send({ email: 'u1@example.com', password: 'Abcd' });
    token = res.body.token;
  });

  it('prevents overlapping booking', async () => {
    const start = new Date().toISOString();
    const end = new Date(Date.now()+2*3600000).toISOString();
    const A = await request(app).post('/api/bookings').set(bearer(token)).send({ space_id: 1, start_ts: start, end_ts: end });
    const B = await request(app).post('/api/bookings').set(bearer(token)).send({ space_id: 1, start_ts: start, end_ts: end });
    expect([201,409]).toContain(A.statusCode);
    if (A.statusCode === 201) expect(B.statusCode).toBe(409);
  });
});
