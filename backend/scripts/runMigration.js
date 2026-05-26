const fs = require('fs');
const path = require('path');
const { pool } = require('../config/pg');

const migrationPath = path.join(__dirname, '../db/migrations/001_create_vendors.sql');

const run = async () => {
  if (!pool) {
    console.error('DATABASE_URL not configured. Set DATABASE_URL in your environment before running this script.');
    process.exit(1);
  }

  const migrationsDir = path.join(__dirname, '../db/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const migrationPath = path.join(migrationsDir, file);
      console.log('Running migration:', migrationPath);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await client.query(sql);
    }
    
    console.log('Adding menu column to vendors if not exists...');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS menu JSONB;');
    console.log('Adding phone and note columns to vendors if not exists...');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;');
    await client.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS note TEXT;');
    console.log('Adding customer_note column to orders if not exists...');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note TEXT;');
    console.log('Adding delivery coordinates to orders if not exists...');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION;');
    console.log('All migrations finished successfully.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
};

run();
