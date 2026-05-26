const { Client } = require('pg');

const regions = [
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'ca-central-1',
  'sa-east-1'
];

const passwords = [
  'Yeunhattrendoi2208@',
  'anhtuan22082004'
];

const testConfig = async (region, password) => {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const encodedPassword = encodeURIComponent(password);
  const connectionString = `postgresql://postgres.ffrucgiawjvzawhexnel:${encodedPassword}@${host}:6543/postgres`;
  
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Connected!`);
    console.log(`Region: ${region}`);
    console.log(`Password: ${password}`);
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
      console.log(`⚠️ Resolved region ${region} with password "${password}", but password failed!`);
      await client.end();
    } else if (err.message.includes('Tenant or user not found') || err.message.includes('tenant/user') || err.message.includes('ENOTFOUND')) {
      // Not resolved or wrong tenant/user
    } else {
      console.log(`❓ Region ${region} other error: ${err.message}`);
      await client.end();
    }
  }
  return false;
};

const run = async () => {
  console.log('Testing combinations of regions and passwords...');
  for (const region of regions) {
    for (const password of passwords) {
      const success = await testConfig(region, password);
      if (success) {
        process.exit(0);
      }
    }
  }
  console.log('\n❌ No combination worked.');
  process.exit(1);
};

run();
