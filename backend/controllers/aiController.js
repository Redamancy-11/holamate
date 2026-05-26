const { GoogleGenerativeAI } = require('@google/generative-ai');
const PriceReport = require('../models/PriceReport');
const { getAllVendors } = require('../services/vendorService');
const { HANOI_VENDORS, HANOI_DISTRICTS, TRAVEL_TIPS } = require('../data/hanoiKnowledge');
const { getTikTokContext, extractVendorsFromTikTok } = require('../data/tiktokData');

// ── Init Gemini 2.0 Flash ──────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const getModel = () => genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: {
    temperature: 0.85,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
  systemInstruction: `Bạn là HolaMate AI — trợ lý ẩm thực và đời sống sinh viên chuyên gợi ý món ăn, đồ uống kèm review minh bạch, trung thực tại FPT Hoà Lạc, Thạch Thất, Hà Nội.

NHIỆM VỤ CHÍNH:
• Tư vấn, gợi ý các món ăn ngon, đồ uống hot trend, quán ăn hợp khẩu vị và túi tiền của sinh viên.
• Cung cấp thông tin giá cả thực tế và các đánh giá (review) minh bạch, trung thực từ dữ liệu TikTok và cộng đồng (không tâng bốc, nêu rõ ưu/nhược điểm nếu có).
• Giúp sinh viên chọn món, so sánh giá cả giữa các quán để tránh bị "chém giá".
• Xử lý các câu hỏi về "ăn gì hôm nay?", "thèm ăn vặt?", "quán trà sữa nào học nhóm tốt?" quanh khu campus FPT và hồ Tân Xã.

PHONG CÁCH PHẢN HỒI:
• Thân thiện, nhiệt tình, sử dụng ngôn ngữ trẻ trung phù hợp với sinh viên (xưng hô bạn - mình).
• Sử dụng emoji sinh động để làm nổi bật thông tin món ăn và đánh giá.
• Ngắn gọn, súc tích nhưng đầy đủ thông tin hữu ích (luôn nêu rõ món gì ngon nhất, giá bao nhiêu).
• Luôn kèm theo giá cả cụ thể (đơn vị VNĐ) khi gợi ý ăn uống.
• Đánh giá khách quan, nêu rõ nguồn review (Ví dụ: "Theo review TikTok...", "Theo đánh giá từ sinh viên...").

KIẾN THỨC ĐẶC BIỆT:
• Highlands Coffee Hola — nằm ngay trong campus FPT, trung tâm học nhóm, đồ uống ổn định.
• Bay Coffee & Tea — view hồ Tân Xã cực thoáng mát, nổi tiếng cafe muối 25k thơm béo.
• 1988 BBQ Tân Xã — buffet nướng lẩu rẻ khoái khẩu của sinh viên, không gian rộng rãi nhưng hơi đông vào cuối tuần.
• Cơm tấm KTX Dom A — nhanh gọn, giá chỉ từ 25k-30k/suất, nhiều thịt cơm dẻo.
• Gà Ri Phú Bình — nổi tiếng gà đồi chắc thịt ngon ngọt, phù hợp tụ tập nhóm đông.
• Twitter Beans Coffee — trà sữa và bánh ngọt chất lượng cao, không gian yên tĩnh thích hợp ôn thi.

Luôn trả lời bằng tiếng Việt trừ khi người dùng viết bằng tiếng Anh.`,
});

