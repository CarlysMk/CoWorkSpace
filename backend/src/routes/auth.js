// backend/src/routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";

function getClient() {
  return new Client({ connectionString: DATABASE_URL });
}

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function bad(res, message = "Bad Request", code = 400) {
  return res.status(code).json({ error: message });
}

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return bad(res, "Email e password sono obbligatorie");
    const nEmail = String(email).toLowerCase().trim();
    const hash = bcrypt.hashSync(String(password), 10);

    const db = getClient(); await db.connect();
    try {
      const q = `
        INSERT INTO "Users"(email, password_hash, role)
        VALUES ($1,$2,$3)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, role
      `;
      const { rows } = await db.query(q, [nEmail, hash, 'customer']);
      if (!rows.length) return bad(res, "Email già registrata", 409);

      const u = rows[0];
      return res.status(201).json({
        token: sign({ sub: u.id, email: u.email, role: u.role }),
        email: u.email,
        role: u.role,
      });
    } finally {
      await db.end();
    }
  } catch (err) { console.error("REGISTER ERROR:", err); return next(err); }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return bad(res, "Email e password sono obbligatorie");
    const nEmail = String(email).toLowerCase().trim();

    const db = getClient(); await db.connect();
    try {
      const { rows } = await db.query(`SELECT id, email, role, password_hash FROM "Users" WHERE email=$1`, [nEmail]);
      if (!rows.length) return bad(res, "Credenziali non valide", 401);
      const u = rows[0];
      if (!bcrypt.compareSync(String(password), u.password_hash)) return bad(res, "Credenziali non valide", 401);

      return res.json({
        token: sign({ sub: u.id, email: u.email, role: u.role }),
        email: u.email,
        role: u.role,
      });
    } finally {
      await db.end();
    }
  } catch (err) { console.error("LOGIN ERROR:", err); return next(err); }
});

// GET /api/auth/me
router.get("/me", (req, res) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token mancante" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ user: { sub: payload.sub, email: payload.email, role: payload.role } });
  } catch {
    return res.status(401).json({ error: "Token non valido" });
  }
});

module.exports = router;
