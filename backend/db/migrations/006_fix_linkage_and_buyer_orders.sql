-- Migration: 006_fix_linkage_and_buyer_orders
-- Fix orphaned seller→vendor links (set owner_id on vendors where sellers point to them but owner_id is NULL)
UPDATE vendors v
SET owner_id = s.id
FROM sellers s
WHERE s.vendor_id = v.id
  AND v.owner_id IS NULL;

-- Add phone column to sellers if not exists
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add index on orders.customer_id for fast buyer order history lookups
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- Add index on orders.status for filtering
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Add seller_id column to orders for direct seller linkage (derived from vendor.owner_id at order time)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES sellers(id) ON DELETE SET NULL;

-- Backfill seller_id on existing orders from vendor→owner_id→seller linkage
UPDATE orders o
SET seller_id = v.owner_id
FROM vendors v
WHERE o.vendor_id = v.id
  AND v.owner_id IS NOT NULL
  AND o.seller_id IS NULL;

-- Create index on orders.seller_id
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
