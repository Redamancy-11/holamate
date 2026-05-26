const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vendor = require('../models/Vendor');

// Load environment config
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hanomate';

// Robust CSV parser function
const parseCSV = (content) => {
  const lines = [];
  let currentLine = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentLine.push(currentField.trim());
      if (currentLine.length > 1 || currentLine[0] !== '') {
        lines.push(currentLine);
      }
      currentLine = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }
  return lines;
};

// Shorthand menu parser (e.g. "Phin Sữa Đá:29000; Trà Sen Vàng:45k")
const parseMenu = (menuStr) => {
  if (!menuStr) return [];
  return menuStr.split(';').map(item => {
    const parts = item.split(':');
    if (parts.length < 2) return null;
    const name = parts[0].trim();
    
    // Parse price: support 'k' suffix and format cleaning
    let priceRaw = parts[1].toLowerCase().replace(/đ/g, '').trim();
    let priceNum = 0;
    if (priceRaw.endsWith('k')) {
      priceNum = parseFloat(priceRaw.slice(0, -1)) * 1000;
    } else {
      priceNum = parseInt(priceRaw.replace(/\D/g, ''), 10) || 0;
    }
    return { name, price: priceNum };
  }).filter(Boolean);
};

// Review list parser (e.g. "Review 1 | Review 2")
const parseReviews = (reviewsStr) => {
  if (!reviewsStr) return [];
  return reviewsStr.split('|').map(r => r.trim()).filter(Boolean);
};

const run = async () => {
  const csvPath = path.resolve(__dirname, 'vendors_template.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File template không tồn tại: ${csvPath}`);
    process.exit(1);
  }

  // 1. Đọc và phân tách CSV trước
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);

  if (rows.length < 2) {
    console.log('⚠️ File CSV trống hoặc chỉ chứa tiêu đề.');
    return;
  }

  const headers = rows[0];
  const dataRows = rows.slice(1);

  const docs = [];
  for (const row of dataRows) {
    const item = {};
    headers.forEach((h, idx) => {
      item[h] = row[idx];
    });

    const lat = parseFloat(item.latitude);
    const lng = parseFloat(item.longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`⚠️ Bỏ qua quán ${item.name} vì tọa độ không hợp lệ (lat: ${item.latitude}, lng: ${item.longitude})`);
      continue;
    }

    // Check bounds
    if (lat < 20.95 || lat > 21.05 || lng < 105.45 || lng > 105.60) {
      console.warn(`⚠️ Lưu ý: Quán ${item.name} (${lat}, ${lng}) nằm ngoài vùng KCN Hòa Lạc.`);
    }

    const doc = {
      name: item.name,
      category: item.category || 'food',
      address: item.address || '',
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      rating: parseFloat(item.rating) || 0,
      priceRange: {
        min: parseInt(item.priceMin, 10) || 0,
        max: parseInt(item.priceMax, 10) || 0,
      },
      menu: parseMenu(item.menu),
      tips: item.tips || '',
      reviews: parseReviews(item.reviews),
    };

    docs.push(doc);
  }

  // 2. Lưu bản sao dữ liệu cục bộ dạng JSON (chạy offline)
  const localDocs = docs.map(d => ({
    name: d.name,
    category: d.category,
    address: d.address,
    price: { min: d.priceRange.min, max: d.priceRange.max, unit: 'đ' },
    rating: d.rating,
    coords: d.location.coordinates,
    menu: d.menu,
    tips: d.tips,
    reviews: d.reviews
  }));
  
  const localJsonDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(localJsonDir)) {
    fs.mkdirSync(localJsonDir, { recursive: true });
  }
  const localJsonPath = path.resolve(localJsonDir, 'local_vendors_override.json');
  fs.writeFileSync(localJsonPath, JSON.stringify(localDocs, null, 2), 'utf8');
  console.log(`✅ Đã đồng bộ ${localDocs.length} quán vào file dữ liệu cục bộ: ${localJsonPath}`);

  // 3. Tiến hành đồng bộ sang MongoDB nếu online
  console.log(`🔌 Kết nối MongoDB: ${uri}`);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log(`💾 Đang đồng bộ vào MongoDB...`);
    const ops = docs.map((doc) => ({
      updateOne: {
        filter: { name: { $regex: `^${doc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
        update: { $set: doc },
        upsert: true,
      },
    }));

    const result = await Vendor.bulkWrite(ops, { ordered: false });
    console.log(`✅ Thành công! MongoDB đã thêm mới/Cập nhật: ${result.upsertedCount + result.modifiedCount} quán.`);
    await mongoose.disconnect();
    console.log('🔒 Đã ngắt kết nối database');
  } catch (error) {
    console.warn(`⚠️ Cảnh báo: Không thể kết nối MongoDB (${error.message}). Dữ liệu vẫn được sử dụng offline qua file JSON cục bộ!`);
  }
};

if (require.main === module) {
  run().catch(console.error);
}

module.exports = { parseCSV, parseMenu, parseReviews };
