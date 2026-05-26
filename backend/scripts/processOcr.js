const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Lỗi: GEMINI_API_KEY chưa được cấu hình trong backend/.env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODELS = [
  'gemini-1.5-pro',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-flash-latest'
];
let currentModelIndex = 0;
let isQuotaExhausted = false;

const getActiveModelName = () => {
  return MODELS[currentModelIndex % MODELS.length];
};

const rotateModel = () => {
  currentModelIndex++;
  console.log(`   🔄 Chuyển sang model Gemini dự phòng: ${getActiveModelName()}`);
};

const systemPromptOCR = `Bạn là trợ lý AI chuyên gia phân tích hình ảnh thực đơn nhà hàng (OCR) kết hợp với thông tin văn bản mô tả để tạo danh sách thực đơn CHI TIẾT, ĐẦY ĐỦ VÀ CHÍNH XÁC nhất.
NHIỆM VỤ:
1. Đọc và nhận dạng TOÀN BỘ tất cả các món ăn, thức uống, món ăn kèm, đồ tráng miệng, combo và giá tiền tương ứng từ hình ảnh thực đơn. Bạn không được tóm tắt hay lược bỏ bất kỳ món nào. Kể cả thực đơn có hàng chục hay hàng trăm món, bạn phải quét và liệt kê đầy đủ từng món một từ tất cả các ảnh được cung cấp.
2. Kết hợp với các món ăn/đồ uống được liệt kê trong phần "Thông tin văn bản bổ sung" (nếu có và nếu có giá hoặc ước lượng giá).
3. Hợp nhất, loại bỏ trùng lặp và chuẩn hóa dữ liệu.
4. Trả về kết quả là một mảng JSON các đối tượng chứa:
   - "name": Tên món ăn/đồ uống (Viết hoa chữ cái đầu mỗi từ, chuẩn hóa tiếng Việt, sửa lỗi chính tả nhẹ, loại bỏ số thứ tự).
   - "price": Giá tiền (Phải là kiểu NUMBER nguyên. Quy đổi viết tắt như "k", "K", "đ", ".", "," thành số nguyên đầy đủ. Ví dụ: "30k" hoặc "30.000" -> 30000. Nếu không rõ giá hoặc không ghi giá, hãy ước lượng giá hợp lý dựa trên loại quán hoặc để mặc định 35000 cho đồ ăn và 25000 cho đồ uống).

TRẢ VỀ KẾT QUẢ:
- Chỉ trả về duy nhất 1 mảng JSON chứa các đối tượng có cấu trúc:
[
  {
    "name": "Tên Món Ăn",
    "price": 30000
  }
]
- Không bao gồm bất kỳ văn bản, lời giải thích hay thẻ markdown nào ngoài mảng JSON này.`;

const systemPromptText = (name, category) => `Hãy tạo một danh sách thực đơn cực kỳ ĐẦY ĐỦ, CHI TIẾT và PHONG PHÚ gồm từ 25 đến 40 món ăn hoặc đồ uống tiêu biểu, thực tế và phổ biến bán tại quán sau ở Việt Nam:
Tên quán: ${name}
Thể loại: ${category}

Yêu cầu trả về định dạng JSON thuần túy dưới dạng một mảng các đối tượng chứa "name" (tên món cụ thể, hấp dẫn, viết hoa chữ cái đầu mỗi từ) và "price" (giá tiền hợp lý, thực tế của quán bình dân hoặc tầm trung ở Việt Nam, là số nguyên, đơn vị VND, ví dụ: 35000, 45000, 120000).
Chú ý chỉ trả về JSON hợp lệ, không bọc trong thẻ \`\`\`json. Không kèm giải thích gì thêm.`;

// Downloader helper
const downloadImageToBase64 = async (url) => {
  try {
    if (url.includes('googleusercontent.com') && url.includes('=')) {
      url = url.split('=')[0] + '=w800';
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout
    
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (err) {
    console.warn(`   ⚠️ Lỗi tải ảnh thực đơn: ${err.message}`);
    return null;
  }
};

const generateWithModelRotation = async (contentParts, responseMimeType = 'application/json') => {
  if (isQuotaExhausted) {
    console.log(`   ⏩ Đã hết hạn ngạch Gemini trong ngày, bỏ qua gọi API.`);
    return null;
  }
  
  const startModelIndex = currentModelIndex;
  
  while ((currentModelIndex - startModelIndex) < MODELS.length) {
    const modelName = getActiveModelName();
    try {
      // Short delay before each call to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType }
      });
      
      const result = await model.generateContent(contentParts);
      const text = result.response.text();
      return text;
    } catch (err) {
      const errMsg = err.message || '';
      console.warn(`   ⚠️ Model ${modelName} bị lỗi: ${errMsg.substring(0, 150)}...`);
      
      rotateModel();
    }
  }
  
  console.warn('   🔴 Tất cả các model Gemini đều đã hết hạn ngạch hoặc gặp lỗi. Đánh dấu hết hạn ngạch.');
  isQuotaExhausted = true;
  return null;
};

