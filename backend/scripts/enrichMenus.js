const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const OVERRIDE_PATH = path.resolve(__dirname, '../data/local_vendors_override.json');

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is not defined in .env file!');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

// Model list to rotate if needed
const MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGeminiWithRetry = async (prompt, modelName = 'gemini-2.0-flash', retries = 3) => {
  let attempt = 0;
  while (attempt < retries) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return text;
    } catch (err) {
      attempt++;
      console.warn(`[Gemini Warning] Model ${modelName} failed on attempt ${attempt}/${retries}: ${err.message}`);
      if (err.message.includes('429') || err.message.includes('Resource has been exhausted')) {
        const backoff = attempt * 5000;
        console.log(`Rate limit hit (429). Backing off for ${backoff}ms...`);
        await sleep(backoff);
      } else {
        await sleep(2000);
      }
      // Rotate model
      modelName = MODELS[attempt % MODELS.length];
    }
  }
  throw new Error(`Failed to call Gemini after ${retries} attempts.`);
};

const enrichSingleVendor = async (vendor) => {
  console.log(`\n==================================================`);
  console.log(`Enriching menu for: "${vendor.name}" (${vendor.category})`);
  console.log(`Current items count: ${vendor.menu ? vendor.menu.length : 0}`);

  const existingMenuStr = JSON.stringify(vendor.menu || [], null, 2);

  const prompt = `Bạn là một chuyên gia ẩm thực địa phương tại Việt Nam. Hãy giúp bổ sung đầy đủ, phong phú và chi tiết thực đơn (menu) cho quán sau đây:
Tên quán: "${vendor.name}"
Danh mục: "${vendor.category}"
Địa chỉ: "${vendor.address || 'Hòa Lạc, Thạch Thất, Hà Nội'}"
Thông tin bổ sung/Tips: "${vendor.tips || ''}"

Yêu cầu thực đơn:
1. Tạo thực đơn có từ 18 đến 28 món ăn/đồ uống đa dạng và thực tế cho quán này.
2. Các món ăn phải phản ánh chính xác loại quán (Ví dụ: tiệm bún phở thì có các loại bún phở, cháo, quẩy, rau sống, nước ngọt; tiệm cafe thì có cafe sữa, đen, bạc xỉu, trà sữa, trà hoa quả, đá xay, bánh mì ngọt, hạt hướng dương).
3. Đặt giá bán thực tế theo mặt bằng sinh viên Đại học FPT Hòa Lạc (khoảng từ 15,000đ đến 60,000đ cho quán nước; 25,000đ đến 90,000đ cho cơm bún phở; 120,000đ đến 350,000đ cho lẩu nướng buffet). Đơn vị tiền tệ là số nguyên VND (ví dụ: 25000, 39000, 150000).
4. Phải giữ lại và kết hợp tất cả các món ăn sẵn có này (chỉ điều chỉnh giá hoặc mô tả nếu cần cho đồng bộ):
${existingMenuStr}

Hãy trả về kết quả dưới định dạng JSON là một mảng các đối tượng món ăn. Mỗi món ăn có đúng 3 trường: "name" (tên món ăn, tiếng Việt chuẩn), "price" (số nguyên giá VND), "description" (mô tả ngắn hấp dẫn, tiếng Việt).
Ví dụ:
[
  { "name": "Cà phê sữa đá", "price": 25000, "description": "Hương vị đậm đà từ hạt cafe chín mọng hòa quyện sữa đặc béo ngậy." }
]

LƯU Ý QUAN TRỌNG: Chỉ trả về chuỗi JSON thô của mảng kết quả, KHÔNG bao bọc trong khối \`\`\`json hay bất cứ văn bản giải thích nào khác.`;

  try {
    const rawResponse = await callGeminiWithRetry(prompt);
    
    // Clean code block markers if Gemini included them
    let cleanJson = rawResponse.trim();
    if (cleanJson.startsWith('```')) {
      const match = cleanJson.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleanJson = match[1];
    }
    cleanJson = cleanJson.trim();

    const newMenu = JSON.parse(cleanJson);
    if (Array.isArray(newMenu) && newMenu.length > 0) {
      // Validate structure of items
      const validatedMenu = newMenu.map(item => ({
        name: String(item.name || '').trim(),
        price: parseInt(item.price) || 20000,
        description: String(item.description || '').trim()
      })).filter(item => item.name);

      vendor.menu = validatedMenu;
      console.log(`SUCCESS! Enriched to ${validatedMenu.length} items.`);
      return true;
    } else {
      console.warn(`[Warning] Response was parsed, but is not a valid non-empty array for ${vendor.name}`);
      return false;
    }
  } catch (err) {
    console.error(`[Error] Failed to enrich menu for ${vendor.name}:`, err.message);
    return false;
  }
};

const run = async () => {
  if (!fs.existsSync(OVERRIDE_PATH)) {
    console.error(`File local_vendors_override.json not found at ${OVERRIDE_PATH}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(OVERRIDE_PATH, 'utf8'));
  console.log(`Loaded ${data.length} vendors from local overrides.`);

  // Filter vendors that need enrichment (e.g. menu items < 15)
  const vendorsToProcess = data.filter(v => !v.menu || v.menu.length < 15);
  console.log(`Found ${vendorsToProcess.length} vendors needing menu enrichment (currently having < 15 items).`);

  if (vendorsToProcess.length === 0) {
    console.log('All vendors already have rich menus (15+ items). No work to do!');
    return;
  }

  let successCount = 0;
  for (let i = 0; i < vendorsToProcess.length; i++) {
    const vendor = vendorsToProcess[i];
    console.log(`\n--- Progress: ${i + 1}/${vendorsToProcess.length} ---`);
    
    const success = await enrichSingleVendor(vendor);
    if (success) {
      successCount++;
      // Save data immediately to avoid losing progress
      fs.writeFileSync(OVERRIDE_PATH, JSON.stringify(data, null, 2), 'utf8');
      console.log(`Saved progress back to local_vendors_override.json`);
    }

    // Delay between calls to respect rate limits (4 seconds)
    if (i < vendorsToProcess.length - 1) {
      console.log(`Waiting 4 seconds for rate limit compliance...`);
      await sleep(4000);
    }
  }

  console.log(`\n==================================================`);
  console.log(`Enrichment session finished!`);
  console.log(`Successfully enriched: ${successCount}/${vendorsToProcess.length} vendors.`);
};

run();
