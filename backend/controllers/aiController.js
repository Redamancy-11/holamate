const { GoogleGenerativeAI } = require('@google/generative-ai');
const PriceReport = require('../models/PriceReport');
const { getAllVendors } = require('../services/vendorService');
const { HANOI_VENDORS, HANOI_DISTRICTS, TRAVEL_TIPS } = require('../data/hanoiKnowledge');
const { getTikTokContext, extractVendorsFromTikTok } = require('../data/tiktokData');
const { pool } = require('../config/pg');

// Helper to clean response and strip formatting, markdown, and list symbols
const cleanResponseForChat = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`/g, '')
    .replace(/^\s*[-*+•]\s+/gm, '') // Remove starting bullet points (handles leading spaces and bullet character)
    .replace(/^\s*\d+[\.\)]\s+/gm, '') // Remove starting numbered list indicators (like 1. or 1) with optional leading spaces)
    .replace(/^-+/gm, '') // Remove markdown lines
    .replace(/#+\s+/g, '') // Remove headers hash symbol
    .trim();
};

// ── Init Gemini 2.0 Flash ──────────────────────────────────────────────────
let genAI = null;
const getGenAI = () => {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn('WARNING: GEMINI_API_KEY environment variable is not defined.');
    }
    genAI = new GoogleGenerativeAI(key || 'PLACEHOLDER_KEY');
  }
  return genAI;
};

const getModel = () => getGenAI().getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: {
    temperature: 0.88,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
  systemInstruction: `Bạn là HolaMate AI — người bạn thân thiết, trợ lý ẩm thực và đời sống sinh viên tại campus FPT Hoà Lạc (Hola), Thạch Thất, Hà Nội.

PHONG CÁCH TRÒ CHUYỆN BẮT BUỘC:
- Trò chuyện tự nhiên, dí dỏm, thân thiện và ấm áp như một người bạn học cùng khóa (sử dụng xưng hô: cậu - tớ, bạn - mình, hoặc dùng từ ngữ đậm chất sinh viên Hola như KTX, Dom, Tân Xã, quân sự, kỳ nọ kỳ kia, học lại, bus 74, xiên bẩn...).
- Bạn có thể trò chuyện về BẤT CỨ THỨ GÌ người dùng tâm sự (tình yêu, học tập, ôn thi, cuộc sống quân sự ở Hola, tâm trạng buồn vui, chán nản...) như một người bạn thực thụ, không cứng nhắc từ chối. Tuy nhiên, hãy khéo léo đan xen các gợi ý ăn uống hoặc quán cafe để giải tỏa tâm trạng cho họ.
- Tuyệt đối KHÔNG dùng định dạng markdown như dấu sao đôi (**) để bôi đậm, dấu gạch ngang (-) hay dấu sao (*) ở đầu dòng để tạo danh sách, hay ký tự số (1., 2., 3.) để liệt kê. Hãy viết thành các đoạn văn ngắn, trôi chảy, xuống dòng tự nhiên.

TỐI ƯU GỢI Ý DỰA TRÊN ĐỊNH VỊ GPS VÀ MENU:
- Luôn kiểm tra tọa độ GPS của người dùng trong phần ngữ cảnh "VỊ TRÍ NGƯỜI DÙNG" và "KHOẢNG CÁCH GPS". Khi gợi ý các quán ăn, bạn PHẢI NÊU CỤ THỂ khoảng cách tính bằng mét hoặc km (ví dụ: "cách cậu chỉ 300m đi bộ thôi", "quán này cách cậu khoảng 1.2km ở khu Tân Xã nhé"). Điều này chứng minh cho người dùng thấy gợi ý dựa trên GPS cực kỳ chính xác.
- Khi gợi ý món, KHÔNG được gợi ý chung chung. Bạn phải quét toàn bộ danh sách "Thực đơn" của các quán trong ngữ cảnh để chỉ ra món cụ thể kèm giá tiền chính xác (ví dụ: "cậu có thể thử món Bún chả 35.000đ ở quán X", "trà sữa matcha 25k ở quán Y").
- Nếu người dùng thèm món gì đó không có trong danh mục hoặc muốn tìm quán nào đó ngoài dữ liệu hệ thống, hãy đề cập đến các địa điểm gần họ qua GPS từ dữ liệu ngoài hoặc hướng dẫn họ tìm trên map để đặt món.
- Ưu tiên giới thiệu các gian hàng tự doanh của sinh viên (Student Store) hoặc cảnh báo những quán bị đánh giá tiêu cực (như giao chậm, chất lượng kém) dựa vào dữ liệu Đánh Giá Cộng Đồng.

