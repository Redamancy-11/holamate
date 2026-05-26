const express = require('express');
const router = express.Router();

// Simple non-streaming mock chat endpoint
router.post('/chat', (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Vui lòng nhập tin nhắn' });

  const reply = `🔎 (Mock AI) Tôi nhận được: "${message}". Đây là câu trả lời demo: Hãy thử hỏi tôi về "Tour 2 tiếng quanh Hồ Hoàn Kiếm" hoặc "Phở ngon ở Hà Nội".`;
  res.json({ reply });
});

module.exports = router;
