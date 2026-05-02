-- Create exchange_rates table for manual currency conversion
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_currency TEXT NOT NULL,
  rate NUMERIC(12, 4) NOT NULL,  -- 1 from_currency = rate * base_currency
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(trip_id, from_currency)
);

CREATE INDEX exchange_rates_trip_id_idx ON exchange_rates(trip_id);

-- Add converted cost columns to receipts
ALTER TABLE receipts ADD COLUMN converted_cost NUMERIC(12, 2);
ALTER TABLE receipts ADD COLUMN exchange_rate NUMERIC(12, 4);

-- RLS for exchange_rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to exchange_rates" ON exchange_rates
  FOR ALL USING (true) WITH CHECK (true);
