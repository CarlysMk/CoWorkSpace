// backend/src/db/init.js
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";

function client() {
  return new Client({ connectionString: DATABASE_URL });
}

/**
 * Crea/aggiorna lo schema in modo idempotente e coerente con init_db.sql.
 */
async function ensureSchema() {
  const db = client();
  await db.connect();
  try {
    await db.query("BEGIN");

    // USERS (con password_hash)
    await db.query(`
      CREATE TABLE IF NOT EXISTS "Users" (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'customer',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // LOCATIONS
    await db.query(`
      CREATE TABLE IF NOT EXISTS "Locations" (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        address TEXT NOT NULL,
        services JSONB NOT NULL DEFAULT '[]'::jsonb
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

    // BOOKINGS (con payment_status)
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

// --- MIGRATIONS idempotenti ---
await db.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS password_hash TEXT`);
await db.query(`ALTER TABLE "Users" DROP COLUMN IF EXISTS password`);
await db.query(`ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'`);

    // SEED manager (password: manager123)
    const hash = bcrypt.hashSync("manager123", 10);
    await db.query(`
      INSERT INTO "Users"(email, password_hash, role)
      VALUES ('manager@cowork.it', $1, 'manager')
      ON CONFLICT (email) DO NOTHING;
    `, [hash]);

    // Seed minimale demo location/space
    await db.query(`
      INSERT INTO "Locations"(name, city, address, services)
      VALUES ('CoWork Milano Centrale','Milano','Via Roma 1, Milano','["wifi","coffee","meeting-rooms"]'::jsonb)
      ON CONFLICT DO NOTHING;
    `);
    await db.query(`
      INSERT INTO "Spaces"(location_id, name, type, price_per_hour)
      SELECT id, 'Sala Riunioni A', 'meeting', 15.00 FROM "Locations" WHERE name='CoWork Milano Centrale'
      ON CONFLICT DO NOTHING;
    `);

    // --- Ensure default admin exists ---
const adminEmail = 'root@cowork.it';
const adminHash = bcrypt.hashSync('CowRoot', 10);
await db.query(`
  INSERT INTO "Users"(email, password_hash, role)
  VALUES ($1, $2, 'admin')
  ON CONFLICT (email) DO NOTHING;
`, [adminEmail, adminHash]);
// --- End ensure admin ---

await db.query("COMMIT");
    console.log("✅ DB schema ok");
  } catch (e) {
    await db.query("ROLLBACK");
    console.error("❌ DB init error:", e.message);
    throw e;
  } finally {
    await db.end();
  }
}

module.exports = { ensureSchema };
