const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { pool } = require('../config/pg');

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ Lỗi: GEMINI_API_KEY chưa được cấu hình trong backend/.env');
  process.exit(1);
}

if (!pool) {
  console.error('❌ Lỗi: Kết nối PostgreSQL/DATABASE_URL chưa được cấu hình.');
  process.exit(1);
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `Bạn là trợ lý AI chuyên gia phân tích và chuyển đổi hình ảnh thực đơn nhà hàng (OCR) thành dữ liệu cấu trúc JSON chuẩn.
NHIỆM VỤ:
1. Đọc và nhận dạng TOÀN BỘ tất cả các món ăn, thức uống, món ăn kèm và giá tiền tương ứng từ hình ảnh thực đơn. Bạn không được tóm tắt hay lược bỏ bất kỳ món nào. Kể cả thực đơn có hàng chục hay hàng trăm món, bạn phải quét và liệt kê đầy đủ từng món một.
2. Với mỗi món ăn/đồ uống tìm được, trả về một đối tượng JSON gồm:
   - "name": Tên món ăn (Viết hoa chữ cái đầu mỗi từ, chuẩn hóa tiếng Việt, sửa lỗi chính tả nhẹ nếu có, loại bỏ số thứ tự đứng trước nếu có).
   - "price": Giá tiền của món ăn (Phải là kiểu NUMBER nguyên. Hãy quy đổi các ký tự viết tắt như "k", "K", "đ", ".", "," thành giá trị số nguyên đầy đủ. Ví dụ: "30k" hoặc "30.000" hoặc "30" -> 30000. Nếu không có giá, hãy để là 0).
   - "description": Mô tả ngắn gọn về món ăn bằng tiếng Việt nếu có thông tin từ ảnh thực đơn, hoặc để trống "".

TRẢ VỀ KẾT QUẢ:
- Chỉ trả về duy nhất 1 mảng JSON chứa các đối tượng có cấu trúc:
[
  {
    "name": "Tên Món Ăn",
    "price": 30000,
    "description": "Mô tả nếu có"
  }
]
- Không bao gồm bất kỳ văn bản, lời giải thích hay thẻ markdown nào ngoài mảng JSON này.`;

// Helper: download image from URL to Base64
const downloadImageToBase64 = async (url) => {
  console.log(`🌐 Đang tải ảnh thực đơn từ URL: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể tải ảnh từ URL: ${url}. Status code: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
};

// Helper: read local file to Base64
const readLocalImageToBase64 = (filePath) => {
  console.log(`📂 Đang đọc ảnh thực đơn cục bộ: ${filePath}`);
  return fs.readFileSync(filePath).toString('base64');
};

// Process scanning using Gemini Multimodal
const processMenuWithAI = async (base64Data, mimeType = 'image/jpeg') => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-pro',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });

  const result = await model.generateContent([
    systemPrompt,
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    }
  ]);

  const responseText = result.response.text();
  let parsedMenu = [];
  try {
    parsedMenu = JSON.parse(responseText.trim());
  } catch (parseError) {
    const match = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      parsedMenu = JSON.parse(match[0]);
    } else {
      throw new Error('Gemini output could not be parsed as JSON: ' + responseText);
    }
  }

  // Basic validation on output elements
  return parsedMenu.map(item => ({
    name: String(item.name || '').trim(),
    price: parseInt(item.price) || 0,
    description: String(item.description || '').trim()
  })).filter(item => item.name.length > 0);
};

// Update Postgres database and local_vendors_override.json file
const saveExtractedMenu = async (vendorId, menuItems) => {
  const client = await pool.connect();
  try {
    // 1. Get vendor details from Postgres to ensure the vendor exists
    const dbRes = await client.query('SELECT id, name FROM vendors WHERE id = $1', [vendorId]);
    if (dbRes.rows.length === 0) {
      console.warn(`⚠️ Cảnh báo: Không tìm thấy vendor với ID '${vendorId}' trong Postgres.`);
      return false;
    }
    const vendorName = dbRes.rows[0].name;

    // 2. Update Postgres database
    console.log(`💾 Đang cập nhật thực đơn cho '${vendorName}' (${vendorId}) trong PostgreSQL...`);
    await client.query(
      'UPDATE vendors SET menu = $1, updated_at = now() WHERE id = $2',
      [JSON.stringify(menuItems), vendorId]
    );
    console.log(`✅ Đã cập nhật thành công Postgres.`);

    // 3. Update local_vendors_override.json for local persistence/seeding
    const overridePath = path.resolve(__dirname, '../data/local_vendors_override.json');
    let overrideList = [];
    if (fs.existsSync(overridePath)) {
      try {
        overrideList = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
      } catch (err) {
        console.warn(`⚠️ Không đọc được local_vendors_override.json: ${err.message}. Sẽ tạo file mới.`);
      }
    }

    const existingIdx = overrideList.findIndex(
      v => (v.id && String(v.id) === vendorId) || (v.name && v.name.toLowerCase() === vendorName.toLowerCase())
    );

    if (existingIdx >= 0) {
      overrideList[existingIdx].menu = menuItems;
      if (!overrideList[existingIdx].id) overrideList[existingIdx].id = vendorId;
      overrideList[existingIdx].name = vendorName;
    } else {
      overrideList.push({
        id: vendorId,
        name: vendorName,
        menu: menuItems
      });
    }

    fs.writeFileSync(overridePath, JSON.stringify(overrideList, null, 2), 'utf8');
    console.log(`✅ Đã đồng bộ thực đơn vào file local_vendors_override.json`);
    return true;
  } finally {
    client.release();
  }
};

const run = async () => {
  console.log('🤖 Bắt đầu chạy Tool Quét Thực Đơn AI (Batch Menu Scanner)...');
  const scanTargets = [];

  // --- Source 1: URLs config ---
  const configPath = path.resolve(__dirname, 'menu_scan_urls.json');
  if (fs.existsSync(configPath)) {
    try {
      const urls = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (Array.isArray(urls)) {
        urls.forEach(item => {
          if (item.vendorId && item.imageUrl) {
            scanTargets.push({
              vendorId: item.vendorId,
              sourceType: 'url',
              sourcePath: item.imageUrl
            });
          }
        });
      }
    } catch (err) {
      console.error(`❌ Lỗi đọc file config menu_scan_urls.json: ${err.message}`);
    }
  }

  // --- Source 2: Local Images Folder ---
  const imagesDir = path.resolve(__dirname, 'menu_images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
    // Write a README file inside
    fs.writeFileSync(
      path.join(imagesDir, 'README.txt'),
      'Thả các ảnh menu tại đây, đặt tên theo vendorId (ví dụ: com-tam-ktx.png)',
      'utf8'
    );
  }

  const files = fs.readdirSync(imagesDir);
  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      const vendorId = path.basename(file, ext);
      scanTargets.push({
        vendorId,
        sourceType: 'file',
        sourcePath: path.join(imagesDir, file)
      });
    }
  });

  if (scanTargets.length === 0) {
    console.log('⚠️ Không tìm thấy ảnh menu hoặc URL nào cần quét.');
    console.log('HƯỚNG DẪN: Thêm URL vào menu_scan_urls.json hoặc thả ảnh menu vào thư mục backend/scripts/menu_images/');
    process.exit(0);
  }

  console.log(` Found ${scanTargets.length} targets to process.`);

  for (let i = 0; i < scanTargets.length; i++) {
    const target = scanTargets[i];
    console.log(`\n[${i + 1}/${scanTargets.length}] Đang xử lý: ${target.vendorId} (Nguồn: ${target.sourceType})...`);

    try {
      let base64Data = '';
      let mimeType = 'image/jpeg';

      if (target.sourceType === 'url') {
        base64Data = await downloadImageToBase64(target.sourcePath);
      } else {
        base64Data = readLocalImageToBase64(target.sourcePath);
        const ext = path.extname(target.sourcePath).toLowerCase();
        mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      }

      console.log('✨ Đang chạy Gemini AI Multimodal OCR...');
      const menuItems = await processMenuWithAI(base64Data, mimeType);
      console.log(`🤖 AI đã trích xuất thành công ${menuItems.length} món ăn!`);

      const saved = await saveExtractedMenu(target.vendorId, menuItems);
      if (saved) {
        console.log(`🎉 Đã lưu thực đơn cho '${target.vendorId}' thành công!`);
      }
    } catch (err) {
      console.error(`❌ Lỗi xử lý ${target.vendorId}: ${err.message}`);
    }
  }

  console.log('\n✨ Đã hoàn thành toàn bộ tác vụ quét thực đơn.');
  process.exit(0);
};

run();
