-- Migration: 005_create_sellers
CREATE TABLE IF NOT EXISTS sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar TEXT,
  vendor_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing sellers from users table to sellers table
INSERT INTO sellers (id, name, email, password, avatar, vendor_id, created_at)
SELECT id, name, email, password, avatar, vendor_id, created_at
FROM users
WHERE role = 'seller'
ON CONFLICT (email) DO NOTHING;

-- Delete migrated sellers from users table so it only contains buyers
DELETE FROM users WHERE role = 'seller';

-- Update foreign key constraint on vendors (owner_id references sellers instead of users)
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_owner_id_fkey;
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_owner_id_sellers_fkey;

ALTER TABLE vendors ALTER COLUMN owner_id TYPE UUID;
ALTER TABLE vendors ADD CONSTRAINT vendors_owner_id_sellers_fkey FOREIGN KEY (owner_id) REFERENCES sellers(id) ON DELETE SET NULL;
