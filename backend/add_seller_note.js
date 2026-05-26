const { pool } = require('./config/pg');

async function run() {
  try {
    console.log('Running migration to add seller_note column...');
    await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_note TEXT;');
    console.log('Successfully added seller_note column (or it already exists).');
    
    // Test fetch one order to see columns
    const testResult = await pool.query('SELECT * FROM orders LIMIT 1;');
    console.log('Columns in orders table:', testResult.fields.map(f => f.name));
    
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