const processOCR = async (name, category, textContext, photoUrls) => {
  if (isQuotaExhausted) return null;
  const parts = [
    { text: `${systemPromptOCR}\n\nTên quán: ${name}\nThể loại: ${category}\n\nThông tin văn bản bổ sung về quán:\n"""\n${textContext}\n"""` }
  ];

  let validImageCount = 0;
  for (const url of photoUrls.slice(0, 10)) {
    console.log(`   🌐 Đang tải ảnh menu: ${url.substring(0, 70)}...`);
    const base64Data = await downloadImageToBase64(url);
    if (base64Data) {
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      });
      validImageCount++;
    }
  }

  if (validImageCount === 0) {
    console.warn(`   ⚠️ Không tải được hình ảnh menu nào cho '${name}'.`);
    return null;
  }

  console.log(`   🤖 Đang gọi Gemini Multimodal OCR...`);
  const text = await generateWithModelRotation(parts);
  return parseJsonMenu(text);
};

const generateFallbackMenu = async (name, category) => {
  console.log(`   🤖 Đang tự động sinh thực đơn cho '${name}'...`);
  const text = await generateWithModelRotation([
    { text: systemPromptText(name, category) }
  ]);
  return parseJsonMenu(text);
};

const parseJsonMenu = (text) => {
  if (!text) return null;
  try {
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.split('```')[1];
      if (cleaned.startsWith('json')) {
        cleaned = cleaned.slice(4);
      }
    }
    cleaned = cleaned.trim();
    const menu = JSON.parse(cleaned);
    if (Array.isArray(menu)) return menu;
  } catch (err) {
    console.warn(`   ⚠️ Lỗi parse JSON thực đơn: ${err.message}. Text: ${text.substring(0, 150)}`);
  }
  return null;
};

const getFallbackHardcoded = (category) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('cafe') || cat.includes('cà phê') || cat.includes('coffee') || cat.includes('trà sữa') || cat.includes('trà') || cat.includes('nước')) {
    return [
      { name: "Cà phê đen đá", price: 20000 },
      { name: "Cà phê sữa đá", price: 25000 },
      { name: "Bạc xỉu đặc biệt", price: 29000 },
      { name: "Trà sữa trân châu đường đen", price: 40000 },
      { name: "Trà quất mật ong", price: 25000 },
      { name: "Nước cam vắt nguyên chất", price: 35000 },
      { name: "Sinh tố bơ", price: 40000 }
    ];
  }
  return [
    { name: "Cơm rang dưa bò", price: 45000 },
    { name: "Cơm sườn sụn nướng", price: 45000 },
    { name: "Phở bò sốt vang", price: 45000 },
    { name: "Bún chả nem cua bể", price: 50000 },
    { name: "Mì xào bò rau cải", price: 40000 },
    { name: "Trà đá mát lạnh", price: 3000 }
  ];
};

const run = async () => {
  const tempPath = path.resolve(__dirname, '../../tools/data_pipeline/temp_scraped_vendors.json');
  const outputPath = path.resolve(__dirname, '../../tools/data_pipeline/scraped_maps_vendors.json');

  if (!fs.existsSync(tempPath)) {
    console.error(`❌ Không tìm thấy file tạm: ${tempPath}`);
    process.exit(1);
  }

  const vendors = JSON.parse(fs.readFileSync(tempPath, 'utf8'));
  console.log(`🚀 Bắt đầu xử lý OCR cho ${vendors.length} quán ăn...`);

  const processedVendors = [];

  for (let i = 0; i < vendors.length; i++) {
    const v = vendors[i];
    console.log(`[${i + 1}/${vendors.length}] Xử lý: ${v.name}`);

    let menu = null;

    if (v.photo_urls && v.photo_urls.length > 0) {
      try {
        menu = await processOCR(v.name, v.category, v.text_context, v.photo_urls);
      } catch (err) {
        console.error(`   ⚠️ Lỗi OCR cho ${v.name}: ${err.message}`);
      }
    }

    if (!menu) {
      try {
        menu = await generateFallbackMenu(v.name, v.category);
      } catch (err) {
        console.error(`   ⚠️ Lỗi sinh menu tự động cho ${v.name}: ${err.message}`);
      }
    }

    if (!menu || menu.length === 0) {
      console.warn(`   ⚠️ Sử dụng thực đơn cứng dự phòng.`);
      menu = getFallbackHardcoded(v.category);
    }

    v.menu = menu;
    delete v.photo_urls;
    delete v.text_context;

    processedVendors.push(v);
    console.log(`   ✨ Hoàn thành! Menu có ${menu.length} món.`);

    // Delay 2 seconds between vendors (only if not quota exhausted)
    if (!isQuotaExhausted) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(processedVendors, null, 2), 'utf8');
  console.log(`🎉 Hoàn tất quét thực đơn và lưu vào: ${outputPath}`);
};

run();