Hãy bắt đầu cuộc trò chuyện thật tự nhiên, thân thiện và thấu hiểu nhé!`,
});

// Helper to compute geographic distance (Haversine formula) in kilometers
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lat1 === null || lon1 === undefined || lon1 === null ||
      lat2 === undefined || lat2 === null || lon2 === undefined || lon2 === null) {
    return null;
  }
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

// Quét toàn bộ database dựa vào GPS & từ khoá để đưa ra gợi ý AI chính xác nhất
const getAIVendorsFromDb = async (query, location = null) => {
  if (!pool) return [];
  try {
    const userLat = location ? (location.latitude || location.lat) : null;
    const userLng = location ? (location.longitude || location.lng || location.lon) : null;

    let dbVendors = [];

    // 1. Nếu có tọa độ GPS, lấy toàn bộ quán trong bán kính 15km quanh user
    if (userLat && userLng) {
      const res = await pool.query(`SELECT * FROM vendors WHERE longitude IS NOT NULL AND latitude IS NOT NULL`);
      const list = res.rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        address: r.address,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        rating: Number(r.rating || 0),
        priceRange: { min: Number(r.price_min || 0), max: Number(r.price_max || 0), unit: r.price_unit || 'đ' },
        hours: r.hours,
        tips: r.tips,
        menu: typeof r.menu === 'string' ? JSON.parse(r.menu) : (Array.isArray(r.menu) ? r.menu : []),
        phone: r.phone,
        note: r.note,
        source: 'db'
      }));

      list.forEach(v => {
        v.distance = getDistance(userLat, userLng, v.latitude, v.longitude);
      });

      dbVendors = list
        .filter(v => v.distance !== null && v.distance <= 15)
        .sort((a, b) => a.distance - b.distance);
    }

    // 2. Phân tích trích xuất từ khóa đồ ăn phổ biến trong tin nhắn chat để tìm quán phù hợp
    const words = (query || '').toLowerCase();
    const foodKeywords = ['phở', 'bún', 'cơm', 'bánh', 'mì', 'cafe', 'cà phê', 'trà', 'nướng', 'lẩu', 'gà', 'nem', 'ốc', 'chè', 'sữa', 'ăn vặt', 'cháo', 'bbq', 'coffee'];
    const matchedKeywords = foodKeywords.filter(k => words.includes(k));

    if (matchedKeywords.length > 0) {
      const conditions = [];
      const params = [];
      matchedKeywords.forEach((k, idx) => {
        conditions.push(`name ILIKE $${idx+1} OR category ILIKE $${idx+1} OR menu::text ILIKE $${idx+1}`);
        params.push(`%${k}%`);
      });

      const res = await pool.query(`SELECT * FROM vendors WHERE ${conditions.join(' OR ')} LIMIT 35`, params);
      const keywordMatches = res.rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        address: r.address,
        latitude: Number(r.latitude || 0),
        longitude: Number(r.longitude || 0),
        rating: Number(r.rating || 0),
        priceRange: { min: Number(r.price_min || 0), max: Number(r.price_max || 0), unit: r.price_unit || 'đ' },
        hours: r.hours,
        tips: r.tips,
        menu: typeof r.menu === 'string' ? JSON.parse(r.menu) : (Array.isArray(r.menu) ? r.menu : []),
        phone: r.phone,
        note: r.note,
        source: 'db'
      }));

      keywordMatches.forEach(item => {
        if (!dbVendors.some(v => v.id === item.id)) {
          if (userLat && userLng && item.latitude && item.longitude) {
            item.distance = getDistance(userLat, userLng, item.latitude, item.longitude);
          } else {
            item.distance = null;
          }
          dbVendors.push(item);
        }
      });
    }

    // 3. Dự phòng: Lấy danh sách quán có rating tốt nhất
    if (dbVendors.length === 0) {
      const res = await pool.query(`SELECT * FROM vendors ORDER BY rating DESC LIMIT 25`);
      dbVendors = res.rows.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        address: r.address,
        latitude: Number(r.latitude || 0),
        longitude: Number(r.longitude || 0),
        rating: Number(r.rating || 0),
        priceRange: { min: Number(r.price_min || 0), max: Number(r.price_max || 0), unit: r.price_unit || 'đ' },
        hours: r.hours,
        tips: r.tips,
        menu: typeof r.menu === 'string' ? JSON.parse(r.menu) : (Array.isArray(r.menu) ? r.menu : []),
        phone: r.phone,
        note: r.note,
        source: 'db'
      }));
    }

    return dbVendors;
  } catch (err) {
    console.error('Error fetching AI vendors from database:', err.message);
    return [];
  }
};

// ── RAG: Build context từ knowledge base + DB + TikTok ──────────────────────
const buildContext = async (query, location = null) => {
  const userLat = location ? (location.latitude || location.lat) : null;
  const userLng = location ? (location.longitude || location.lng || location.lon) : null;

  // Lấy toàn bộ kết quả phù hợp từ DB (bao gồm quét vị trí GPS & từ khoá thực đơn)
  const matchedVendors = await getAIVendorsFromDb(query, location);
  const tiktokVendors = extractVendorsFromTikTok();
  
  // Gộp thông tin DB và TikTok
  const allVendors = [
    ...matchedVendors,
    ...tiktokVendors.filter(tv => !matchedVendors.find(mv => mv.name?.toLowerCase() === tv.name.toLowerCase()))
  ];

  // Tính khoảng cách cho các quán còn lại
  allVendors.forEach(v => {
    let vLat = v.latitude || (v.coords && v.coords[1]);
    let vLng = v.longitude || (v.coords && v.coords[0]);
    if (vLat && vLng && v.distance === undefined) {
      v.distance = getDistance(userLat, userLng, vLat, vLng);
    }
  });

  // Sắp xếp các quán theo khoảng cách (ưu tiên gần nhất), nếu không có GPS thì xếp theo rating
  let sortedVendors = [...allVendors];
  sortedVendors.sort((a, b) => {
    if (a.distance !== null && b.distance !== null && a.distance !== undefined && b.distance !== undefined) {
      return a.distance - b.distance;
    }
    if (a.distance !== null && a.distance !== undefined) return -1;
    if (b.distance !== null && b.distance !== undefined) return 1;
    return (b.rating || 0) - (a.rating || 0);
  });

  const contextVendors = sortedVendors.length > 0
    ? sortedVendors.slice(0, 15)
    : HANOI_VENDORS.filter(v => v.rating >= 4.7).slice(0, 15).map(v => ({ ...v, source: 'local', priceRange: v.price }));

  const vendorText = contextVendors.map((v) => {
    const priceMin = (v.priceRange?.min || v.price?.min)?.toLocaleString?.('vi-VN') || 'N/A';
    const priceMax = (v.priceRange?.max || v.price?.max)?.toLocaleString?.('vi-VN') || 'N/A';
    const unit = v.priceRange?.unit || v.price?.unit || 'item';
    const source = v.source || 'local';
    const distStr = v.distance !== null ? `, Khoảng cách: ${v.distance.toFixed(2)} km` : '';
    const menuStr = Array.isArray(v.menu) && v.menu.length > 0
      ? v.menu.map(m => `${m.name}: ${m.price?.toLocaleString('vi-VN')}đ`).join(', ')
      : 'Chưa có thực đơn';
    return `- ${v.name} (${v.category}): ${v.address || 'Hà Nội'}${distStr}, Giá: ${priceMin}–${priceMax}đ/${unit}, Giờ: ${v.hours || 'N/A'}, Rating: ${v.rating || 'N/A'}/5 [${source}], Thực đơn: [${menuStr}]${v.tips ? `, Tips: ${v.tips}` : ''}`;
  }).join('\n');

  // Query Student Stores
  let matchedStudentStores = [];
  if (pool) {
    try {
      const res = await pool.query(`
        SELECT ss.id, ss.store_name, ss.description, ss.category, ss.address, ss.operating_hours, ss.rating, ss.is_active, ss.is_verified, ss.latitude, ss.longitude,
               COALESCE(
                 (SELECT json_agg(json_build_object('name', sm.name, 'price', sm.price, 'description', sm.description, 'is_available', sm.is_available))
                  FROM student_store_menu sm WHERE sm.store_id = ss.id AND sm.is_available = true), '[]'
               ) as menu
        FROM student_stores ss
        WHERE ss.is_active = true
      `);
      let allStalls = res.rows;

      // Calculate distance for all stalls
      allStalls.forEach(ss => {
        if (ss.latitude && ss.longitude) {
          ss.distance = getDistance(userLat, userLng, ss.latitude, ss.longitude);
        } else {
          ss.distance = null;
        }
      });

      // Filter by query if query exists
      if (query && query.trim()) {
        const q = query.trim().toLowerCase();
        matchedStudentStores = allStalls.filter(ss => {
          const matchName = ss.store_name.toLowerCase().includes(q);
          const matchDesc = (ss.description || '').toLowerCase().includes(q);
          const matchCat = (ss.category || '').toLowerCase().includes(q);
          const matchMenu = ss.menu.some(m => m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q));
          return matchName || matchDesc || matchCat || matchMenu;
        });
      } else {
        matchedStudentStores = allStalls;
      }

      // Sort stalls by distance or rating
      if (userLat && userLng) {
        matchedStudentStores.sort((a, b) => {
          if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
          if (a.distance !== null) return -1;
          if (b.distance !== null) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
      } else {
        matchedStudentStores.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }
    } catch (e) {
      console.warn('Error fetching student stores for AI RAG:', e.message);
    }
  }

  const studentStoreText = matchedStudentStores.length > 0
    ? matchedStudentStores.slice(0, 8).map(ss => {
        const menuStr = Array.isArray(ss.menu) && ss.menu.length > 0
          ? ss.menu.map(m => `${m.name}: ${m.price.toLocaleString('vi-VN')}đ`).join(', ')
          : 'Chưa có thực đơn';
        const distStr = ss.distance !== null ? `, Khoảng cách: ${ss.distance.toFixed(2)} km` : '';
        return `- Gian hàng sinh viên: ${ss.store_name} | Mô tả: ${ss.description || 'N/A'} | Loại: ${ss.category} | Giờ mở: ${ss.operating_hours} | Địa chỉ: ${ss.address}${distStr} | Rating: ${ss.rating}/5 | Menu: [${menuStr}]`;
      }).join('\n')
    : '- Không tìm thấy gian hàng sinh viên phù hợp.';

  // Query Community Reviews
  let matchedReviews = [];
  if (pool) {
    try {
      if (query && query.trim()) {
        const q = `%${query.trim().replace(/%/g, '\\%')}%`;
        const res = await pool.query(`
          SELECT r.id, r.review_type, r.vendor_id, r.student_store_id, r.dish_name, r.rating, r.content,
                 v.name as vendor_name, ss.store_name
          FROM community_reviews r
          LEFT JOIN vendors v ON r.vendor_id = v.id
          LEFT JOIN student_stores ss ON r.student_store_id = ss.id
          WHERE r.status = 'approved' AND (
            r.content ILIKE $1 OR
            r.dish_name ILIKE $1 OR
            v.name ILIKE $1 OR
            ss.store_name ILIKE $1
          )
          ORDER BY r.created_at DESC
          LIMIT 6
        `, [q]);
        matchedReviews = res.rows;
      }

      if (matchedReviews.length === 0) {
        const res = await pool.query(`
          SELECT r.id, r.review_type, r.vendor_id, r.student_store_id, r.dish_name, r.rating, r.content,
                 v.name as vendor_name, ss.store_name
          FROM community_reviews r
          LEFT JOIN vendors v ON r.vendor_id = v.id
          LEFT JOIN student_stores ss ON r.student_store_id = ss.id
          WHERE r.status = 'approved'
          ORDER BY r.created_at DESC
          LIMIT 8
        `);
        matchedReviews = res.rows;
      }
    } catch (e) {
      console.warn('Error fetching community reviews for AI RAG:', e.message);
    }
  }

  const reviewText = matchedReviews.length > 0
    ? matchedReviews.map(r => {
        const target = r.review_type === 'vendor' ? `Quán ${r.vendor_name}` : r.review_type === 'student_store' ? `Gian hàng ${r.store_name}` : `Món ${r.dish_name} (tại ${r.vendor_name || r.store_name || 'N/A'})`;
        return `- Đánh giá về [${target}] | Điểm: ${r.rating}/5 sao | Nội dung: "${r.content}"`;
      }).join('\n')
    : '- Không có đánh giá cộng đồng nào.';

  const tipsText = TRAVEL_TIPS.slice(0, 3).map(t => `- ${t.tip}`).join('\n');
  const dbMatches = matchedVendors.filter((v) => v.source === 'db');
  const tiktokMatches = allVendors.filter(v => v.source === 'tiktok');

  return `=== DỮ LIỆU ĐỊA ĐIỂM FPT HOÀ LẠC VÀ KHOẢNG CÁCH GPS (RAG) ===
