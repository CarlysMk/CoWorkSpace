// backend/src/routes/admin.js
const express = require("express");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const { auth, requireRole } = require("../middleware/auth");

const router = express.Router();
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });

router.use(auth, requireRole("admin"));

router.get("/users", async (_req, res) => {
  const db = getClient(); await db.connect();
  try { const { rows } = await db.query(`SELECT id,email,role,created_at FROM "Users" ORDER BY id ASC`); res.json(rows); }
  catch(e){ res.status(500).json({ error:"Errore caricamento utenti", detail:e.message }); }
  finally { await db.end(); }
});

router.post("/users", async (req, res) => {
  const { email, password, role } = req.body || {};
  const allowed = ["manager","customer","admin"];
  if (!email || !password || !role) return res.status(400).json({ error:"email, password, role sono obbligatori" });
  if (!allowed.includes(role)) return res.status(400).json({ error:"Ruolo non valido" });
  const db = getClient(); await db.connect();
  try {
    const hash = bcrypt.hashSync(String(password), 10);
    const nEmail = String(email).toLowerCase().trim();
    const { rows } = await db.query(`
      INSERT INTO "Users"(email,password_hash,role)
      VALUES ($1,$2,$3)
      ON CONFLICT (email) DO NOTHING
      RETURNING id,email,role
    `, [nEmail, hash, role]);
    if (!rows.length) return res.status(409).json({ error:"Email già registrata" });
    res.status(201).json(rows[0]);
  } catch(e){ res.status(500).json({ error:"Errore creazione utente", detail:e.message }); }
  finally { await db.end(); }
});

module.exports = router;
