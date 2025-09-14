
// backend/src/routes/adminWizard.js
const express = require("express");
const { Client } = require("pg");
require("dotenv").config();

const router = express.Router();
const { auth, requireRole } = require("../middleware/auth");

const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";
const getClient = () => new Client({ connectionString: DATABASE_URL });

/**
 * Utilities
 */
function normalizeServices(services) {
  if (!services) return "[]";
  if (Array.isArray(services)) return JSON.stringify(services);
  // already stringified JSON or comma list
  try { JSON.parse(services); return services; } catch {}
  return JSON.stringify(String(services).split(",").map(s => s.trim()).filter(Boolean));
}

function validatePayload(payload) {
  const errors = [];
  const loc = payload?.location || {};
  const spaces = Array.isArray(payload?.spaces) ? payload.spaces : [];
  if (!loc.name) errors.push({ path: "location.name", message: "Nome sede obbligatorio" });
  if (!loc.city) errors.push({ path: "location.city", message: "Città obbligatoria" });
  if (!loc.address) errors.push({ path: "location.address", message: "Indirizzo obbligatorio" });
  spaces.forEach((s, i) => {
    if (!s.name) errors.push({ path: `spaces[${i}].name`, message: "Nome spazio obbligatorio" });
    if (!s.type) errors.push({ path: `spaces[${i}].type`, message: "Tipo spazio obbligatorio" });
    const cap = Number(s.capacity ?? 1);
    if (!(cap >= 1)) errors.push({ path: `spaces[${i}].capacity`, message: "Capacità >= 1" });
    const pph = Number(s.price_per_hour ?? 0);
    if (!(pph >= 0)) errors.push({ path: `spaces[${i}].price_per_hour`, message: "Prezzo >= 0" });
  });
  return errors;
}

// GET /api/admin/wizard/prefill
router.get("/prefill", auth, requireRole("admin","manager"), async (_req, res) => {
  res.json({
    services_catalog: ["wifi","coffee","printer","lockers","phone-booths","meeting-rooms"],
    space_types: ["meeting","desk","private_office","event"],
    defaults: { price_per_hour: 10, capacity: 1 }
  });
});

// POST /api/admin/wizard/validate
router.post("/validate", auth, requireRole("admin","manager"), async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const payload = req.body || {};
    const errs = validatePayload(payload);
    if (errs.length) return res.status(422).json({ ok: false, errors: errs });

    // check uniqueness on location (name, city, address)
    const { name, city, address } = payload.location;
    const { rowCount } = await db.query(
      'SELECT 1 FROM "Locations" WHERE name=$1 AND city=$2 AND address=$3 LIMIT 1',
      [name, city, address]
    );
    if (rowCount > 0) {
      return res.status(409).json({ ok:false, errors: [{ path: "location", message: "Sede già esistente" }]});
    }

    // check duplicates in spaces names within the payload
    const names = new Set();
    for (const s of payload.spaces || []) {
      const key = s.name?.trim().toLowerCase();
      if (names.has(key)) {
        return res.status(422).json({ ok:false, errors: [{ path: "spaces", message: `Nome spazio duplicato: ${s.name}` }]});
      }
      names.add(key);
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("wizard/validate", e);
    res.status(500).json({ ok:false, message: "Errore validazione", detail: e.message });
  } finally { await db.end(); }
});

// POST /api/admin/wizard/commit
router.post("/commit", auth, requireRole("admin","manager"), async (req, res) => {
  const db = getClient(); await db.connect();
  try {
    const payload = req.body || {};
    const errs = validatePayload(payload);
    if (errs.length) return res.status(422).json({ ok: false, errors: errs });

    const client = db;
    await client.query("BEGIN");
    // Insert Location
    const { name, city, address } = payload.location;
    const services = normalizeServices(payload.location.services);
    // idempotency based on unique index
    const existing = await client.query(
      'SELECT id FROM "Locations" WHERE name=$1 AND city=$2 AND address=$3',
      [name, city, address]
    );
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok:false, message: "Sede già esistente", location_id: existing.rows[0].id });
    }

    const insLoc = await client.query(
      'INSERT INTO "Locations"(name,city,address,services) VALUES ($1,$2,$3,$4) RETURNING id,name,city,address,services',
      [name, city, address, services]
    );
    const location_id = insLoc.rows[0].id;

    // Insert Spaces
    const createdSpaces = [];
    for (const s of payload.spaces || []) {
      const { name: sname, type, capacity = 1, price_per_hour = 0 } = s;
      const ins = await client.query(
        'INSERT INTO "Spaces"(location_id,name,type,capacity,price_per_hour) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, type, capacity, price_per_hour',
        [location_id, sname, type, Number(capacity), Number(price_per_hour)]
      );
      createdSpaces.push(ins.rows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json({ ok:true, location: insLoc.rows[0], spaces: createdSpaces });
  } catch (e) {
    console.error("wizard/commit", e);
    try { await db.query("ROLLBACK"); } catch {}
    if (e.code === "23505") {
      return res.status(409).json({ ok:false, message: "Violazione vincolo di unicità" });
    }
    res.status(500).json({ ok:false, message: "Errore commit wizard", detail: e.message });
  } finally { await db.end(); }
});

module.exports = router;
