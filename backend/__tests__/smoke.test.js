// Basic API tests with Supertest
const request = require('supertest');

const appFactory = () => {
  const express = require('express');
  const app = express();
  app.get('/health', (req, res) => res.json({ ok: true }));
  return app;
};

describe('CoWorkSpace API smoke tests', () => {
  it('health should respond 200', async () => {
    const app = appFactory();
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
