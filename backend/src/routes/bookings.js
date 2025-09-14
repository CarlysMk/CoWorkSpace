// backend/src/routes/bookings.js
const express = require("express");
const { Client } = require("pg");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const router = express.Router();
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

// GET /api/bookings?user_id=
router.get("/", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const { user_id } = req.query || {};
    const sql = user_id
      ? `SELECT * FROM "Bookings" WHERE user_id=$1 ORDER BY start_ts DESC`
      : `SELECT * FROM "Bookings" ORDER BY start_ts DESC`;
    const params = user_id ? [Number(user_id)] : [];
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Errore elenco prenotazioni", detail: e.message });
  } finally { await db.end(); }
});

// GET /api/bookings/availability?space_id=&start_ts=&end_ts=
router.get("/availability", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const { space_id, start_ts, end_ts } = req.query || {};
    if (!space_id || !start_ts || !end_ts) return res.status(400).json({ available: false, message: "Parametri mancanti" });
    const sql = `
      SELECT 1 FROM "Bookings"
      WHERE space_id = $1
        AND NOT (end_ts <= $2 OR start_ts >= $3)
      LIMIT 1
    `;
    const { rows } = await db.query(sql, [Number(space_id), start_ts, end_ts]);
    res.json({ available: rows.length === 0 });
  } catch (e) {
    res.status(500).json({ available: false, message: e.message });
  } finally { await db.end(); }
});

// POST /api/bookings  { space_id, start_ts, end_ts, note? }
router.post("/", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const { space_id, start_ts, end_ts, note } = req.body || {};
    if (!space_id || !start_ts || !end_ts) return res.status(400).json({ message: "Parametri mancanti" });
    // estrai utente dal token
    let userId = null;
    try {
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : null;
      if (token) {
        const payload = jwt.verify(token, JWT_SECRET);
        userId = Number(payload.sub) || null;
      }
    } catch (e) { /* token non valido: userId resta null */ }

    // Ricontrollo disponibilità ottimistico
    const clash = await db.query(`
      SELECT 1 FROM "Bookings"
      WHERE space_id = $1
        AND NOT (end_ts <= $2 OR start_ts >= $3)
      LIMIT 1
    `, [Number(space_id), start_ts, end_ts]);
    if (clash.rows.length) return res.status(409).json({ message: "Lo spazio non è disponibile nel periodo selezionato" });

    const ins = await db.query(`
      INSERT INTO "Bookings"(user_id, space_id, start_ts, end_ts, status, note, payment_status)
      VALUES ($1, $2, $3, $4, 'pending', $5, 'pending')
      RETURNING id, user_id, space_id, start_ts, end_ts, payment_status
    `, [userId, Number(space_id), start_ts, end_ts, note || null]);

    return res.status(201).json({ booking: ins.rows[0] });
  } catch (e) {
    res.status(500).json({ message: "Errore creazione prenotazione", detail: e.message });
  } finally { await db.end(); }
});

// POST /api/bookings/:id/pay
router.post("/:id/pay", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "ID non valido" });
    const { rows } = await db.query(
      `UPDATE "Bookings" SET payment_status='paid', status='confirmed' WHERE id=$1 RETURNING id, payment_status, status`, [id]
    );
    if (!rows.length) return res.status(404).json({ message: "Prenotazione non trovata" });
    res.json({ ok: true, booking: rows[0] });
  } catch (e) {
    res.status(500).json({ message: "Errore pagamento", detail: e.message });
  } finally { await db.end(); }
});




