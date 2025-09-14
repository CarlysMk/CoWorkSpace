const { applySecurity } = require('./middleware/security');
// /backend/src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const spacesRoutes = require("./routes/spaces");

// ---------- PG POOL ----------
const pool = new Pool({ connectionString: DATABASE_URL,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
});
pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
  process.exit(1);
});
const db = {
  query: (text, params) => pool.query(text, params),
  pool,
};

// ---------- AUTO-MIGRATION / SCHEMA SAFETY ----------
async function ensureSchema() {
  // USERS
  await db.query(`
    CREATE TABLE IF NOT EXISTS "Users" (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await db.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
  await db.query(`ALTER TABLE "Users" ALTER COLUMN role SET DEFAULT 'customer';`);

  // LOCATIONS
  await db.query(`
    CREATE TABLE IF NOT EXISTS "Locations" (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT,
      services JSONB DEFAULT '[]'::jsonb
    );
  `);

  // SPACES
  await db.query(`
    CREATE TABLE IF NOT EXISTS "Spaces" (
      id SERIAL PRIMARY KEY,
      location_id INTEGER NOT NULL REFERENCES "Locations"(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 5.00
    );
  `);

  // BOOKINGS
  await db.query(`
    CREATE TABLE IF NOT EXISTS "Bookings" (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
      space_id INTEGER NOT NULL REFERENCES "Spaces"(id) ON DELETE CASCADE,
      start_ts TIMESTAMP NOT NULL,
      end_ts TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      payment_status TEXT NOT NULL DEFAULT 'unpaid'
    );
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS bookings_space_idx ON "Bookings"(space_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS bookings_time_idx  ON "Bookings"(start_ts, end_ts);`);

  // SEED manager (password: manager123) + una sede/space demo
  await db.query(`
    INSERT INTO "Users"(email, password_hash, role)
    VALUES ('manager@cowork.it', '$2b$10$6mJ5o6S2q3bH0T7o4t1XUuA1t2rI2g7c9o7c9wqf6q2y9Rr8Y4f6C', 'manager')
    ON CONFLICT (email) DO NOTHING;
  `);
  await db.query(`
    INSERT INTO "Locations"(name, city, address, services)
    VALUES ('CoWork Milano Centrale', 'Milano', 'Via Roma 1, Milano', '["wifi","coffee","meeting-rooms"]'::jsonb)
    ON CONFLICT DO NOTHING;
  `);
  await db.query(`
    INSERT INTO "Spaces"(location_id, name, type, price_per_hour)
    SELECT id, 'Sala Riunioni A', 'meeting', 15.00
    FROM "Locations" WHERE name='CoWork Milano Centrale'
    ON CONFLICT DO NOTHING;
  `);
}

// ---------- AUTH HELPERS ----------
function auth(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token mancante" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub, role, email }
    next();
  } catch {
    return res.status(401).json({ error: "Token non valido" });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Permesso negato" });
    }
    next();
  };
}

// ---------- EXPRESS APP ----------
const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:8080", credentials: true }));
app.use(express.json());


app.use('/admin/metrics', adminMetricsRouter);
// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Auth ---
const SALT_ROUNDS = 10;
const adminMetricsRouter = require('./routes/admin.metrics');


app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, role = "customer" } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email e password sono obbligatorie" });

    const exists = await db.query('SELECT 1 FROM "Users" WHERE email=$1', [email]);
    if (exists.rowCount > 0) return res.status(409).json({ error: "Email già registrata" });

    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);
    const { rows } = await db.query(
      'INSERT INTO "Users"(email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, role, created_at',
      [email, passwordHash, role]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error("REGISTER error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Credenziali mancanti" });

    const { rows } = await db.query(
      'SELECT id, email, role, password_hash FROM "Users" WHERE email=$1',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Email o password non valide" });

    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Email o password non valide" });

    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    console.error("LOGIN error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

app.get("/api/auth/me", async (req, res) => {
  try {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Token mancante" });

    let payload;
    try { payload = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(401).json({ error: "Token non valido" }); }

    const { rows } = await db.query('SELECT id, email, role, created_at FROM "Users" WHERE id=$1', [payload.sub]);
    if (!rows.length) return res.status(404).json({ error: "Utente non trovato" });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error("ME error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

// --- Locations ---
app.get("/api/locations", async (req, res) => {
  try {
    const { city } = req.query;
    let rows;
    if (city) {
      ({ rows } = await db.query(
        `SELECT id, name, city, address, services FROM "Locations" WHERE lower(city)=lower($1) ORDER BY name`, [city]
      ));
    } else {
      ({ rows } = await db.query(
        `SELECT id, name, city, address, services FROM "Locations" ORDER BY city, name`
      ));
    }
    res.json({ locations: rows });
  } catch (err) {
    console.error("LOCATIONS error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

app.get("/api/locations/:id/spaces", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      `SELECT id, name, type, price_per_hour FROM "Spaces" WHERE location_id=$1 ORDER BY name`, [id]
    );
    res.json({ spaces: rows });
  } catch (err) {
    console.error("SPACES error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});


// --- Spaces availability ---
app.get("/api/spaces/available", async (req, res) => {
  try {
    const { start_ts, end_ts, location_id } = req.query;
    if (!start_ts || !end_ts) return res.status(400).json({ error: "start_ts ed end_ts sono richiesti" });
    const params = [start_ts, end_ts];
    const whereLoc = location_id ? "AND s.location_id=$3" : "";
    if (location_id) params.push(Number(location_id));

    const { rows } = await db.query(`
      SELECT s.id, s.name, s.type, s.capacity, s.price_per_hour, s.location_id
      FROM "Spaces" s
      WHERE NOT EXISTS (
        SELECT 1 FROM "Bookings" b
        WHERE b.space_id = s.id
          AND NOT (b.end_ts <= $1 OR b.start_ts >= $2)
      ) ${whereLoc}
      ORDER BY s.location_id, s.name
    `, params);
    res.json(rows);
  } catch (err) {
    console.error("SPACES AVAILABLE error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});
// --- Bookings ---
app.get("/api/bookings/availability", async (req, res) => {
  try {
    const { space_id, start_ts, end_ts } = req.query;
    if (!space_id || !start_ts || !end_ts)
      return res.status(400).json({ error: "space_id, start_ts, end_ts sono richiesti" });

    const { rowCount } = await db.query(
      `SELECT 1 FROM "Bookings" WHERE space_id=$1 AND NOT (end_ts <= $2 OR start_ts >= $3) LIMIT 1`,
      [space_id, start_ts, end_ts]
    );
    res.json({ available: rowCount === 0 });
  } catch (err) {
    console.error("AVAIL error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

app.post("/api/bookings", auth, async (req, res) => {
  try {
    const { space_id, start_ts, end_ts } = req.body || {};
    if (!space_id || !start_ts || !end_ts)
      return res.status(400).json({ error: "space_id, start_ts, end_ts sono richiesti" });

    const ov = await db.query(
      `SELECT 1 FROM "Bookings" WHERE space_id=$1 AND NOT (end_ts <= $2 OR start_ts >= $3) LIMIT 1`,
      [space_id, start_ts, end_ts]
    );
    if (ov.rowCount > 0) return res.status(409).json({ error: "Intervallo non disponibile" });

    const { rows } = await db.query(
      `INSERT INTO "Bookings"(user_id, space_id, start_ts, end_ts)
       VALUES ($1,$2,$3,$4)
       RETURNING id, user_id, space_id, start_ts, end_ts, payment_status, created_at`,
      [req.user.sub, space_id, start_ts, end_ts]
    );
    res.status(201).json({ booking: rows[0] });
  } catch (err) {
    console.error("CREATE BOOKING error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

app.get("/api/bookings", auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM "Bookings" WHERE user_id=$1 ORDER BY start_ts DESC`,
      [req.user.sub]
    );
    res.json({ bookings: rows });
  } catch (err) {
    console.error("LIST BOOKING error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

// --- Manager ---
app.get("/api/manager/report", auth, requireRole("manager", "admin"), async (_req, res) => {
  try {
    const { rows: r1 } = await db.query(`
      SELECT
        COUNT(*)::int AS total_bookings,
        COALESCE(
          SUM(EXTRACT(EPOCH FROM (b.end_ts - b.start_ts))/3600.0 * s.price_per_hour),
          0
        ) AS revenue
      FROM "Bookings" b
      JOIN "Spaces" s ON s.id = b.space_id
    `);
    const summary = r1[0] || { total_bookings: 0, revenue: 0 };

    const { rows: last } = await db.query(`
      SELECT id, user_id, space_id, start_ts, end_ts, created_at, payment_status
      FROM "Bookings"
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.json({
      total_bookings: summary.total_bookings,
      revenue: Number(summary.revenue),
      last_bookings: last,
    });
  } catch (err) {
    console.error("MANAGER REPORT error:", err);
    res.status(500).json({ error: "Errore server" });
  }
});

module.exports = { app, ensureSchema };
