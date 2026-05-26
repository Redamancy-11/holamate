-- Migration: create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  address TEXT,
  district TEXT,
  price_min INTEGER,
  price_max INTEGER,
  price_unit TEXT,
  price_range JSONB,
  hours TEXT,
  rating REAL,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  tags JSONB,
  tips TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes to speed up common searches
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors USING gin (to_tsvector('simple', coalesce(name, '')));
CREATE INDEX IF NOT EXISTS idx_vendors_location ON vendors (longitude, latitude);
