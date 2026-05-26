const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemPrompt = `Bạn là trợ lý AI chuyên quét và chuyển đổi hình ảnh thực đơn nhà hàng (OCR) thành dữ liệu cấu trúc JSON chuẩn.
NHIỆM VỤ:
1. Đọc và nhận dạng tất cả các món ăn, đồ uống và giá tiền tương ứng từ hình ảnh thực đơn.
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

const downloadImageToBase64 = async (url) => {
  console.log(`🌐 Đang tải ảnh thực đơn từ URL: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Không thể tải ảnh từ URL: ${url}. Status code: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
};

const run = async () => {
  try {
    const imageUrl = "https://lh3.googleusercontent.com/p/AF1QipP0RfEngY0-q4sCEXG6rkx6Wh_dKaFRndb0FzAR=w1000"; // Fetch smaller size for fast upload
    const base64Data = await downloadImageToBase64(imageUrl);

    console.log('✨ Đang chạy Gemini AI Multimodal OCR...');
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    const responseText = result.response.text();
    console.log("Response text:");
    console.log(responseText);
  } catch (err) {
    console.error("Error:", err.message);
  }
};

run();
