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
      connectionTimeoutMillis: 4000, // Fail fast if blocked
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
    client.release();
    isPgConnected = true;
    console.log('Postgres connected via DATABASE_URL');
  } catch (err) {
    isPgConnected = false;
    console.error('Postgres connection failed:', err.message);
  }
};

module.exports = { pool, connectPg, getIsPgConnected: () => isPgConnected };