// POST /api/bookings/:id/email-receipt
router.post("/:id/email-receipt", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const id = Number(req.params.id);
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token mancante" });
    let payload; try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: "Token non valido" }); }

    const { rows } = await db.query(`
      SELECT b.id, b.user_id, b.space_id, b.start_ts, b.end_ts, b.payment_status,
             s.name AS space_name, s.price_per_hour,
             u.email AS user_email
      FROM "Bookings" b
      JOIN "Spaces" s ON s.id = b.space_id
      JOIN "Users" u ON u.id = b.user_id
      WHERE b.id = $1
    `, [id]);
    if (!rows.length) return res.status(404).json({ error: "Prenotazione non trovata" });
    const bk = rows[0];

    const isOwner = bk.user_id === payload.sub;
    if (!isOwner && payload.role !== "manager" && payload.role !== "admin") {
      return res.status(403).json({ error: "Permesso negato" });
    }

    const toEmail = (req.body && req.body.toEmail) || bk.user_email;
    if (!toEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) {
      return res.status(400).json({ error: "Email destinatario non valida" });
    }

    // Calcolo importo

    // Costruisci testo ricevuta identico al .txt lato client
    function fmtItDate(x){
      try { return new Date(x).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }); }
      catch { return new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' }); }
    }
    function fmtIsoMinute(x){
      try { const d = new Date(x); return d.toISOString().slice(0,16); } catch { return String(x); }
    }

    const txId = (req.body && (req.body.transactionId || req.body.tx || req.body.payment_tx)) || "-";
    const paidAt = (req.body && (req.body.paidAt || req.body.at)) || Date.now();
    const holder = (req.body && req.body.holderName) || "-";
    const emailTo = (req.body && req.body.toEmail) || toEmail;
    const periodStart = (req.body && req.body.start) || bk.start_ts || "-";
    const periodEnd = (req.body && req.body.end) || bk.end_ts || "-";

    const lines = [];
    lines.push("=== RICEVUTA PAGAMENTO ===");
    lines.push(`Prenotazione: #${bk.id}`);
    lines.push(`Data: ${fmtItDate(paidAt)}`);
    lines.push(`Email: ${emailTo || "-"}`);
    lines.push(`Spazio: ${bk.space_name || "-"}`);
    lines.push(`Periodo: ${fmtIsoMinute(periodStart)} -> ${fmtIsoMinute(periodEnd)}`);
    if (typeof amount === "number" && !Number.isNaN(amount))
    lines.push("");
    lines.push("Grazie per l'acquisto!");
    const textBody = lines.join("\n");
    const nodemailer = require("nodemailer");
    const host = process.env.SMTP_HOST || "";
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || "";
    const pass = process.env.SMTP_PASS || "";
    const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
    const from = process.env.SMTP_FROM || user || "no-reply@example.com";
    if (!host || !user || !pass) return res.status(500).json({ error: "SMTP non configurato" });

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.sendMail({ from, to: toEmail, subject: `Ricevuta prenotazione #${bk.id}`, text: textBody });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: "Invio email fallito", detail: e.message }); }
  finally { await db.end(); }
});

module.exports = router;


// POST /api/bookings
router.post("/", async (req, res) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token mancante" });
  let payload; try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: "Token non valido" }); }
  const userId = payload.sub;
  const db = getClient(); await db.connect();
  try {
    const { space_id, start_ts, end_ts, note } = req.body || {};
    if (!space_id || !start_ts || !end_ts) return res.status(400).json({ error: "Parametri mancanti" });
    await db.query("BEGIN");
    await db.query(`
      SELECT id FROM "Bookings"
      WHERE space_id=$1 AND NOT (end_ts <= $2 OR start_ts >= $3)
      FOR UPDATE
    `, [Number(space_id), start_ts, end_ts]);
    const overlap = await db.query(`
      SELECT 1 FROM "Bookings"
      WHERE space_id=$1 AND NOT (end_ts <= $2 OR start_ts >= $3)
      LIMIT 1
    `, [Number(space_id), start_ts, end_ts]);
    if (overlap.rowCount) { await db.query("ROLLBACK"); return res.status(409).json({ error: "Slot non disponibile" }); }
    const diffH = Math.max(1, (new Date(end_ts) - new Date(start_ts)) / 3600000);
    const price = Math.round(diffH * 10);
    const ins = await db.query(`
      INSERT INTO "Bookings"(user_id, space_id, start_ts, end_ts, note, payment_status, price_eur)
      VALUES ($1,$2,$3,$4,$5,'pending',$6) RETURNING *
    `, [userId, Number(space_id), start_ts, end_ts, note || null, price]);
    await db.query("COMMIT");
    return res.status(201).json(ins.rows[0]);
  } catch (e) {
    try { await db.query("ROLLBACK"); } catch {}
    console.error("Create booking error:", e); return res.status(500).json({ error: "Errore creazione prenotazione" });
  } finally { await db.end(); }
});

// DELETE /api/bookings/:id
router.delete("/:id", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const id = Number(req.params.id);
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token mancante" });
    let payload; try { payload = jwt.verify(token, JWT_SECRET); } catch { return res.status(401).json({ error: "Token non valido" }); }
    const { rows } = await db.query(`SELECT user_id FROM "Bookings" WHERE id=$1`, [id]);
    if (!rows.length) return res.status(404).json({ error: "Prenotazione non trovata" });
    const isOwner = rows[0].user_id === payload.sub;
    if (!isOwner && payload.role !== "manager" && payload.role !== "admin") return res.status(403).json({ error: "Permesso negato" });
    await db.query(`DELETE FROM "Bookings" WHERE id=$1`, [id]);
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: "Errore cancellazione", detail: e.message }); }
  finally { await db.end(); }
});
