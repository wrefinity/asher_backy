-- Enable PostGIS and add a geography point on properties for radius search.
-- Run: npx prisma db execute --file prisma/sql/enable_postgis_location.sql

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

CREATE INDEX IF NOT EXISTS properties_location_gist_idx
ON properties USING GIST (location);

UPDATE properties
SET location = ST_SetSRID(
  ST_MakePoint(longitude::double precision, latitude::double precision),
  4326
)::geography
WHERE latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND location IS NULL;

CREATE OR REPLACE FUNCTION sync_property_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(
      ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision),
      4326
    )::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_property_location ON properties;

CREATE TRIGGER trg_sync_property_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON properties
FOR EACH ROW
EXECUTE FUNCTION sync_property_location();
