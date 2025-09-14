const { applySecurity } = require('./middleware/security');
const app = require("./app");
const { Client } = require("pg");
const DATABASE_URL = process.env.DATABASE_URL || "postgres://cowork:coworkpass@db:5432/coworkdb";

async function runStartupMigrations() {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    await db.query(`
  -- Remove duplicates first
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY name, city, address ORDER BY id) AS rn
    FROM "Locations"
  )
  DELETE FROM "Locations" l
  USING ranked r
  WHERE l.id = r.id AND r.rn > 1;

  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY location_id, name, type, COALESCE(price_per_hour,0)
      ORDER BY id
    ) AS rn
    FROM "Spaces"
  )
  DELETE FROM "Spaces" s
  USING ranked r
  WHERE s.id = r.id AND r.rn > 1;

  -- Then create unique indexes
  CREATE UNIQUE INDEX IF NOT EXISTS locations_unique ON "Locations"(name, city, address);
  CREATE UNIQUE INDEX IF NOT EXISTS spaces_unique_loc_name ON "Spaces"(location_id, name);
`);
    console.log("✅ Startup migrations applied (unique Locations/Spaces + dedupe).");
  } catch (e) {
    console.warn("⚠️  Startup migration warning:", e.message);
  } finally {
    await db.end();
  }
}


const port = Number(process.env.PORT || 3001);
app.listen(port, "0.0.0.0", () => {
  console.log(`Backend listening on :${port}`);
});
