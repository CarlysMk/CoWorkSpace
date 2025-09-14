// backend/src/routes/payments.js
const express = require("express");
const { Client } = require("pg");
const bodyParser = require("body-parser");

const router = express.Router();
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
\1
// Auto mock fallback if Stripe is not configured
async function payMock(bookingId, res) {
  const db = getClient(); await db.connect();
  try {
    // mark as paid immediately
    await db.query(`UPDATE "Bookings" SET payment_status='paid' WHERE id=$1`, [bookingId]);
    const success = `${process.env.FRONTEND_BASE_URL || "http://localhost:8080"}/booking?status=success&mock=1`;
    return res.json({ url: success });
  } catch (e) {
    console.error("Mock pay error:", e);
    return res.status(500).json({ error: "Errore pagamento mock" });
  } finally { await db.end(); }
}


router.post("/bookings/:id/pay", async (req, res) => {
  if (!stripe) { return payMock(bookingId, res); }
  const bookingId = Number(req.params.id);
  if (!bookingId) return res.status(400).json({ error: "Booking id non valido" });
  const db = getClient(); await db.connect();
  try {
    const { rows } = await db.query(`
      SELECT b.id, COALESCE(b.price_eur, 10) AS price_eur, u.email
      FROM "Bookings" b JOIN "Users" u ON u.id=b.user_id
      WHERE b.id=$1
    `, [bookingId]);
    if (!rows.length) return res.status(404).json({ error: "Prenotazione non trovata" });
    const b = rows[0];
    const amount = Math.max(1, Number(b.price_eur) * 100);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: b.email,
      line_items: [{ price_data: { currency: "eur", product_data: { name: `Prenotazione #${b.id}` }, unit_amount: amount }, quantity: 1 }],
      success_url: `${process.env.FRONTEND_BASE_URL || "http://localhost:8080"}/booking?status=success`,
      cancel_url: `${process.env.FRONTEND_BASE_URL || "http://localhost:8080"}/booking?status=cancel`,
      metadata: { booking_id: String(b.id) }
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error(e); res.status(500).json({ error: "Errore creazione pagamento" });
  } finally { await db.end(); }
});

router.post("/payments/webhook", bodyParser.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe) { return payMock(bookingId, res); }
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret); }
  catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = Number(session.metadata?.booking_id);
    if (bookingId) {
      const db = getClient(); await db.connect();
      try { await db.query(`UPDATE "Bookings" SET payment_status='paid' WHERE id=$1`, [bookingId]); }
      finally { await db.end(); }
    }
  }
  res.json({ received: true });
});

module.exports = router;