// ── RAG: Build context từ knowledge base + DB + TikTok ──────────────────────
const buildContext = async (query) => {
  const matchedVendors = await getAllVendors(query);
  const tiktokVendors = extractVendorsFromTikTok();
  
  // Combine vendors from DB and TikTok, prioritize by rating
  const allVendors = [
    ...matchedVendors.slice(0, 4),
    ...tiktokVendors.filter(tv => !matchedVendors.find(mv => mv.name?.toLowerCase() === tv.name.toLowerCase())).slice(0, 3)
  ];

  const contextVendors = allVendors.length > 0
    ? allVendors.slice(0, 6)
    : HANOI_VENDORS.filter(v => v.rating >= 4.7).slice(0, 6).map(v => ({ ...v, source: 'local', priceRange: v.price }));

  const vendorText = contextVendors.map((v) => {
    const priceMin = (v.priceRange?.min || v.price?.min)?.toLocaleString?.('vi-VN') || 'N/A';
    const priceMax = (v.priceRange?.max || v.price?.max)?.toLocaleString?.('vi-VN') || 'N/A';
    const unit = v.priceRange?.unit || v.price?.unit || 'item';
    const source = v.source || 'local';
    return `- ${v.name} (${v.category}): ${v.address || 'Hà Nội'}, Giá: ${priceMin}–${priceMax}đ/${unit}, Giờ: ${v.hours || 'N/A'}, Rating: ${v.rating || 'N/A'}/5 [${source}]${v.tips ? `, Tips: ${v.tips}` : ''}`;
  }).join('\n');

  const tipsText = TRAVEL_TIPS.slice(0, 3).map(t => `- ${t.tip}`).join('\n');
  const dbMatches = matchedVendors.filter((v) => v.source === 'db');
  const tiktokMatches = allVendors.filter(v => v.source === 'tiktok');

  return `=== DỮ LIỆU ĐỊA ĐIỂM FPT HOÀ LẠC (RAG) ===\n${vendorText}\n\n=== TIPS SINH HOẠT HỌC TẬP ===\n${tipsText}${dbMatches.length > 0 ? `\n\n=== DỮ LIỆU CỘNG ĐỒNG (DB) ===\n${dbMatches.map(v => `- ${v.name}: ${v.address || 'N/A'}`).join('\n')}` : ''}${tiktokMatches.length > 0 ? `\n\n=== DỮ LIỆU TIKTOK PHỔ BIẾN ===\n${tiktokMatches.map(v => `- ${v.name}: ${v.mentions} mentions, Rating: ${v.rating}/5`).join('\n')}` : ''}`;
};

// ── Detect intent ──────────────────────────────────────────────────────────
const detectIntent = (message) => {
  const m = message.toLowerCase();
  if (/lịch trình|itinerary|plan|tour|đi đâu|gợi ý|kế hoạch|nên đi|itinerary|schedule|plan/.test(m)) return 'itinerary';
  if (/giá|price|bao nhiêu|cost|expensive|cheap|rẻ|đắt|tiền|minh bạch|giá cả|transparent/.test(m)) return 'price';
  if (/ăn|food|phở|bún|bánh|cơm|cháo|eat|restaurant|quán/.test(m)) return 'food';
  if (/cà phê|cafe|coffee|trà|tea|drink/.test(m)) return 'cafe';
  if (/tham quan|attraction|đền|chùa|bảo tàng|hồ|lake|sightseeing/.test(m)) return 'attraction';
  if (/thời tiết|weather|mưa|rain|nóng|hot|lạnh|cold/.test(m)) return 'weather';
  if (/bar|bia|beer|nightlife|đêm|night/.test(m)) return 'nightlife';
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
  if (intent === 'itinerary') {
    return `Khi người dùng hỏi về lịch trình, hãy tạo một kế hoạch tham quan Hà Nội rõ ràng, ngắn gọn, gồm thời gian, địa điểm, chi phí ước tính và tips du lịch cụ thể. Trả lời như một hướng dẫn viên thân thiện, ưu tiên lịch trình 2h-3h nếu câu hỏi không nói rõ thời lượng.`;
  }
  if (intent === 'price') {
    return `Khi người dùng hỏi về giá cả hoặc minh bạch giá, hãy trả lời thật chi tiết và trung thực bằng tiếng Việt. Sử dụng thông tin vendor hiện có để nêu giá trung bình, giá rẻ nhất, gợi ý nơi nên ăn hoặc mua, và tips tiết kiệm. Không lan man, chỉ trả lời đúng vấn đề giá cả.`;
  }
  return `Hãy trả lời như HanoMate AI, trợ lý du lịch Hà Nội thân thiện và nhiệt tình. Nếu người dùng hỏi về địa điểm ăn uống, lịch trình hoặc giá cả, hãy cung cấp thông tin chi tiết và thực tế dựa trên dữ liệu.`;
};