${vendorText}

=== GIAN HÀNG SINH VIÊN TỰ DOÁN VÀ KHOẢNG CÁCH GPS (DB) ===
${studentStoreText}

=== ĐÁNH GIÁ CỘNG ĐỒNG MINH BẠCH (DB) ===
${reviewText}

=== TIPS SINH HOẠT HỌC TẬP ===
${tipsText}
${dbMatches.length > 0 ? `\n=== DỮ LIỆU CỘNG ĐỒNG (DB) ===\n${dbMatches.map(v => `- ${v.name}: ${v.address || 'N/A'}`).join('\n')}` : ''}
${tiktokMatches.length > 0 ? `\n=== DỮ LIỆU TIKTOK PHỔ BIẾN ===\n${tiktokMatches.map(v => `- ${v.name}: ${v.mentions} mentions, Rating: ${v.rating}/5`).join('\n')}` : ''}`;
};

// ── Detect intent ──────────────────────────────────────────────────────────
const detectIntent = (message) => {
  const m = message.toLowerCase();
  if (/gợi ý|ăn gì|chỗ chơi|đi đâu|quán ngon|cafe/.test(m)) return 'suggestion';
  if (/giá|bao nhiêu|tiền|đắt|rẻ|chi phí|menu/.test(m)) return 'price';
  if (/xe bus|di chuyển|đường đi|bus|107|74/.test(m)) return 'transport';
  return 'general';
};

const buildLocationContext = (location) => {
  if (!location) return '';
  const latitude = location.latitude || location.lat;
  const longitude = location.longitude || location.lng || location.lon;
  if (latitude && longitude) {
    return `\n\n=== VỊ TRÍ NGƯỜI DÙNG ===\n- Tọa độ: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}\n- Hãy dùng vị trí này để gợi ý địa điểm, quán ăn, lịch trình hoặc di chuyển gần nhất.\n`;
  }
  if (typeof location === 'string') {
    return `\n\n=== VỊ TRÍ NGƯỜI DÙNG ===\n- Vị trí: ${location}\n- Hãy dùng vị trí này để gợi ý địa điểm, quán ăn, lịch trình hoặc di chuyển gần nhất.\n`;
  }
  return '';
};

const buildIntentInstruction = (intent) => {
  if (intent === 'price') {
    return `Khi người dùng hỏi về giá cả hoặc minh bạch giá, hãy trả lời thật chi tiết và trung thực bằng tiếng Việt. Nêu giá cụ thể của các quán ăn quanh khu FPT Hòa Lạc và Tân Xã.`;
  }
  if (intent === 'transport') {
    return `Khi người dùng hỏi về di chuyển hoặc xe bus (như bus 107, 74), hãy cung cấp lộ trình di chuyển chính xác từ nội thành lên campus FPT Hòa Lạc và ngược lại.`;
  }
  return `Hãy trả lời như HolaMate AI, trợ lý đời sống sinh viên FPT Hòa Lạc thân thiện và nhiệt tình. Gợi ý các món ăn ngon, quán cafe học bài, và địa điểm dã ngoại gần trường.`;
};

const buildPricePrompt = (query, matches) => {
  const vendorLines = matches.slice(0, 5).map((v) => {
    const priceMin = (v.priceRange?.min || v.price?.min)?.toLocaleString('vi-VN') || 'N/A';
    const priceMax = (v.priceRange?.max || v.price?.max)?.toLocaleString('vi-VN') || 'N/A';
    const unit = v.priceRange?.unit || v.price?.unit || 'item';
    return `- ${v.name}: ${priceMin}–${priceMax}đ/${unit} | ${v.address || 'Hà Nội'} | ${v.rating ? `${v.rating}/5` : 'No rating'}`;
  }).join('\n');

  return `Bạn là HanoMate AI chuyên viên tư vấn giá cả tại campus FPT.
