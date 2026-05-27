const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';

let pool = null;
let isPgConnected = false;

if (connectionString) {
  try {
    // Supabase requires SSL; accept self-signed certs in many environments
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000, // Standard timeout to handle cold starts
    });
  } catch (err) {
    console.error('Error initializing PG Pool:', err.message);
    pool = null;
  }
}

const connectPg = async () => {
  if (!pool) {
    console.warn('Postgres DATABASE_URL not provided; skipping Postgres connection.');
    return;
  }
  try {
    // Simple test query with client check to ensure connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    
    // Add columns dynamically if they do not exist
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS commission_rate REAL DEFAULT 10.0;');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_revenue BIGINT DEFAULT 0;');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT \'active\';');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS menu JSONB DEFAULT \'[]\'::JSONB;');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS note TEXT;');

    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount INTEGER DEFAULT 0;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_note TEXT;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_hidden BOOLEAN DEFAULT FALSE;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_hidden BOOLEAN DEFAULT FALSE;');

    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;');
    await client.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
    await client.query('ALTER TABLE sellers ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;');
    
    // Create page_reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_reviews (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(50) NOT NULL,
        user_name VARCHAR(255) DEFAULT 'Người dùng ẩn danh',
        rating INTEGER,
        comment TEXT NOT NULL,
        page_path VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);

    // Create withdrawals table
    await client.query(`
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
    `);

    // Create admin_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id UUID NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
    
    client.release();
    isPgConnected = true;
    console.log('Postgres connected and schema verified');
  } catch (err) {
    isPgConnected = false;
    console.error('Postgres connection failed:', err.message);
  }
};

module.exports = { pool, connectPg, getIsPgConnected: () => isPgConnected };
