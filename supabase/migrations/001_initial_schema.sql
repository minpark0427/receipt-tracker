-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create trips table
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  budget NUMERIC(10, 2) NOT NULL DEFAULT 1280.00,
  currency TEXT NOT NULL DEFAULT 'USD'
);

-- Create receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  image_url TEXT,
  date DATE,
  time TIME,
  location TEXT,
  cost NUMERIC(10, 2),
  original_currency TEXT,
  ocr_confidence NUMERIC(3, 2),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster trip lookups
CREATE INDEX receipts_trip_id_idx ON receipts(trip_id);
CREATE INDEX receipts_trip_date_idx ON receipts(trip_id, date DESC);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all operations for now (no auth, using trip_id as access token)
-- Anyone who knows the trip_id can access that trip's data

CREATE POLICY "Allow all access to trips" ON trips
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to receipts" ON receipts
  FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for receipts table
ALTER PUBLICATION supabase_realtime ADD TABLE receipts;
