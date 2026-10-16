-- 005_party_location_coords.sql
-- Add latitude and longitude columns to parties table for GPS location tracking & geofencing

ALTER TABLE parties ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE parties ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_parties_lat_lng ON parties(latitude, longitude);
