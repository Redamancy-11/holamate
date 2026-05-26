const { execSync } = require('child_process');
const path = require('path');
const { pool } = require('../config/pg');

const migrateScript = path.join(__dirname, 'runMigration.js');
const seedScript = path.join(__dirname, 'seedVendorsToPostgres.js');

const run = async () => {
  if (!pool) {
    console.error('DATABASE_URL not configured. Set DATABASE_URL in your environment before running this script.');
    process.exit(1);
  }

  try {
    console.log('Running Postgres migration...');
    execSync(`node "${migrateScript}"`, { stdio: 'inherit' });
    console.log('Seeding vendors into Postgres...');
    execSync(`node "${seedScript}"`, { stdio: 'inherit' });
    console.log('Postgres setup complete.');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  }
};

run();
