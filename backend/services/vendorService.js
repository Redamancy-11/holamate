const fs = require('fs');
const path = require('path');
const { HANOI_VENDORS } = require('../data/hanoiKnowledge');
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const { pool, getIsPgConnected } = require('../config/pg');

const getLocalVendorsList = () => {
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

const normalizeVendor = (vendor) => {
  const priceRange = vendor.priceRange || vendor.price || (vendor.price && typeof vendor.price === 'object' ? {
    min: vendor.price.min,
    max: vendor.price.max,
    unit: vendor.price.unit,
  } : undefined);

  let riskBadge = vendor.riskBadge;
  if (!riskBadge) {
    if (priceRange?.min && priceRange.min >= 150000) riskBadge = 'high';
    else if (vendor.rating >= 4.7) riskBadge = 'low';
    else if (vendor.rating >= 4.4) riskBadge = 'medium';
    else riskBadge = 'medium';
  }

  return {
    id: vendor.id || vendor._id?.toString(),
    name: vendor.name,
    category: vendor.category,
    address: vendor.address || '',
    district: vendor.district || vendor.region || '',
    priceRange,
    hours: vendor.hours || '',
    rating: vendor.rating || 0,
    coords: vendor.coords || vendor.location?.coordinates || [],
    tags: vendor.tags || [],
    tips: vendor.tips || '',
    riskBadge,
    menu: vendor.menu || [],
    reviews: vendor.reviews || [],
    source: vendor._id ? 'db' : 'local',
    phone: vendor.phone || '',
    note: vendor.note || '',
    owner_id: vendor.owner_id || vendor.ownerId || null,
  };
};

const buildRegex = (query) => {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
};

const searchLocalVendors = (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  const localList = getLocalVendorsList();
  if (!normalizedQuery) {
    return localList.map(normalizeVendor).sort((a, b) => b.rating - a.rating);
  }

  const regex = buildRegex(normalizedQuery);
  return localList.filter((v) =>
    regex.test(v.name) ||
    regex.test(v.category) ||
    regex.test(v.address) ||
    (v.tags || []).some((tag) => regex.test(tag)) ||
    regex.test(v.tips || '')
  ).map(normalizeVendor);
};

const searchDbVendors = async (query) => {
  const normalizedQuery = query.trim();
  const isMongoConnected = mongoose.connection.readyState === 1;

  if (!normalizedQuery) {
    // Try Postgres first if available
    if (pool && getIsPgConnected()) {
      const res = await pool.query('SELECT * FROM vendors ORDER BY rating DESC LIMIT 1000');
      return res.rows.map((r) => normalizeVendor({
        _id: r.id,
        name: r.name,
        category: r.category,
        address: r.address,
        district: r.district,
        priceRange: r.price_range ? { min: r.price_min, max: r.price_max, unit: r.price_unit } : undefined,
        hours: r.hours,
        rating: r.rating,
        coords: r.longitude && r.latitude ? [r.longitude, r.latitude] : [],
        tags: r.tags,
        tips: r.tips,
        menu: r.menu,
        phone: r.phone,
        note: r.note,
        owner_id: r.owner_id,
      }));
    }
    if (isMongoConnected) {
      const documents = await Vendor.find().limit(1000).lean();
      return documents.map(normalizeVendor);
    }
    return [];
  }

  const regex = buildRegex(normalizedQuery);
  // Try Postgres full-text-ish search using ILIKE
  if (pool && getIsPgConnected()) {
    const q = `%${normalizedQuery.replace(/%/g, '\\%')}%`;
    const res = await pool.query(
      `SELECT * FROM vendors 
       WHERE name ILIKE $1 
          OR category ILIKE $1 
          OR address ILIKE $1 
          OR (menu IS NOT NULL AND JSONB_TYPEOF(menu) = 'array' AND EXISTS (
               SELECT 1 FROM jsonb_to_recordset(menu) AS x(name text) WHERE x.name ILIKE $1
             ))
       LIMIT 50`,
      [q]
    );
    if (res.rows.length) {
      return res.rows.map((r) => normalizeVendor({
        _id: r.id,
        name: r.name,
        category: r.category,
        address: r.address,
        district: r.district,
        priceRange: r.price_range ? { min: r.price_min, max: r.price_max, unit: r.price_unit } : undefined,
        hours: r.hours,
        rating: r.rating,
        coords: r.longitude && r.latitude ? [r.longitude, r.latitude] : [],
        tags: r.tags,
        tips: r.tips,
        menu: r.menu,
        phone: r.phone,
        note: r.note,
        owner_id: r.owner_id,
      }));
    }
  }

  if (isMongoConnected) {
    const documents = await Vendor.find({
      $or: [
        { name: { $regex: regex } },
        { category: { $regex: regex } },
        { address: { $regex: regex } },
        { 'menu.name': { $regex: regex } }
      ],
    }).limit(20).lean();

    return documents.map(normalizeVendor);
  }
  return [];
};

const getAllVendors = async (search = '') => {
  if (!search.trim()) {
    try {
      const vendors = await searchDbVendors('');
      if (vendors.length) return vendors;
    } catch (error) {
      // fallback to local dataset
    }
    return searchLocalVendors('');
  }

  try {
    const dbResults = await searchDbVendors(search);
    if (dbResults.length) return dbResults;
  } catch (error) {
    // fallback
  }

  const localResults = searchLocalVendors(search);
  return localResults.length ? localResults : searchLocalVendors('');
};

const getVendorById = async (id) => {
  try {
    if (pool && getIsPgConnected()) {
      const res = await pool.query('SELECT * FROM vendors WHERE id = $1 LIMIT 1', [id]);
      if (res.rows.length) {
        const r = res.rows[0];
        return normalizeVendor({
          _id: r.id,
          name: r.name,
          category: r.category,
          address: r.address,
          district: r.district,
          priceRange: r.price_range ? { min: r.price_min, max: r.price_max, unit: r.price_unit } : undefined,
          hours: r.hours,
          rating: r.rating,
          coords: r.longitude && r.latitude ? [r.longitude, r.latitude] : [],
          tags: r.tags,
          tips: r.tips,
          menu: r.menu,
          phone: r.phone,
          note: r.note,
          owner_id: r.owner_id,
        });
      }
    }
    const vendor = await Vendor.findById(id).lean();
    if (vendor) return normalizeVendor(vendor);
  } catch (_) {
    // ignore
  }

  const localList = getLocalVendorsList();
  const localVendor = localList.find((v) => v.id === id || v.name.toLowerCase() === id.toLowerCase() || (v._id && v._id.toString() === id));
  return localVendor ? normalizeVendor(localVendor) : null;
};

module.exports = {
  getAllVendors,
  getVendorById,
  searchLocalVendors,
  searchDbVendors,
};
