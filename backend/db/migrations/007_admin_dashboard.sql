-- Migration: 007_admin_dashboard
-- Add admin role support and financial tracking columns

-- Add admin role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add financial columns to vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS commission_rate REAL DEFAULT 10.0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_revenue BIGINT DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS menu JSONB DEFAULT '[]'::JSONB;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS note TEXT;

-- Add financial tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_hidden BOOLEAN DEFAULT FALSE;

-- Create withdrawals table for finance management
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  bank_info JSONB,
  note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_seller ON withdrawals(seller_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Create admin activity log
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at DESC);
