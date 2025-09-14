
-- Idempotent migration: remove duplicates first, THEN create unique indexes
-- This script is safe to run multiple times.

BEGIN;

-- 1) Remove exact duplicates in Locations (same name/city/address), keep the smallest id
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY name, city, address ORDER BY id) AS rn
  FROM "Locations"
)
DELETE FROM "Locations" l
USING ranked r
WHERE l.id = r.id AND r.rn > 1;

-- 2) Remove exact duplicates in Spaces (same location_id/name/type/price), keep the smallest id
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

-- 3) Create unique indexes (now that data is clean)
CREATE UNIQUE INDEX IF NOT EXISTS locations_unique ON "Locations"(name, city, address);
CREATE UNIQUE INDEX IF NOT EXISTS spaces_unique_loc_name ON "Spaces"(location_id, name);

COMMIT;
