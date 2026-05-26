const { Client } = require('pg');

const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1'];
const indices = [0, 1, 2, 3, 4];
const password = 'Yeunhattrendoi2208@';

const testHost = async (host) => {
  const connectionString = `postgresql://postgres.ffrucgiawjvzawhexnel:${encodeURIComponent(password)}@${host}:6543/postgres`;
  
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 4000,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`\n🎉 CONNECTED SUCCESSFULLY to ${host}!`);
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log(`⚠️ RESOLVED and found tenant on ${host}! Password failed though.`);
      await client.end();
      return true;
    } else {
      console.log(`❌ ${host} - ${err.message}`);
    }
  }
  return false;
};

const run = async () => {
  console.log('Testing different pooler hosts and indices...');
  for (const region of regions) {
    for (const index of indices) {
      const host = `aws-${index}-${region}.pooler.supabase.com`;
      const success = await testHost(host);
      if (success) {
        process.exit(0);
      }
    }
  }
  console.log('\n❌ No matching pooler found.');
  process.exit(1);
};

run();