const buildPricePrompt = (query, matches) => {
  const vendorLines = matches.slice(0, 5).map((v) => {
    const priceMin = (v.priceRange?.min || v.price?.min)?.toLocaleString('vi-VN') || 'N/A';
    const priceMax = (v.priceRange?.max || v.price?.max)?.toLocaleString('vi-VN') || 'N/A';
    const unit = v.priceRange?.unit || v.price?.unit || 'item';
    return `- ${v.name}: ${priceMin}–${priceMax}đ/${unit} | ${v.address || 'Hà Nội'} | ${v.rating ? `${v.rating}/5` : 'No rating'}`;
  }).join('\n');

  return `Bạn là HanoMate AI chuyên viên minh bạch giá ở Hà Nội.
Dựa trên dữ liệu vendor sau đây, hãy trả lời nhanh gọn, cụ thể và trung thực về giá của: "${query}".
${vendorLines ? `\nDữ liệu vendor:\n${vendorLines}` : '\nKhông tìm thấy dữ liệu vendor cụ thể.'}

Yêu cầu phản hồi:
- Nêu giá ước tính rõ ràng
- Nếu có thể, chỉ ra nơi rẻ nhất và nơi ngon nhất
- Thêm tips tiết kiệm cho khách du lịch
- Viết bằng tiếng Việt
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

// ── CONTROLLER: Chat with multi-turn history ───────────────────────────────
const chatWithPlanner = async (req, res) => {
  try {
    const { message, history = [], location = null } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Vui lòng nhập tin nhắn' });

    const intent = detectIntent(message);
    const context = await buildContext(message);
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

    if (intent === 'price') {
      const priceResult = await getPriceReply(message);
      return res.json({ reply: priceResult.reply, intent, suggestions: getSuggestions(intent), vendors: priceResult.vendors });
    }

    const intentInstruction = buildIntentInstruction(intent);
    const prompt = `${context}${locationContext}\n\n=== HƯỚNG DẪN NỘI DUNG ===\n${intentInstruction}\n\n=== CÂU HỎI ===\n${message}\n\n[Intent: ${intent}]`;
    const result = await chat.sendMessage(prompt);
    const text = result.response.text();

    res.json({ reply: text, intent, suggestions: getSuggestions(intent) });
  } catch (error) {
    console.error('AI Chat Error:', error.message);
    res.status(500).json({ error: 'Lỗi AI. Vui lòng thử lại.', detail: error.message });
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
      reply: priceResult.reply,
      vendors: priceResult.vendors,
      reportCount: 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi kiểm tra giá.', detail: error.message });
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

    const context = await buildContext(message);
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
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream Error:', error.message);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

// ── Helper ─────────────────────────────────────────────────────────────────
const getSuggestions = (intent) => {
  const map = {
    itinerary: ['Lịch trình 2h Hoàn Kiếm', 'Tour ẩm thực buổi sáng', 'Lịch trình cả ngày Ba Đình'],
    food: ['Phở ngon nhất Hà Nội?', 'Bún chả ở đâu?', 'Ăn sáng gì ở phố cổ?'],
    cafe: ['Cà phê trứng ở đâu?', 'Rooftop cafe Hà Nội', 'Cafe view hồ Hoàn Kiếm'],
    price: ['Giá phở bao nhiêu?', 'Ngân sách 200k ăn được gì?', 'Chỗ ăn rẻ ngon gần phố cổ'],
    general: ['Lập lịch trình 2h', 'Ăn gì buổi sáng?', 'Top 5 địa điểm must-visit'],
  };
  return map[intent] || map.general;
};

module.exports = { chatWithPlanner, generateItinerary, checkPrice, getSuggestionsList, streamChat };