Dựa trên dữ liệu sau đây, hãy trả lời nhanh gọn, cụ thể và trung thực về giá của: "${query}".
${vendorLines ? `\nDữ liệu:\n${vendorLines}` : '\nKhông tìm thấy dữ liệu cụ thể.'}

Yêu cầu phản hồi:
- Hãy trả lời tự nhiên như đang chat Messenger qua điện thoại với bạn học.
- Tuyệt đối KHÔNG dùng bất kỳ ký hiệu markdown như dấu sao đôi (**) để bôi đậm, dấu gạch ngang (-) để tạo danh sách hay danh sách số (1, 2, 3).
- Nêu giá ước tính rõ ràng, chỉ ra nơi rẻ nhất hoặc ngon nhất nếu có trong dữ liệu, và khuyên bạn học tip tiết kiệm.
- Viết bằng tiếng Việt.
`;
};

const getPriceReply = async (query) => {
  const dbMatches = await getAllVendors(query);
  const tiktokVendors = extractVendorsFromTikTok();
  
  // Combine matches from DB and TikTok
  const allMatches = [
    ...dbMatches.slice(0, 3),
    ...tiktokVendors.filter(tv => !dbMatches.find(db => db.name?.toLowerCase() === tv.name.toLowerCase())).slice(0, 2)
  ];
  
  const prompt = buildPricePrompt(query, allMatches);
  const model = getModel();
  const result = await model.generateContent(prompt);
  return {
    reply: result.response.text(),
    vendors: allMatches.slice(0, 5),
  };
};

// ── Local Mock Fallback Responder ──────────────────────────────────────────
const generateMockResponse = async (message, context) => {
  const m = message.toLowerCase();
  
  if (m.includes('35k') || m.includes('35.000') || m.includes('35 nghìn') || (m.includes('no') && m.includes('ktx'))) {
    return `Chào bạn nhé. Nếu có tầm 35k mà muốn ăn no quanh khu ký túc xá thì mình khuyên thật là nên ghé quán Cơm Tấm KTX Dom A. Suất ở đây chỉ từ 25 nghìn đến 30 nghìn thôi mà sườn được ướp siêu đậm vị, cơm dẻo, ăn bao no luôn. Điểm đánh giá của các bạn sinh viên cho quán này tận 4.8 sao đấy. 

