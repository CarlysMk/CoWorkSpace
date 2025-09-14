-- /backend/scripts/init_db.sql
-- Schema completo e idempotente per CoWorkSpace

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS "Users" (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                         -- <-- qui c'è la colonna mancante
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Se qualcuno avesse una colonna "password" legacy, NON la tocchiamo qui.

-- ===== LOCATIONS =====
CREATE TABLE IF NOT EXISTS "Locations" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  services JSONB DEFAULT '[]'::jsonb
);

-- ===== SPACES =====
CREATE TABLE IF NOT EXISTS "Spaces" (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES "Locations"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- desk | meeting | room
  price_per_hour NUMERIC(10,2) NOT NULL DEFAULT 5.00
);

-- ===== BOOKINGS =====
CREATE TABLE IF NOT EXISTS "Bookings" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "Users"(id) ON DELETE CASCADE,
  space_id INTEGER NOT NULL REFERENCES "Spaces"(id) ON DELETE CASCADE,
  start_ts TIMESTAMP NOT NULL,
  end_ts TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
);

CREATE INDEX IF NOT EXISTS bookings_space_idx ON "Bookings"(space_id);
CREATE INDEX IF NOT EXISTS bookings_time_idx  ON "Bookings"(start_ts, end_ts);

-- ===== SEED di base (idempotente) =====

-- Utente manager demo (password: manager123)
-- Hash bcrypt (compatibile con bcryptjs) per "manager123"
INSERT INTO "Users"(email, password_hash, role)
VALUES ('manager@cowork.it', '$2b$10$6mJ5o6S2q3bH0T7o4t1XUuA1t2rI2g7c9o7c9wqf6q2y9Rr8Y4f6C', 'manager')
ON CONFLICT (email) DO NOTHING;

-- Una sede di esempio
INSERT INTO "Locations"(name, city, address, services)
VALUES ('CoWork Milano Centrale', 'Milano', 'Via Roma 1, Milano', '["wifi","coffee","meeting-rooms"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Uno spazio di esempio nella sede
INSERT INTO "Spaces"(location_id, name, type, price_per_hour)
SELECT id, 'Sala Riunioni A', 'meeting', 15.00
FROM "Locations" WHERE name='CoWork Milano Centrale'
ON CONFLICT DO NOTHING;


-- Enforce uniqueness for Locations and Space names within a location
CREATE UNIQUE INDEX IF NOT EXISTS locations_unique ON "Locations"(name, city, address);
CREATE UNIQUE INDEX IF NOT EXISTS spaces_unique_loc_name ON "Spaces"(location_id, name);
