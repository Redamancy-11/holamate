const { Pool } = require('pg');

const run = async () => {
  const connectionString = 'postgresql://postgres.ffrucgiawjvzawhexnel:Yeunhattrendoi2208%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('Testing connection to Supabase pooler on port 6543...');
    const res = await pool.query('SELECT version()');
    console.log('Connection SUCCESS:', res.rows[0].version);
    process.exit(0);
  } catch (err) {
    console.error('Connection FAILED:', err.message);
    process.exit(1);
  }
};

run();
