const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// Scoped bounding box for Hoa Lac area (left, top, right, bottom)
const HOA_LAC_BOX = '105.45,21.05,105.58,20.95';

// Mock menus for different restaurant categories
const MOCK_MENUS = {
  cafe: 'Cà Phê Đen:15k; Cà Phê Sữa Đá:20k; Trà Đào Sả:25k; Sinh Tố Bơ:30k',
  restaurant: 'Phở Bò Gia Truyền:35k; Bún Chả:30k; Cơm Rang Dưa Bò:40k; Nước Chanh:10k',
  fast_food: 'Gà Rán Giòn:35k; Khoai Tây Chiên:20k; Hamburger Bò:45k; Pepsi Lon:15k',
  default: 'Cơm Bình Dân:30k; Bún Cá:35k; Bún Bò Huế:40k; Trà Đá:3k'
};

const MOCK_REVIEWS = {
  cafe: 'Đồ uống rẻ và pha ngon | View ngoài sân mát mẻ học bài tốt | Phục vụ hơi chậm lúc đông',
  restaurant: 'Đồ ăn nóng hổi nêm nếm đậm đà | Sạch sẽ vệ sinh giá sinh viên | Không gian hơi chật',
  fast_food: 'Gà rán giòn rụm nhiều nước sốt | Ship nhanh đóng gói kỹ càng | Hơi béo ngậy',
  default: 'Ăn no nê giá cả phải chăng | Thích hợp ăn trưa nhanh gọn | Chủ quán vui vẻ xởi lởi'
};

const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'HolaMateMapCrawler/1.0 (ducnguyenha0810@gmail.com)'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
};

const getCategoryType = (osmType) => {
  const type = osmType?.toLowerCase() || '';
  if (type.includes('cafe') || type.includes('coffee') || type.includes('tea')) return 'cafe';
  if (type.includes('restaurant') || type.includes('food') || type.includes('bbq')) return 'restaurant';
  if (type.includes('fast_food') || type.includes('burger')) return 'fast_food';
  return 'default';
};

const run = async () => {
  console.log('🔍 Bắt đầu quét địa điểm ăn uống tại Hoà Lạc...');
  const csvPath = path.resolve(__dirname, 'vendors_template.csv');

  // Load existing names to avoid duplicates
  let existingNames = new Set();
  if (fs.existsSync(csvPath)) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    lines.slice(1).forEach(line => {
      const firstComma = line.indexOf(',');
      if (firstComma > 0) {
        existingNames.add(line.slice(0, firstComma).trim().toLowerCase());
      }
    });
  }

  // 1. Check if Google Maps API key is configured (Future expansion path)
  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
  let crawledPlaces = [];

  if (googleApiKey && googleApiKey !== 'YOUR_GOOGLE_KEY') {
    console.log('📡 Phát hiện GOOGLE_MAPS_API_KEY. Tiến hành truy vấn qua Google Places API...');
    try {
      // Query Google Places API scoped to Hoa Lac Center
      const center = '21.0135,105.5252'; // FPT campus coordinates
      const radius = '3500'; // 3.5km radius
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center}&radius=${radius}&type=restaurant&key=${googleApiKey}`;
      
      const response = await makeRequest(url);
      if (response.results) {
        crawledPlaces = response.results.map(place => ({
          name: place.name,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          address: place.vicinity || 'Hoà Lạc, Thạch Thất, Hà Nội',
          rating: place.rating || 4.2,
          type: place.types && place.types.includes('cafe') ? 'cafe' : 'restaurant'
        }));
      }
    } catch (err) {
      console.warn('⚠️ Google Places API bị lỗi, chuyển sang OpenStreetMap...', err.message);
    }
  }

  // 2. OpenStreetMap (OSM) Nominatim API (Free fallback)
  if (crawledPlaces.length === 0) {
    console.log('📡 Đang truy vấn qua OpenStreetMap Nominatim API...');
    const queries = ['restaurant', 'cafe', 'fast_food'];
    
    for (const q of queries) {
      try {
        console.log(`- Tìm kiếm từ khóa: "${q}"...`);
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&bounded=1&viewbox=${HOA_LAC_BOX}&limit=15`;
        const results = await makeRequest(url);
        
        if (Array.isArray(results)) {
          results.forEach(place => {
            crawledPlaces.push({
              name: place.display_name.split(',')[0].trim(),
              lat: parseFloat(place.lat),
              lng: parseFloat(place.lon),
              address: place.display_name.replace(/"/g, '""'),
              rating: (4.0 + Math.random() * 0.9).toFixed(1), // Random rating for mock
              type: q
            });
          });
        }
        // Small delay to respect OSM rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`❌ Lỗi khi tìm kiếm từ khóa "${q}":`, err.message);
      }
    }
  }

  // 3. Filter duplicates and format entries
  let count = 0;
  let appendStream = '';

  crawledPlaces.forEach(p => {
    const cleanName = p.name.trim();
    if (existingNames.has(cleanName.toLowerCase())) {
      return; // Skip duplicate
    }
    
    const catType = getCategoryType(p.type);
    const menu = MOCK_MENUS[catType] || MOCK_MENUS.default;
    const review = MOCK_REVIEWS[catType] || MOCK_REVIEWS.default;
    const categoryName = (catType === 'cafe') ? 'Cafe' : 'Ăn uống';
    
    // Append in CSV line format: name,category,latitude,longitude,address,priceMin,priceMax,rating,menu,tips,reviews
    const line = `"${cleanName.replace(/"/g, '""')}",${categoryName},${p.lat},${p.lng},"${p.address}",15000,120000,${p.rating},"${menu}","AI gợi ý món ăn ngon từ dữ liệu maps.","${review}"\n`;
    appendStream += line;
    existingNames.add(cleanName.toLowerCase());
    count++;
  });

  if (count > 0) {
    fs.appendFileSync(csvPath, appendStream, 'utf8');
    console.log(`💾 Đã bổ sung thành công ${count} quán mới vào file spreadsheet template!`);
    
    // Trigger seed importer
    console.log('🔄 Bắt đầu chạy import_csv.js để nạp dữ liệu mới vào MongoDB...');
    try {
      execSync('node "' + path.resolve(__dirname, 'import_csv.js') + '"', { stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Chạy seed importer gặp lỗi:', err.message);
    }
  } else {
    console.log('ℹ️ Không có địa điểm mới nào được tìm thấy hoặc tất cả đã trùng với file template cũ.');
  }
};

run().catch(console.error);
