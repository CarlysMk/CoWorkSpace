-- Users
CREATE TABLE IF NOT EXISTS "Users" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  role VARCHAR(20) DEFAULT 'client',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Locations
CREATE TABLE IF NOT EXISTS "Locations" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  services TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Spaces
CREATE TABLE IF NOT EXISTS "Spaces" (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES "Locations"(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL,
  capacity INTEGER DEFAULT 1,
  price_per_hour NUMERIC(8,2) DEFAULT 10.00
);

-- Bookings
CREATE TABLE IF NOT EXISTS "Bookings" (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  space_id INTEGER NOT NULL REFERENCES "Spaces"(id) ON DELETE CASCADE,
  start_ts TIMESTAMP NOT NULL,
  end_ts   TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaces_location ON "Spaces"(location_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space ON "Bookings"(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_range ON "Bookings"(start_ts, end_ts);

-- Seed minimo
INSERT INTO "Users"(email,password_hash,role)
VALUES ('manager@cowork.it', '$2a$10$placeholderhash', 'manager')
ON CONFLICT (email) DO NOTHING;

INSERT INTO "Locations"(name,city,address,services) VALUES
('CoWork Duomo','Milano','Via Dante 14','["wifi","coffee","printer","meeting-rooms"]'),
('CoWork Garibaldi','Milano','Corso Como 7','["wifi","phone-booths","printer"]'),
('CoWork Navigli','Milano','Ripa di Porta Ticinese 18','["wifi","coffee","meeting-rooms"]'),
('CoWork Trastevere','Roma','Via della Lungaretta 40','["wifi","coffee","phone-booths"]'),
('CoWork Quadrilatero','Torino','Via Lagrange 24','["wifi","coffee","lockers"]')
ON CONFLICT DO NOTHING;

INSERT INTO "Spaces"(location_id,name,type,capacity,price_per_hour) VALUES
(1,'Sala Castello','meeting',8,24.00),
(2,'Sala Como','meeting',12,32.00),
(3,'Sala Navigli','meeting',8,22.00),
(4,'Sala Trastevere','meeting',6,18.00),
(5,'Sala Quadrilatero','meeting',8,23.00)
ON CONFLICT DO NOTHING;


-- Enforce uniqueness for Locations and Space names within a location
CREATE UNIQUE INDEX IF NOT EXISTS locations_unique ON "Locations"(name, city, address);
CREATE UNIQUE INDEX IF NOT EXISTS spaces_unique_loc_name ON "Spaces"(location_id, name);
