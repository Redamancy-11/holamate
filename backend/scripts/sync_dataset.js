require('dotenv').config();
const { pool } = require('../config/pg');
const fs = require('fs');
const path = require('path');

const normalizeName = (name) => {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/g, '');
};

const run = async () => {
  if (!pool) {
    console.error('DATABASE_URL is not set. Cannot sync to Postgres.');
    process.exit(1);
  }

  const jsonPath = 'D:\\KI 8\\data quán ăn\\hoalac_restaurants_db.json';
  if (!fs.existsSync(jsonPath)) {
    console.error(`Source JSON file not found at ${jsonPath}`);
    process.exit(1);
  }

  console.log('Loading new dataset from JSON...');
  const jsonPlaces = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${jsonPlaces.length} total places from JSON.`);

  // Filter to F&B places only (since the database vendors table is for food & drink)
  const fnbPlaces = jsonPlaces.filter(p => p.is_fnb === true);
  console.log(`Filtered to ${fnbPlaces.length} F&B places.`);

  // 1. UPDATE LOCAL OVERRIDE FILE FOR FALLBACK USAGE
  console.log('\n--- 1. Updating local_vendors_override.json ---');
  const localOverrides = fnbPlaces.map(p => {
    // Calculate price range from menu if available
    let priceMin = 20000;
    let priceMax = 100000;
    if (p.menu && p.menu.length > 0) {
      const prices = p.menu.map(m => m.price).filter(price => typeof price === 'number' && price > 0);
      if (prices.length > 0) {
        priceMin = Math.min(...prices);
        priceMax = Math.max(...prices);
      }
    }

    const address = p.street ? `${p.street}, ${p.city || 'Hà Nội'}` : (p.city || 'Hòa Lạc, Thạch Thất, Hà Nội');

    return {
      id: p.placeId,
      name: p.title,
      category: p.categoryName || 'Quán ăn',
      address: address,
      price: {
        min: priceMin,
        max: priceMax,
        unit: 'đ'
      },
      rating: p.totalScore || 4.5,
      coords: p.longitude && p.latitude ? [p.longitude, p.latitude] : [],
      menu: (p.menu || []).map(m => ({
        name: m.name,
        price: m.price,
        description: m.description || ''
      })),
      tips: `Địa điểm ẩm thực Hòa Lạc. ${p.phone ? 'SĐT: ' + p.phone : ''}`,
      reviews: []
    };
  });

  const overrideFilePath = path.resolve(__dirname, '../data/local_vendors_override.json');
  fs.writeFileSync(overrideFilePath, JSON.stringify(localOverrides, null, 2), 'utf8');
  console.log(`Saved ${localOverrides.length} F&B vendors to ${overrideFilePath}.`);


  // 2. SYNC TO POSTGRES DATABASE
  console.log('\n--- 2. Syncing to Postgres ---');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch all existing DB vendors
    const dbRes = await client.query('SELECT * FROM vendors');
    const dbVendors = dbRes.rows;
    console.log(`Current DB vendors count: ${dbVendors.length}`);

    // Fetch all vendor_ids referenced in orders table
    const orderRefRes = await client.query('SELECT DISTINCT vendor_id FROM orders');
    const referencedVendorIds = new Set(orderRefRes.rows.map(r => r.vendor_id));
    console.log(`Referenced vendors in orders: ${referencedVendorIds.size}`);

    // Build lookup maps for database vendors
    const dbById = new Map();
    const dbByNormName = new Map();
    
    dbVendors.forEach(v => {
      dbById.set(v.id, v);
      // Map local vendors by normalized name for matching
      if (v.owner_id === null) {
        dbByNormName.set(normalizeName(v.name), v);
      }
    });

    let updatedCount = 0;
    let insertedCount = 0;
    const processedDbIds = new Set();

    for (const p of fnbPlaces) {
      // Find matching vendor in DB
      let matchedVendor = null;
      
      if (p.placeId && dbById.has(p.placeId)) {
        matchedVendor = dbById.get(p.placeId);
      } else {
        const norm = normalizeName(p.title);
        if (dbByNormName.has(norm)) {
          matchedVendor = dbByNormName.get(norm);
        }
      }

      // Prepare fields
      const name = p.title;
      const category = p.categoryName || 'Quán ăn';
      const address = p.street ? `${p.street}, ${p.city || 'Hà Nội'}` : (p.city || 'Hòa Lạc, Thạch Thất, Hà Nội');
      const district = p.state || 'Thạch Thất';
      const rating = p.totalScore || 4.5;
      const longitude = p.longitude || null;
      const latitude = p.latitude || null;
      const phone = p.phone || null;
      const note = p.website || null;

      // Calculate price ranges
      let priceMin = 20000;
      let priceMax = 100000;
      if (p.menu && p.menu.length > 0) {
        const prices = p.menu.map(m => m.price).filter(price => typeof price === 'number' && price > 0);
        if (prices.length > 0) {
          priceMin = Math.min(...prices);
          priceMax = Math.max(...prices);
        }
      }
      const priceRange = { min: priceMin, max: priceMax, unit: 'đ' };

      const menuJson = JSON.stringify((p.menu || []).map(m => ({
        name: m.name,
        price: m.price,
        description: m.description || ''
      })));

      const tagsJson = JSON.stringify(p.categories || []);
      const tips = `Địa điểm ẩm thực Hòa Lạc. Rating: ${rating}/5 (${p.reviewsCount || 0} đánh giá).`;

      if (matchedVendor) {
        // If matched, update the existing vendor to preserve its ID and owner_id (if any)
        const vId = matchedVendor.id;
        processedDbIds.add(vId);

        // If it's seller-owned, we should be cautious about overwriting their menu
        // We will update address, coordinates, category, phone if empty/null, but keep their menu and owner_id intact.
        if (matchedVendor.owner_id !== null) {
          console.log(`Skipping full menu overwrite for seller-owned vendor: "${name}" (ID: ${vId})`);
          // Just update coords/phone if they are empty
          await client.query(`
            UPDATE vendors
            SET longitude = COALESCE(longitude, $1),
                latitude = COALESCE(latitude, $2),
                phone = COALESCE(phone, $3),
                updated_at = now()
            WHERE id = $4
          `, [longitude, latitude, phone, vId]);
        } else {
          // Update full info for local vendors
          await client.query(`
            UPDATE vendors
            SET name = $1,
                category = $2,
                address = $3,
                district = $4,
                rating = $5,
                longitude = $6,
                latitude = $7,
                menu = $8,
                phone = $9,
                note = $10,
                price_min = $11,
                price_max = $12,
                price_unit = 'đ',
                price_range = $13,
                tags = $14,
                tips = $15,
                source = 'local',
                updated_at = now()
            WHERE id = $16
          `, [
            name, category, address, district, rating, 
            longitude, latitude, menuJson, phone, note,
            priceMin, priceMax, JSON.stringify(priceRange),
            tagsJson, tips, vId
          ]);
          updatedCount++;
        }
      } else {
        // If not matched, insert as new vendor using Google Maps placeId as ID
        const newId = p.placeId || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.query(`
          INSERT INTO vendors (
            id, name, category, address, district, rating, longitude, latitude, 
            menu, phone, note, price_min, price_max, price_unit, price_range, 
            tags, tips, source, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'đ', $14, $15, $16, 'local', 'active', now(), now())
        `, [
          newId, name, category, address, district, rating, longitude, latitude,
          menuJson, phone, note, priceMin, priceMax, JSON.stringify(priceRange),
          tagsJson, tips
        ]);
        insertedCount++;
      }
    }

    // Identify DB vendors to delete (those not in the new dataset, are local/scraped, and have NO orders)
    let deletedCount = 0;
    let keptUnmatchedCount = 0;

    for (const v of dbVendors) {
      const isSellerOwned = v.owner_id !== null;
      const isProcessed = processedDbIds.has(v.id);
      
      if (!isProcessed && !isSellerOwned) {
        // Check if it has orders
        if (referencedVendorIds.has(v.id)) {
          console.log(`Keeping unmatched local vendor "${v.name}" (ID: ${v.id}) because it has order history.`);
          keptUnmatchedCount++;
        } else {
          // Delete
          await client.query('DELETE FROM vendors WHERE id = $1', [v.id]);
          deletedCount++;
        }
      }
    }

    await client.query('COMMIT');

    console.log('\n--- Sync Statistics ---');
    console.log(`- Total F&B places processed: ${fnbPlaces.length}`);
    console.log(`- Updated existing local vendors: ${updatedCount}`);
    console.log(`- Inserted new local vendors: ${insertedCount}`);
    console.log(`- Deleted obsolete local vendors (no orders): ${deletedCount}`);
    console.log(`- Kept unmatched local vendors (with orders): ${keptUnmatchedCount}`);

    const finalCountRes = await client.query('SELECT COUNT(*) FROM vendors');
    console.log(`- Final vendors count in database: ${finalCountRes.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction failed, rolled back:', err);
  } finally {
    client.release();
    process.exit(0);
  }
};

run();
