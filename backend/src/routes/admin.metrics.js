// backend/src/routes/admin.metrics.js
const express = require("express");
const { Pool } = require("pg");

const router = express.Router();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://cowork:coworkpass@db:5432/coworkdb",
  ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
});

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}
async function scalar(sql, params = []) {
  const rows = await q(sql, params);
  const v = rows?.[0] && Object.values(rows[0])[0];
  return Number(v) || 0;
}
async function tableHasColumn(table, column) {
  const rows = await q(
    `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2 LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

// --- METRICS ---
router.get("/metrics", async (_req, res) => {
  try {
    const [locationsCount, bookingsCount, usersCount] = await Promise.all([
      scalar(`SELECT COUNT(*) FROM locations`),
      scalar(`SELECT COUNT(*) FROM bookings`),
      scalar(`SELECT COUNT(*) FROM users`),
    ]);

    const hasRole = await tableHasColumn("users", "role");
    const hasRoles = await tableHasColumn("users", "roles");

    let adminsCount = 0, managersCount = 0, regularUsersCount = 0;
    if (hasRoles) {
      const r = await q(
        `SELECT
           SUM(CASE WHEN 'admin'   = ANY(roles) THEN 1 ELSE 0 END) AS admins,
           SUM(CASE WHEN 'manager' = ANY(roles) THEN 1 ELSE 0 END) AS managers,
           SUM(CASE WHEN 'user'    = ANY(roles) THEN 1 ELSE 0 END) AS regulars
         FROM users`
      );
      adminsCount = Number(r?.[0]?.admins || 0);
      managersCount = Number(r?.[0]?.managers || 0);
      regularUsersCount = Number(r?.[0]?.regulars || 0);
    } else if (hasRole) {
      const r = await q(
        `SELECT
           SUM(CASE WHEN role='admin' THEN 1 ELSE 0 END)   AS admins,
           SUM(CASE WHEN role='manager' THEN 1 ELSE 0 END) AS managers,
           SUM(CASE WHEN role='user' THEN 1 ELSE 0 END)    AS regulars
         FROM users`
      );
      adminsCount = Number(r?.[0]?.admins || 0);
      managersCount = Number(r?.[0]?.managers || 0);
      regularUsersCount = Number(r?.[0]?.regulars || 0);
    }

    res.json({
      locationsCount, bookingsCount, usersCount,
      adminsCount, managersCount, regularUsersCount,
    });
  } catch (err) {
    console.error("GET /api/admin/metrics error", err);
    res.status(500).json({ error: "metrics_failed", details: String(err?.message || err) });
  }
});

// --- USERS ---
router.get("/users", async (_req, res) => {
  try {
    const hasRole = await tableHasColumn("users", "role");
    const hasRoles = await tableHasColumn("users", "roles");
    let sql = `SELECT id, email`;
    if (hasRole) sql += `, role`;
    if (hasRoles) sql += `, roles`;
    sql += ` FROM users ORDER BY id DESC LIMIT 1000`;
    const rows = await q(sql);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/admin/users error", err);
    res.status(500).json({ error: "users_failed", details: String(err?.message || err) });
  }
});

// --- BOOKINGS (count o lista) ---
router.get("/bookings", async (req, res) => {
  try {
    if (String(req.query.count) === "1") {
      const count = await scalar(`SELECT COUNT(*) FROM bookings`);
      return res.json({ count });
    }
    const rows = await q(
      `SELECT id, user_id, space_id, date, start_time AS start, end_time AS end, status, price, created_at
       FROM bookings
       ORDER BY created_at DESC
       LIMIT 500`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/admin/bookings error", err);
    res.status(500).json({ error: "bookings_failed", details: String(err?.message || err) });
  }
});

// --- LOCATIONS (minimo indispensabile) ---
router.get("/locations", async (_req, res) => {
  try {
    const rows = await q(
      `SELECT id, name, city, address FROM locations ORDER BY id ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/admin/locations error", err);
    res.status(500).json({ error: "locations_failed", details: String(err?.message || err) });
  }
});

module.exports = router;
