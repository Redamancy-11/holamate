const { pool } = require('../config/pg');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  if (!pool) {
    console.error('DATABASE_URL not configured.');
    process.exit(1);
  }

  const email = 'admin@hanomate.vn';
  const password = 'admin123';
  const name = 'HanoMate Super Admin';

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Check if user already exists
    const checkRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (checkRes.rows.length > 0) {
      console.log('Admin user already exists. Updating details and password...');
      await pool.query(
        'UPDATE users SET password = $1, is_admin = TRUE, name = $2, role = $3 WHERE email = $4',
        [hashedPassword, name, 'buyer', email] // buyer role by default for non-sellers, is_admin controls admin portal
      );
    } else {
      console.log('Creating default Admin user...');
      await pool.query(
        'INSERT INTO users (name, email, password, is_admin, provider, role) VALUES ($1, $2, $3, TRUE, $4, $5)',
        [name, email, hashedPassword, 'local', 'buyer']
      );
    }
    console.log('Admin user successfully created/updated:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (err) {
    console.error('Error creating admin user:', err.message);
  } finally {
    process.exit(0);
  }
};

createAdmin();
