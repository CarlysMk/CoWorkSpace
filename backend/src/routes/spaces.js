// backend/src/routes/spaces.js
const express = require("express");
const { Client } = require("pg");
require("dotenv").config();

const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });

// GET /.../spaces/available?start_ts=...&end_ts=...&location_id=...
router.get("/available", async (req, res) => {
  const { start_ts, end_ts, location_id } = req.query || {};
  if (!start_ts || !end_ts) return res.status(400).json({ error: "start_ts ed end_ts sono obbligatori" });
  const db = getClient(); await db.connect();
  try {
    const params = [start_ts, end_ts];
    let where = "WHERE 1=1";
    if (location_id) { params.push(Number(location_id)); where += ` AND s.location_id = $${params.length}`; }
    const sql = `
      SELECT s.id, s.name, s.type, s.price_per_hour, s.location_id,
             l.name as location_name, l.city, l.address, l.services
      FROM "Spaces" s
      JOIN "Locations" l ON l.id = s.location_id
      ${where}
      AND NOT EXISTS (
        SELECT 1 FROM "Bookings" b
        WHERE b.space_id = s.id
          AND NOT (b.end_ts <= $1 OR b.start_ts >= $2)
      )
      ORDER BY l.city, l.name, s.name
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "Errore ricerca disponibilità", detail: e.message });
  } finally { await db.end(); }
});

// GET /.../spaces/:id -> dettaglio spazio + location
router.get("/:id", async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const { rows } = await db.query(`
      SELECT s.id, s.name, s.type, s.price_per_hour,
             l.id as location_id, l.name as location_name, l.city, l.address, l.services
      FROM "Spaces" s
      JOIN "Locations" l ON l.id = s.location_id
      WHERE s.id = $1
      LIMIT 1
    `, [Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: "Spazio non trovato" });
    const r = rows[0];
    res.json({
      id: r.id, name: r.name, type: r.type, price_per_hour: r.price_per_hour,
      location: { id: r.location_id, name: r.location_name, city: r.city, address: r.address, services: r.services }
    });
  } catch (e) {
    res.status(500).json({ error: "Errore fetch spazio", detail: e.message });
  } finally { await db.end(); }
});

module.exports = router;

// POST /api/locations/:location_id/spaces
router.post("/:location_id/spaces", auth, requireRole("admin","manager"), async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const location_id = Number(req.params.location_id);
    const { name, type, capacity, price_per_hour } = req.body || {};
    if (!name) return res.status(400).json({ error: "name obbligatorio" });
    const { rows } = await db.query(`
      INSERT INTO "Spaces"(location_id, name, type, capacity, price_per_hour) VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [location_id, name, type || null, capacity || null, price_per_hour || null]);
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: "Errore creazione space", detail: e.message }); }
  finally { await db.end(); }
});

router.put("/spaces/:id", auth, requireRole("admin","manager"), async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const id = Number(req.params.id);
    const { name, type, capacity, price_per_hour } = req.body || {};
    const { rows } = await db.query(`
      UPDATE "Spaces" SET
        name = COALESCE($2,name),
        type = COALESCE($3,type),
        capacity = COALESCE($4,capacity),
        price_per_hour = COALESCE($5,price_per_hour)
      WHERE id=$1 RETURNING *
    `, [id, name, type, capacity, price_per_hour]);
    if (!rows.length) return res.status(404).json({ error: "Spazio non trovato" });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: "Errore update space", detail: e.message }); }
  finally { await db.end(); }
});

router.delete("/spaces/:id", auth, requireRole("admin","manager"), async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const id = Number(req.params.id);
    await db.query(`DELETE FROM "Spaces" WHERE id=$1`, [id]);
    res.status(204).end();
  } catch (e) { res.status(500).json({ error: "Errore delete space", detail: e.message }); }
  finally { await db.end(); }
});
