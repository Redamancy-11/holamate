const { pool } = require('../config/pg');

const run = async () => {
  if (!pool) {
    console.error('DATABASE_URL not configured. Set DATABASE_URL in your environment before running this script.');
    process.exit(1);
  }

  try {
    const res = await pool.query('SELECT version()');
    console.log('Postgres connection OK:', res.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error('Postgres connection failed:', err.message);
    process.exit(1);
  }
};

run();
