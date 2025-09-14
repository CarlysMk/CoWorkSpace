import { test, expect } from '@playwright/test';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001/api';
test('register → login → spaces → booking → pay → verify', async ({ request }) => {
  const email = `test_${Date.now()}@example.com`; const password = 'Test1234!';
  await request.post(`${API_BASE}/auth/register`, { data: { email, password, name: 'E2E Tester' } }).catch(()=>{});
  const loginRes = await request.post(`${API_BASE}/auth/login`, { data: { email, password } });
  expect(loginRes.ok()).toBeTruthy(); const { token } = await loginRes.json(); expect(token).toBeTruthy();
  const spacesRes = await request.get(`${API_BASE}/spaces/available?date=today`);
  expect(spacesRes.ok()).toBeTruthy(); const spaces = await spacesRes.json(); expect(Array.isArray(spaces)&&spaces.length>0).toBeTruthy();
  const spaceId = spaces[0]?.id || spaces[0]?._id; expect(spaceId).toBeTruthy();
  const start = new Date(Date.now()+60*60*1000).toISOString(); const end = new Date(Date.now()+2*60*60*1000).toISOString();
  const bookingRes = await request.post(`${API_BASE}/bookings`, { data: { spaceId, start, end }, headers: { Authorization: `Bearer ${token}` } });
  expect(bookingRes.ok()).toBeTruthy(); const booking = await bookingRes.json(); const bookingId = booking.id || booking._id; expect(bookingId).toBeTruthy();
  const payRes = await request.post(`${API_BASE}/payments/bookings/${bookingId}/pay`, { headers: { Authorization: `Bearer ${token}` } });
  expect(payRes.ok()).toBeTruthy(); const payJson = await payRes.json(); expect(payJson.status || payJson.success || payJson.url).toBeTruthy();
  const verifyRes = await request.get(`${API_BASE}/bookings/${bookingId}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(verifyRes.ok()).toBeTruthy(); const verified = await verifyRes.json(); expect(verified.status || verified.paymentStatus).toBeTruthy();
});