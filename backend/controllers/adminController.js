const { pool } = require('../config/pg');

// Update vendor general info
const updateVendorInfo = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name, category, address, district, hours, rating, longitude, latitude, tags, tips, phone, note } = req.body;

    const selectQuery = 'SELECT * FROM vendors WHERE id = $1 LIMIT 1;';
    const selectRes = await pool.query(selectQuery, [vendorId]);

    if (!selectRes.rows.length) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cửa hàng' });
    }

    const current = selectRes.rows[0];

    const updateQuery = `
      UPDATE vendors
      SET 
        name = $1, 
        category = $2, 
        address = $3, 
        district = $4, 
        hours = $5, 
        rating = $6, 
        longitude = $7, 
        latitude = $8, 
        tags = $9, 
        tips = $10,
        phone = $11,
        note = $12,
        updated_at = now()
      WHERE id = $13
      RETURNING *;
    `;

    const params = [
      name !== undefined ? name : current.name,
      category !== undefined ? category : current.category,
      address !== undefined ? address : current.address,
      district !== undefined ? district : current.district,
      hours !== undefined ? hours : current.hours,
      rating !== undefined ? parseFloat(rating) : current.rating,
      longitude !== undefined ? parseFloat(longitude) : current.longitude,
      latitude !== undefined ? parseFloat(latitude) : current.latitude,
      tags !== undefined ? JSON.stringify(tags) : JSON.stringify(current.tags || []),
      tips !== undefined ? tips : current.tips,
      phone !== undefined ? phone : current.phone,
      note !== undefined ? note : current.note,
      vendorId
    ];

    const result = await pool.query(updateQuery, params);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating vendor details:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update vendor menu items
const updateVendorMenu = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { menu } = req.body; // Array: [{"name": "...", "price": ...}]

    if (!Array.isArray(menu)) {
      return res.status(400).json({ success: false, error: 'Thực đơn phải là một danh sách các món ăn' });
    }

    // Double check price format
    const validatedMenu = menu.map(item => ({
      name: item.name,
      price: parseInt(item.price) || 0
    }));

    const updateQuery = `
      UPDATE vendors
      SET menu = $1, updated_at = now()
      WHERE id = $2
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, [JSON.stringify(validatedMenu), vendorId]);

    if (!result.rows.length) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cửa hàng để cập nhật thực đơn' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating vendor menu:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Scan menu image using Gemini Multimodal AI
const scanMenuImage = async (req, res) => {
  try {
    const { imageBase64: reqBase64, imageUrl, mimeType = 'image/jpeg' } = req.body;

    let base64Data = '';
    if (imageUrl) {
      console.log('Downloading image from URL:', imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(400).json({ success: false, error: 'Không thể tải ảnh từ URL cung cấp' });
      }
      const arrayBuffer = await response.arrayBuffer();
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    } else if (reqBase64) {
      // Remove base64 data URL prefix if present (e.g. data:image/jpeg;base64,...)
      base64Data = reqBase64.replace(/^data:image\/\w+;base64,/, '');
    } else {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp file ảnh hoặc URL ảnh thực đơn' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Gemini API key chưa được cấu hình ở backend' });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

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
    console.log('Gemini raw response:', responseText);

    let parsedMenu = [];
    try {
      parsedMenu = JSON.parse(responseText.trim());
    } catch (parseError) {
      // Fallback: try to find JSON block in output if responseMimeType didn't completely clean it
      const match = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) {
        parsedMenu = JSON.parse(match[0]);
      } else {
        throw new Error('Gemini output could not be parsed as JSON: ' + responseText);
      }
    }

    res.json({ success: true, menu: parsedMenu });
  } catch (error) {
    console.error('Error scanning menu image:', error);
    res.status(500).json({ success: false, error: 'Quét thực đơn bằng AI thất bại: ' + error.message });
  }
};

module.exports = {
  updateVendorInfo,
  updateVendorMenu,
  scanMenuImage
};
