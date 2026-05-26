require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/pg');

(async () => {
  try {
    const totalRes = await pool.query('SELECT COUNT(*) FROM vendors');
    console.log('Total vendors in database:', totalRes.rows[0].count);

    const outRes = await pool.query(`
      SELECT id, name, longitude, latitude, owner_id FROM vendors
      WHERE owner_id IS NULL AND (
        latitude < 20.97 
        OR latitude > 21.08 
        OR longitude < 105.47 
        OR longitude > 105.59
        OR latitude IS NULL
        OR longitude IS NULL
      )
    `);
    console.log('Out of bounds vendors (should be 0):', outRes.rows.length);
    if (outRes.rows.length > 0) {
      console.log('Sample out of bounds vendors:', outRes.rows.slice(0, 5));
    }

    const menuStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN menu IS NOT NULL AND jsonb_array_length(menu) > 0 THEN 1 END) as with_menu
      FROM vendors
    `);
    console.log('Menu stats:', menuStats.rows[0]);

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
