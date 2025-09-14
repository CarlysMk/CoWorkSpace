// backend/src/routes/locations.js
const express = require("express");
const { Client } = require("pg");
require("dotenv").config();

const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });

/**
 * Utility: costruisce WHERE e params in modo sicuro
 */
function buildFilters(query) {
  const { city, type, services, available_from, available_to } = query || {};
  const where = [];
  const params = [];

  // Città (ricerca parziale case-insensitive)
  if (city && city.trim()) {
    params.push(`%${city.trim()}%`);
    where.push(`l.city ILIKE $${params.length}`);
  }

  // Tipo spazio
  if (type && type.trim() && type !== "Tutte") {
    params.push(type.trim());
    where.push(`s.type = $${params.length}`);
  }

  // Servizi (compatibile con TEXT o JSONB in DB)
  if (services && String(services).trim()) {
    const list = String(services)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (list.length) {
      params.push(JSON.stringify(list));
      // Se la colonna è TEXT, il cast a ::jsonb la rende interrogabile con @>
      where.push(`COALESCE(l.services::jsonb, '[]'::jsonb) @> $${params.length}::jsonb`);
    }
  }

  // Disponibilità: nessuna prenotazione che si sovrappone all'intervallo
  if (available_from && available_to) {
    params.push(available_from, available_to);
    const start = params.length - 1; // indice $n-1
    const end = params.length;       // indice $n
    where.push(`
      NOT EXISTS (
        SELECT 1
        FROM "Bookings" b
        WHERE b.space_id = s.id
          AND NOT (b.end_ts <= $${start} OR b.start_ts >= $${end})
      )
    `);
  }

  return { where, params };
}

// GET /api/locations?city=&type=&services=wifi,coffee&available_from=&available_to=
router.get("/", async (req, res) => {
  const db = getClient();
  await db.connect();
  try {
    const { where, params } = buildFilters(req.query);

    const sql = `
      SELECT
        l.id                AS location_id,
        l.name              AS location_name,
        l.city,
        l.address,
        COALESCE(l.services::jsonb, '[]'::jsonb) AS services,
        s.id                AS space_id,
        s.name              AS space_name,
        s.type,
        s.price_per_hour
      FROM "Locations" l
      JOIN "Spaces" s ON s.location_id = l.id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY l.city, l.name, s.name
    `;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: "Errore fetch locations", detail: e.message });
  } finally {
    await db.end();
  }
});

// GET /api/locations/:id/spaces
router.get("/:id/spaces", async (req, res) => {
  const db = getClient();
  await db.connect();
  try {
    const { rows } = await db.query(
      `SELECT * FROM "Spaces" WHERE location_id = $1 ORDER BY name`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) {
    res
      .status(500)
      .json({ message: "Errore fetch spazi per location", detail: e.message });
  } finally {
    await db.end();
  }
});

// GET /api/locations/available?start_ts=...&end_ts=...
router.get("/available", async (req, res) => {
  const db = getClient();
  await db.connect();
  try {
    const { start_ts, end_ts } = req.query;
    if (!start_ts || !end_ts) {
      return res.status(400).json({ message: "start_ts e end_ts sono obbligatori" });
    }
    const sql = `
      SELECT
        l.id, l.name, l.city, l.address,
        COALESCE(l.services::jsonb, '[]'::jsonb) AS services
      FROM "Locations" l
      WHERE EXISTS (
        SELECT 1
        FROM "Spaces" s
        WHERE s.location_id = l.id
          AND NOT EXISTS (
            SELECT 1
            FROM "Bookings" b
            WHERE b.space_id = s.id
              AND NOT (b.end_ts <= $1 OR b.start_ts >= $2)
          )
      )
      ORDER BY l.city, l.name
    `;
    const { rows } = await db.query(sql, [start_ts, end_ts]);
    res.json(rows);
  } catch (e) {
    res
      .status(500)
      .json({ message: "Errore filtro sedi disponibili", detail: e.message });
  } finally {
    await db.end();
  }
});

// POST /api/locations
router.post("/", auth, requireRole("admin", "manager"), async (req, res) => {
  const db = getClient();
  await db.connect();
  try {
    const { name, city, address, services = [] } = req.body || {};
    if (!name || !city || !address) {
      return res.status(400).json({ error: "Campi obbligatori mancanti" });
    }

    const { rows } = await db.query(
      `
      INSERT INTO "Locations"(name, city, address, services)
      VALUES ($1, $2, $3, $4::jsonb)
      ON CONFLICT (name, city, address)
      DO UPDATE SET services = COALESCE(EXCLUDED.services, "Locations".services)
      RETURNING *
    `,
      [name, city, address, JSON.stringify(services)]
    );

    res.status(201).json(rows[0]);
  } catch (e) {
    res
      .status(500)
      .json({ error: "Errore creazione location", detail: e.message });
  } finally {
    await db.end();
  }
});

// PUT /api/locations/:id
router.put("/:id", auth, requireRole("admin", "manager"), async (req, res) => {
  const db = getClient();
  await db.connect();
  try {
    const id = Number(req.params.id);
    const { name, city, address, services } = req.body || {};

    // stato attuale
    const cur = await db.query(
      `SELECT id, name, city, address, services FROM "Locations" WHERE id = $1`,
      [id]
    );
    if (!cur.rows.length) return res.status(404).json({ error: "Location non trovata" });
    const current = cur.rows[0];

    // merge lato Node
    const newName = typeof name === "string" && name.trim() !== "" ? name.trim() : current.name;
    const newCity = typeof city === "string" && city.trim() !== "" ? city.trim() : current.city;
    const newAddress = typeof address === "string" && address.trim() !== "" ? address.trim() : current.address;
    const newServices = services === undefined ? current.services : services;

    const upd = await db.query(
      `
      UPDATE "Locations"
      SET name = $2,
          city = $3,
          address = $4,
          services = $5::jsonb
      WHERE id = $1
      RETURNING *
      `,
      [id, newName, newCity, newAddress, JSON.stringify(newServices)]
    );

    res.json(upd.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "Errore update location", detail: e.message });
  } finally {
    await db.end();
  }
});

// DELETE /api/locations/:id
router.delete("/:id", auth, requireRole("admin", "manager"), async (req, res) => {
  const db = getClient();
  await db.connect();
  try {
    const id = Number(req.params.id);
    await db.query(`DELETE FROM "Locations" WHERE id = $1`, [id]);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: "Errore delete location", detail: e.message });
  } finally {
    await db.end();
  }
});

// normalize various services shapes to array of strings
function normalizeServices(sv){
  if (sv == null) return [];
  if (Array.isArray(sv)) return sv.map(String);
  if (typeof sv === 'object') return Object.keys(sv).filter(k=>!!sv[k]);
  if (typeof sv === 'string'){
    const s = sv.trim();
    try { const j = JSON.parse(s); return Array.isArray(j)? j.map(String): (typeof j==='object'? Object.keys(j).filter(k=>!!j[k]) : s.split(/[\s,;]+/).filter(Boolean)); }
    catch(_){ return s.split(/[\s,;]+/).filter(Boolean); }
  }
  return [];
}

module.exports = router;
// best-effort autopatch on module load
try { ensureUpdatedAtTrigger(require('../db')); } catch(_e) {}
