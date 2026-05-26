const fs = require('fs');
const path = require('path');
const { pool } = require('../config/pg');

const importData = async () => {
  const jsonPath = path.resolve(__dirname, '../../tools/data_pipeline/scraped_vendors.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Scraped JSON file not found at: ${jsonPath}`);
    process.exit(1);
  }

  let scrapedVendors = [];
  try {
    scrapedVendors = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error parsing scraped JSON file: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(scrapedVendors)) {
    console.error('❌ Scraped data is not an array.');
    process.exit(1);
  }

  // === STEP 1: Sync to local_vendors_override.json (Always works locally) ===
  console.log('📦 Syncing scraped vendors to local_vendors_override.json...');
  const overridePath = path.resolve(__dirname, '../data/local_vendors_override.json');
  let overrideList = [];
  if (fs.existsSync(overridePath)) {
    try {
      overrideList = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
    } catch (err) {
      console.warn(`⚠️ Warning: could not parse local_vendors_override.json: ${err.message}`);
    }
  }

  for (const v of scrapedVendors) {
    const idx = overrideList.findIndex(
      item => (item.id && item.id === v.id) || (item.name && item.name.toLowerCase() === v.name.toLowerCase())
    );

    const coords = [v.longitude || 105.525, v.latitude || 21.013];
    
    const overrideItem = {
      id: v.id,
      name: v.name,
      category: v.category || 'Quán ăn',
      address: v.address || '',
      rating: v.rating || 4.5,
      coords: coords,
      phone: v.phone || null,
      tags: v.tags || [],
      tips: v.tips || '',
      menu: v.menu || []
    };

    if (idx >= 0) {
      overrideList[idx] = { ...overrideList[idx], ...overrideItem };
    } else {
      overrideList.push(overrideItem);
    }
  }

  try {
    fs.writeFileSync(overridePath, JSON.stringify(overrideList, null, 2), 'utf8');
    console.log(`✅ Synced ${scrapedVendors.length} scraped vendors to local_vendors_override.json!`);
  } catch (err) {
    console.error(`❌ Failed to write local override file: ${err.message}`);
  }

  // === STEP 2: Try importing to Supabase (Can fail if database connection is blocked) ===
  if (!pool) {
    console.warn('⚠️ DATABASE_URL not configured. Skipping Supabase import.');
    process.exit(0);
  }

  console.log(`📡 Connecting to Supabase to import ${scrapedVendors.length} vendors...`);
  let client = null;
  try {
    // Set a client connection timeout of 5 seconds
    const connectPromise = pool.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timed out (5s)')), 5000)
    );
    
    client = await Promise.race([connectPromise, timeoutPromise]);
    
    const query = `
      INSERT INTO vendors (
        id, name, category, address, district, 
        price_min, price_max, price_unit, price_range, 
        hours, rating, longitude, latitude, tags, tips, menu, source, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now(), now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        address = EXCLUDED.address,
        district = EXCLUDED.district,
        price_min = EXCLUDED.price_min,
        price_max = EXCLUDED.price_max,
        price_unit = EXCLUDED.price_unit,
        price_range = EXCLUDED.price_range,
        hours = EXCLUDED.hours,
        rating = EXCLUDED.rating,
        longitude = EXCLUDED.longitude,
        latitude = EXCLUDED.latitude,
        tags = EXCLUDED.tags,
        tips = EXCLUDED.tips,
        menu = EXCLUDED.menu,
        source = EXCLUDED.source,
        updated_at = now();
    `;

    for (const v of scrapedVendors) {
      const prices = Array.isArray(v.menu) ? v.menu.map(m => m.price).filter(p => typeof p === 'number' && p > 0) : [];
      const priceMin = prices.length > 0 ? Math.min(...prices) : null;
      const priceMax = prices.length > 0 ? Math.max(...prices) : null;
      const priceRange = { min: priceMin, max: priceMax, unit: 'VND' };

      const params = [
        v.id,
        v.name,
        v.category || 'Quán ăn',
        v.address || 'Khu CNC Hòa Lạc, Thạch Thất, Hà Nội',
        v.district || 'Thạch Thất',
        priceMin,
        priceMax,
        'VND',
        JSON.stringify(priceRange),
        v.hours || '08:00 - 22:00',
        v.rating || 4.5,
        v.longitude || 105.525,
        v.latitude || 21.013,
        JSON.stringify(v.tags || []),
        v.tips || 'Quán ăn khu vực Hoà Lạc.',
        JSON.stringify(v.menu || []),
        'scraped'
      ];

      await client.query(query, params);
    }
    console.log('🎉 Supabase import complete successfully!');
  } catch (err) {
    console.warn(`⚠️ Warning: Supabase import failed (e.g. network/port block): ${err.message}`);
    console.log('ℹ️ Scraped data is still saved locally and will be used as a fallback.');
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
};

importData();
