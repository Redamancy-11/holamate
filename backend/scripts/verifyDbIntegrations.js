const { pool } = require('../config/pg');
const crypto = require('crypto');

const runVerification = async () => {
  if (!pool) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('🏁 Starting Supabase database integration tests...\n');

    // 1. Get an active vendor
    console.log('🔍 Step 1: Retrieving an active vendor...');
    const vendorRes = await client.query('SELECT id, name, menu FROM vendors LIMIT 1;');
    if (!vendorRes.rows.length) {
      throw new Error('No vendors found. Please run seed or imports first.');
    }
    const vendor = vendorRes.rows[0];
    console.log(`   Found vendor: "${vendor.name}" (ID: ${vendor.id})`);

    // 2. Submit a simulated order
    console.log('\n📝 Step 2: Creating a simulated order...');
    const orderId = 'test_' + crypto.randomBytes(3).toString('hex');
    const orderItems = [
      { name: 'Cơm rang dưa bò', price: 45000, quantity: 2 },
      { name: 'Trà chanh đá', price: 15000, quantity: 1 }
    ];
    const totalAmount = 105000;

    const createOrderQuery = `
      INSERT INTO orders (id, vendor_id, vendor_name, customer_name, customer_phone, delivery_address, items, total_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const orderRes = await client.query(createOrderQuery, [
      orderId,
      vendor.id,
      vendor.name,
      'Test User',
      '0987654321',
      'Ký túc xá Dom A',
      JSON.stringify(orderItems),
      totalAmount,
      'pending'
    ]);
    console.log(`   Order created successfully with ID: ${orderRes.rows[0].id}`);

    // 3. Retrieve orders for this vendor (seller view)
    console.log('\n📡 Step 3: Fetching orders for the vendor (Seller Portal simulation)...');
    const fetchOrdersRes = await client.query('SELECT * FROM orders WHERE vendor_id = $1;', [vendor.id]);
    console.log(`   Found ${fetchOrdersRes.rows.length} order(s) for vendor "${vendor.name}"`);
    const foundOrder = fetchOrdersRes.rows.find(o => o.id === orderId);
    if (!foundOrder) {
      throw new Error('Simulated order was not found in database lookup!');
    }
    console.log('   Simulated order found! Items match:', JSON.stringify(foundOrder.items));

    // 4. Update order status
    console.log('\n🍳 Step 4: Updating order status to "preparing"...');
    const updateStatusRes = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *;',
      ['preparing', orderId]
    );
    console.log(`   Order status successfully updated to: "${updateStatusRes.rows[0].status}"`);

    // 5. Update vendor menu (admin view)
    console.log('\n🗂️ Step 5: Updating vendor menu (Admin Menu editor simulation)...');
    const currentMenu = Array.isArray(vendor.menu) ? vendor.menu : [];
    const testMenuItem = { name: 'Món Thử Nghiệm Supabase', price: 99999 };
    const updatedMenu = [...currentMenu, testMenuItem];

    const updateMenuRes = await client.query(
      'UPDATE vendors SET menu = $1 WHERE id = $2 RETURNING *;',
      [JSON.stringify(updatedMenu), vendor.id]
    );
    console.log(`   Vendor menu updated! Total items now: ${updateMenuRes.rows[0].menu.length}`);
    
    // Check if new item is in menu
    const verifyItem = updateMenuRes.rows[0].menu.find(item => item.name === 'Món Thử Nghiệm Supabase');
    if (!verifyItem || verifyItem.price !== 99999) {
      throw new Error('Simulated menu update verification failed!');
    }
    console.log('   Menu update verified successfully!');

    // Clean up test item from menu
    console.log('\n🧹 Step 6: Cleaning up test menu item...');
    const cleanedMenu = updateMenuRes.rows[0].menu.filter(item => item.name !== 'Món Thử Nghiệm Supabase');
    await client.query('UPDATE vendors SET menu = $1 WHERE id = $2;', [JSON.stringify(cleanedMenu), vendor.id]);
    console.log('   Menu cleaned up successfully.');

    // Clean up test order
    console.log('🧹 Step 7: Cleaning up test order...');
    await client.query('DELETE FROM orders WHERE id = $1;', [orderId]);
    console.log('   Order cleaned up successfully.');

    console.log('\n🎉 ALL SUPABASE INTEGRATION TESTS PASSED SUCCESSFULLY! 🌟');
  } catch (err) {
    console.error('\n❌ Test verification failed:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
};

runVerification();