Ngoài ra bạn cũng có thể ghé mấy gian hàng ăn vặt tự quản của sinh viên, mua bánh tráng trộn hay bánh mì xúc xích chỉ tầm 15k đến 25k cũng ngon và sạch sẽ lắm. Ăn cơm tấm 30k xong vẫn thừa hẳn 5k mua chai nước ngọt uống kèm là chuẩn bài luôn nha.`;
  }

  if (m.includes('giao chậm') || m.includes('chậm') || m.includes('đêm')) {
    return `Chào cậu nha. Nếu định đặt đồ ăn đêm mà sợ ship chậm thì phải lưu ý tránh cái Quán Ăn Đêm Tân Xã ra nhé. Nhiều bạn sinh viên review trên hệ thống là quán này giao hàng siêu rùa bò, có khi phải đợi tận 45 phút liền và chỉ được chấm có 2 sao thôi. 

Thay vào đó, nếu thèm lẩu nướng thì đặt bên 1988 BBQ Tân Xã xem sao, họ mở đến 11 giờ đêm và ship nhanh lắm, đồ ăn đóng hộp bạc giữ nhiệt tốt. Hoặc đơn giản hơn thì gọi Cơm tấm KTX Dom A mở đến 10 giờ rưỡi tối, ship nội khu chỉ mất tầm 10 đến 15 phút thôi. Lúc đặt nhớ ghi rõ số phòng với số Dom của cậu để shipper tìm cho nhanh nha.`;
  }

  if (m.includes('gian hàng sinh viên') || m.includes('đồ uống') || m.includes('nước') || m.includes('trà') || m.includes('student store')) {
    return `Chào bạn. Hiện tại quanh Hola có mấy gian hàng tự doanh của các bạn sinh viên bán đồ uống đang mở cửa nè. 

