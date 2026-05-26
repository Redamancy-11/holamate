const fs = require('fs');
const path = require('path');
const { pool } = require('../config/pg');
const { HANOI_VENDORS } = require('../data/hanoiKnowledge');
const crypto = require('crypto');

if (!pool) {
  console.error('DATABASE_URL not configured. Set DATABASE_URL in your environment before running this script.');
  process.exit(1);
}

const getMergedVendorsList = () => {
  let vendors = [...HANOI_VENDORS];
  const overridePath = path.resolve(__dirname, '../data/local_vendors_override.json');
  if (fs.existsSync(overridePath)) {
    try {
      const extra = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
      if (Array.isArray(extra)) {
        extra.forEach(item => {
          const idx = vendors.findIndex(v => v.name.toLowerCase() === item.name.toLowerCase());
          if (idx >= 0) {
            vendors[idx] = { ...vendors[idx], ...item };
          } else {
            vendors.push({
              id: item.id || item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              ...item
            });
          }
        });
      }
    } catch (e) {
      console.warn('Lỗi khi đọc file local_vendors_override.json:', e.message);
    }
  }
  return vendors;
};

const transform = (v) => {
  const id = v.id ? String(v.id) : (v._id ? String(v._id) : crypto.randomUUID());
  const longitude = Array.isArray(v.coords) && v.coords.length === 2 ? v.coords[0] : (v.location?.coordinates?.[0] || null);
  const latitude = Array.isArray(v.coords) && v.coords.length === 2 ? v.coords[1] : (v.location?.coordinates?.[1] || null);
  const priceMin = v.priceRange?.min || (v.price && typeof v.price === 'object' ? v.price.min : null);
  const priceMax = v.priceRange?.max || (v.price && typeof v.price === 'object' ? v.price.max : null);
  const priceUnit = v.priceRange?.unit || (v.price && typeof v.price === 'object' ? v.price.unit : null);

  // Menu items array containing objects: { name, price }
  const menuData = Array.isArray(v.menu) ? v.menu : [];

  return {
    id,
    name: v.name,
    category: v.category || null,
    address: v.address || null,
    district: v.district || v.region || null,
    price_min: priceMin,
    price_max: priceMax,
    price_unit: priceUnit,
    price_range: JSON.stringify(v.priceRange || v.price || null),
    hours: v.hours || null,
    rating: v.rating || null,
    longitude,
    latitude,
    tags: JSON.stringify(v.tags || []),
    tips: v.tips || null,
    menu: JSON.stringify(menuData),
    source: 'local',
  };
};

const upsertVendor = async (client, v) => {
  const query = `INSERT INTO vendors (id,name,category,address,district,price_min,price_max,price_unit,price_range,hours,rating,longitude,latitude,tags,tips,menu,source,created_at,updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now(),now())
    ON CONFLICT (id) DO UPDATE SET
      name=EXCLUDED.name, category=EXCLUDED.category, address=EXCLUDED.address, district=EXCLUDED.district,
      price_min=EXCLUDED.price_min, price_max=EXCLUDED.price_max, price_unit=EXCLUDED.price_unit, price_range=EXCLUDED.price_range,
      hours=EXCLUDED.hours, rating=EXCLUDED.rating, longitude=EXCLUDED.longitude, latitude=EXCLUDED.latitude, 
      tags=EXCLUDED.tags, tips=EXCLUDED.tips, menu=EXCLUDED.menu, source=EXCLUDED.source, updated_at=now();`;
  const params = [v.id, v.name, v.category, v.address, v.district, v.price_min, v.price_max, v.price_unit, v.price_range, v.hours, v.rating, v.longitude, v.latitude, v.tags, v.tips, v.menu, v.source];
  await client.query(query, params);
};

const run = async () => {
  const client = await pool.connect();
  try {
    console.log('Cleaning up any non-Hòa Lạc vendors from Postgres (keeping seller-owned)...');
    const deleteRes = await client.query(`
      DELETE FROM vendors 
      WHERE owner_id IS NULL AND (
        latitude < 20.97 
        OR latitude > 21.08 
        OR longitude < 105.47 
        OR longitude > 105.59
        OR latitude IS NULL
        OR longitude IS NULL
      )
    `);
    console.log(`Removed ${deleteRes.rowCount} non-Hòa Lạc vendors from database.`);

    const list = getMergedVendorsList().filter(v => {
      const longitude = Array.isArray(v.coords) && v.coords.length === 2 ? v.coords[0] : (v.location?.coordinates?.[0] || null);
      const latitude = Array.isArray(v.coords) && v.coords.length === 2 ? v.coords[1] : (v.location?.coordinates?.[1] || null);
      if (!latitude || !longitude) return false;
      return latitude >= 20.97 && latitude <= 21.08 && longitude >= 105.47 && longitude <= 105.59;
    });

    console.log(`Seeding ${list.length} local Hòa Lạc vendors into Postgres...`);
    for (const vendor of list) {
      const v = transform(vendor);
      await upsertVendor(client, v);
    }
    console.log('Seeding completed successfully.');
  } catch (err) {
    console.error('Seeding error:', err.message);
  } finally {
    client.release();
    process.exit(0);
  }
};

run();

