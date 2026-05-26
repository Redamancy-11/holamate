/**
 * TikTok Data Loader
 * Loads mock/real TikTok entries from pipeline and provides normalized vendor data
 */

let tiktokEntriesCache = null;

const loadTikTokEntries = () => {
  if (tiktokEntriesCache) {
    return tiktokEntriesCache;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'tiktok_entries.json');
    
    if (fs.existsSync(filePath)) {
      const rawData = fs.readFileSync(filePath, 'utf-8');
      tiktokEntriesCache = JSON.parse(rawData);
      console.log(`✅ Loaded ${tiktokEntriesCache.length} TikTok entries from ${filePath}`);
      return tiktokEntriesCache;
    }
  } catch (error) {
    console.warn(`⚠️  Could not load TikTok entries: ${error.message}`);
  }

  return [];
};

/**
 * Extract unique vendors from TikTok entries
 * Returns normalized vendor objects suitable for AI context
 */
const extractVendorsFromTikTok = () => {
  const entries = loadTikTokEntries();
  const vendorMap = new Map();

  entries.forEach((entry) => {
    const vendorName = entry.vendor_name_normalized || entry.vendor_name || '';
    if (!vendorName) return;

    const key = vendorName.toLowerCase();
    if (!vendorMap.has(key)) {
      vendorMap.set(key, {
        name: entry.vendor_name || vendorName,
        category: entry.category || 'Food & Beverage',
        address: entry.address || 'Hà Nội',
        rating: entry.rating || 3.5,
        price: entry.price || 0,
        source: 'tiktok',
        mentions: 1,
        raw_text: entry.raw_text || '',
      });
    } else {
      const vendor = vendorMap.get(key);
      vendor.mentions += 1;
      // Update rating if new entry has higher rating
      if (entry.rating && entry.rating > vendor.rating) {
        vendor.rating = entry.rating;
      }
      // Keep price if not set
      if (!vendor.price && entry.price) {
        vendor.price = entry.price;
      }
    }
  });

  return Array.from(vendorMap.values())
    .sort((a, b) => b.mentions - a.mentions) // Sort by popularity
    .slice(0, 100); // Return top 100 vendors
};

/**
 * Get TikTok vendor context for AI RAG
 * Filters and formats vendors for AI prompt building
 */
const getTikTokContext = (searchQuery = '') => {
  const vendors = extractVendorsFromTikTok();

  if (!searchQuery.trim()) {
    return vendors.slice(0, 10).map((v) => `- ${v.name} (${v.category}): ${v.address}, Rating: ${v.rating}/5, Mentions: ${v.mentions}`).join('\n');
  }

  const query = searchQuery.toLowerCase();
  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(query) ||
      v.category.toLowerCase().includes(query) ||
      v.address.toLowerCase().includes(query)
  );

  return filtered
    .slice(0, 8)
    .map((v) => `- ${v.name} (${v.category}): ${v.address}, Rating: ${v.rating}/5`)
    .join('\n');
};

module.exports = {
  loadTikTokEntries,
  extractVendorsFromTikTok,
  getTikTokContext,
};