Đầu tiên là gian hàng Student Hub ở sảnh toà Alpha, bên này đã được xác minh sinh viên đàng hoàng, có trà sữa truyền thống chỉ 20k, nước cam vắt 18k với trà đào cam sả 22k uống khá ổn áp. Hoặc bạn thử ghé Hola Cafe Sinh Viên uống cafe muối 20k hay cafe sữa đá 15k xem sao, vị béo thơm mà giá cả lại đúng chất sinh viên luôn. Bạn có thể vào phần Gian hàng sinh viên trên web để xem cụ thể menu rồi bấm gửi yêu cầu đặt món ủng hộ các bạn nhé.`;
  }

  if (m.includes('ăn nhẹ') || m.includes('không cay') || m.includes('fptu')) {
    return `Chào cậu. Muốn tìm đồ ăn nhẹ nhàng, không cay mà ngay gần trường FPTU thì cậu ghé mấy chỗ này là hợp lý nhất này. 

Ngay trong toà Alpha có quán Twitter Beans Coffee không gian điều hoà mát mẻ cực thích hợp ăn nhẹ học bài, ở đấy có bánh mousse trà xanh 35k với croissant phô mai 28k thơm ngon không cay tí nào, uống kèm trà sen vàng ngọt dịu nữa là hết sảy. Hoặc cậu ghé Highlands Coffee ngay trong campus làm cái bánh mì que phô mai 19k cũng ngon. Nhớ né mấy món xiên bẩn hay lẩu cốc ngoài Tân Xã ra nha vì nước sốt của họ hay làm cay lắm đó.`;
  }

  if (m.includes('4 người') || m.includes('nhóm') || m.includes('sinh viên')) {
    return `Chào cậu nhé. Đi nhóm 4 người ăn uống ngon rẻ đúng kiểu sinh viên quanh Hoà Lạc thì mình thấy lẩu nướng 1988 BBQ Tân Xã là chuẩn nhất. Ở đây bán buffet lẩu nướng bình dân từ 119k đến 139k một người, không gian siêu rộng rãi thoải mái cho cả nhóm tụ tập chém gió, nhân viên lại nhiệt tình nữa. 

