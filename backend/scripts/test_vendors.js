const { connectPg } = require('../config/pg');
const { getAllVendors } = require('../services/vendorService');
const connectDB = require('../config/db');

const test = async () => {
  try {
    console.log('Connecting DBs...');
    await connectDB();
    await connectPg();
    console.log('Fetching vendors...');
    const result = await getAllVendors();
    console.log(`Successfully fetched ${result.length} vendors.`);
    if (result.length > 0) {
      console.log('First vendor:', JSON.stringify(result[0], null, 2));
    }
    process.exit(0);
  } catch (err) {
    console.error('Test Failed with error:', err);
    process.exit(1);
  }
};

test();