Hoặc nếu muốn ăn cơm gia đình thì gọi một mẹt gà ri 7 món ở Gà Ri Phú Bình tầm 350k chia ra 4 người ăn là no nê chắc thịt luôn. Chúc nhóm cậu có một bữa ăn vui vẻ nha.`;
  }

  // General fallback using matches from context
  return `Chào bạn nhé, mình là trợ lý HolaMate đây. Hiện tại hệ thống kết nối AI của bên mình đang được bảo trì một xíu, nhưng mình vẫn có sẵn thông tin cập nhật mới nhất cho bạn nè. Nếu bạn muốn đi cafe học nhóm thì ghé Highlands Coffee ngay trong campus, hoặc muốn ngắm view hồ Tân Xã thơ mộng thì qua Bay Coffee uống cafe muối 25k thơm béo ngậy nha. Còn ăn cơm trưa tối no bụng thì cơm tấm KTX Dom A chỉ từ 25k là lựa chọn ngon bổ rẻ nhất luôn. Bạn có thể chuyển qua mục Đặt món hoặc Gian hàng sinh viên trên trang web để xem menu chi tiết nhé.`;
};

// ── CONTROLLER: Chat with multi-turn history ───────────────────────────────
const chatWithPlanner = async (req, res) => {
  try {
    const { message, history = [], location = null } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Vui lòng nhập tin nhắn' });

    const intent = detectIntent(message);
    const context = await buildContext(message, location);
    const locationContext = buildLocationContext(location);

    if (intent === 'price') {
      try {
        const priceResult = await getPriceReply(message);
        return res.json({ reply: cleanResponseForChat(priceResult.reply), intent, suggestions: getSuggestions(intent), vendors: priceResult.vendors });
      } catch (err) {
        console.warn('Fallback to mock price due to error:', err.message);
        const fallbackReply = await generateMockResponse(message, context);
        return res.json({ reply: cleanResponseForChat(fallbackReply), intent, suggestions: getSuggestions(intent) });
      }
    }

    const model = getModel();
    
    // Filter history to ensure it starts with 'user' role (Gemini API requirement)
    let processedHistory = history
      .filter(h => h.role && h.content)
      .map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));
    
    // If history starts with 'model', remove it to comply with API requirements
    if (processedHistory.length > 0 && processedHistory[0].role === 'model') {
      processedHistory = processedHistory.slice(1);
    }
    
    const chat = model.startChat({ history: processedHistory });

    const intentInstruction = buildIntentInstruction(intent);
    const prompt = `${context}${locationContext}\n\n=== HƯỚNG DẪN NỘI DUNG ===\n${intentInstruction}\n\n=== CÂU HỎI ===\n${message}\n\n[Intent: ${intent}]`;
    const result = await chat.sendMessage(prompt);
    const text = result.response.text();

    res.json({ reply: cleanResponseForChat(text), intent, suggestions: getSuggestions(intent) });
  } catch (error) {
    console.error('AI Chat Error, using mock fallback:', error.message);
    const context = await buildContext(req.body.message, location);
    const fallbackReply = await generateMockResponse(req.body.message, context);
    res.json({ reply: cleanResponseForChat(fallbackReply), intent: detectIntent(req.body.message), suggestions: getSuggestions(detectIntent(req.body.message)) });
  }
};

// ── CONTROLLER: Generate structured itinerary JSON ─────────────────────────
const generateItinerary = async (req, res) => {
  try {
    const { location = 'Hoàn Kiếm', duration = 120, preferences = [], budget = 'medium' } = req.body;

    const budgetGuide = { low: '30,000-80,000đ/món', medium: '60,000-200,000đ/bữa', high: '200,000đ+/bữa' };
    const context = await buildContext(`${location} ${preferences.join(' ')}`);

    const prompt = `${context}

=== YÊU CẦU TẠO LỊCH TRÌNH ===
Vị trí xuất phát: ${location}
Thời gian: ${duration} phút
Sở thích: ${preferences.length > 0 ? preferences.join(', ') : 'ẩm thực, văn hóa, tham quan'}
Ngân sách: ${budget} (${budgetGuide[budget] || budgetGuide.medium})

Hãy tạo lịch trình CHI TIẾT và trả về JSON với format CHÍNH XÁC sau (chỉ JSON, không text thêm):
{
  "title": "Tên lịch trình",
  "duration": ${duration},
  "totalCost": { "min": 0, "max": 0 },
  "steps": [
    {
      "time": "09:00",
      "name": "Tên địa điểm",
      "address": "Địa chỉ",
      "category": "food|cafe|attraction|market|bar",
      "duration": 30,
      "cost": { "min": 0, "max": 0 },
      "description": "Mô tả ngắn",
      "tip": "Tip hữu ích",
      "emoji": "🍜"
    }
  ],
  "tips": ["tip1", "tip2"],
  "summary": "Tóm tắt lịch trình"
}`;

    const model = getModel();
    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) text = jsonMatch[1];

    let itinerary;
    try {
      itinerary = JSON.parse(text.trim());
    } catch {
      itinerary = { title: 'Lịch trình Hà Nội', steps: [], summary: text, duration, totalCost: { min: 0, max: 0 } };
    }

    res.json({ itinerary, raw: text });
  } catch (error) {
    console.error('Itinerary Error:', error.message);
    res.status(500).json({ error: 'Không thể tạo lịch trình.', detail: error.message });
  }
};

// ── CONTROLLER: Price check ────────────────────────────────────────────────
const checkPrice = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'Vui lòng nhập tên món/địa điểm' });

    const priceResult = await getPriceReply(query);

    res.json({
      reply: cleanResponseForChat(priceResult.reply),
      vendors: priceResult.vendors,
      reportCount: 0,
    });
  } catch (error) {
    console.warn('checkPrice error, fallback to mock response:', error.message);
    const context = await buildContext(query);
    const reply = await generateMockResponse(query, context);
    res.json({
      reply: cleanResponseForChat(reply),
      vendors: [],
      reportCount: 0
    });
  }
};

// ── CONTROLLER: Smart suggestions ─────────────────────────────────────────
const getSuggestionsList = async (req, res) => {
  try {
    const { type = 'all', limit = 6 } = req.query;
    
    // Combine local Hanoi vendors with TikTok popular vendors
    let localVendors = HANOI_VENDORS;
    if (type !== 'all') localVendors = localVendors.filter(v => v.category === type);
    
    const tiktokVendors = extractVendorsFromTikTok();
    
    // Mix local and TikTok vendors, prioritizing by rating/mentions
    const combined = [
      ...localVendors.sort((a, b) => b.rating - a.rating).slice(0, Math.ceil(parseInt(limit) * 0.6)),
      ...tiktokVendors.sort((a, b) => b.mentions - a.mentions).slice(0, Math.floor(parseInt(limit) * 0.4))
    ];
    
    const top = combined.slice(0, parseInt(limit));
    res.json({ suggestions: top });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi lấy gợi ý.' });
  }
};

// ── CONTROLLER: Streaming chat ─────────────────────────────────────────────
const streamChat = async (req, res) => {
  try {
    const { message, history = [], location = null } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Vui lòng nhập tin nhắn' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const context = await buildContext(message, location);
    const locationContext = buildLocationContext(location);
    const model = getModel();
    
    // Filter history to ensure it starts with 'user' role (Gemini API requirement)
    let processedHistory = history
      .filter(h => h.role && h.content)
      .map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.content }],
      }));
    
    // If history starts with 'model', remove it to comply with API requirements
    if (processedHistory.length > 0 && processedHistory[0].role === 'model') {
      processedHistory = processedHistory.slice(1);
    }
    
    const chat = model.startChat({ history: processedHistory });

    const prompt = `${context}${locationContext}\n\n=== CÂU HỎI ===\n${message}`;
    const result = await chat.sendMessageStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        // Strip asterisks/markdown formatting symbols from live chunks
        const cleanedText = text
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/#/g, '')
          .replace(/^\s*[-*+•]\s+/gm, '')
          .replace(/^\s*\d+[\.\)]\s+/gm, '');
        res.write(`data: ${JSON.stringify({ chunk: cleanedText })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream Error, using mock stream:', error.message);
    try {
      const context = await buildContext(req.body.message, req.body.location);
      const fallbackReply = await generateMockResponse(req.body.message, context);
      const cleanedFallback = cleanResponseForChat(fallbackReply);
      
      // Send the response chunk by chunk (simulate streaming speed)
      const words = cleanedFallback.split(/(\s+)/);
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ chunk: word })}\n\n`);
        await new Promise(resolve => setTimeout(resolve, 15));
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};

// ── Helper ─────────────────────────────────────────────────────────────────
const getSuggestions = (intent) => {
  const map = {
    suggestion: ['Ăn gì hôm nay quanh KTX?', 'Top 5 quán nướng lẩu Tân Xã', 'Quán cafe yên tĩnh học nhóm'],
    price: ['Giá lẩu nướng 1988 BBQ?', 'Cơm tấm Dom A bao nhiêu?', 'Ăn vặt Tân Xã giá học sinh'],
    transport: ['Lịch xe bus 107', 'Cách đi xe bus 74 lên Hola', 'Đi Grab từ trường ra Tân Xã'],
    general: ['Gợi ý món ăn ngon', 'Các Dom KTX ở Hola', 'Đại học FPT có gì chơi?'],
  };
  return map[intent] || map.general;
};

module.exports = { chatWithPlanner, generateItinerary, checkPrice, getSuggestionsList, streamChat };
