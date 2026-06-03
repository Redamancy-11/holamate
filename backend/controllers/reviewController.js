const { pool } = require('../config/pg');

// In-memory fallback database for sandboxed/isolated environments
const memoryReviews = [
  { id: 1, user_type: 'buyer', user_name: 'Tuấn Anh', rating: 5, comment: 'HolaMate cứu cánh mình mỗi kỳ học quân sự luôn! AI gợi ý các quán bún chả, cơm tấm siêu rẻ quanh Tân Xã mà đi bộ từ KTX cũng gần.', page_path: '/' },
  { id: 2, user_type: 'buyer', user_name: 'Khánh Linh', rating: 5, comment: 'Thích nhất tính năng gợi ý cafe học nhóm. Nhờ HolaMate mà mình biết đến Bay Coffee ở Tân Xã có view hồ siêu chill.', page_path: '/' },
  { id: 4, user_type: 'seller', user_name: 'Chủ Quán Bún Chả', rating: 5, comment: 'Doanh thu quán bún chả của tôi tăng vọt từ khi lên đối tác HolaMate. Giao diện quản lý đơn rất mượt và trực quan.', page_path: '/' }
];

// Helper to race query with a timeout
const queryWithTimeout = async (queryText, params, timeoutMs = 2000) => {
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Database query timeout')), timeoutMs)
  );
  const queryPromise = pool.query(queryText, params);
  return Promise.race([queryPromise, timeoutPromise]);
};

// Add a page review
const addPageReview = async (req, res) => {
  try {
    const { user_type, user_name, rating, comment, page_path } = req.body;

    if (!user_type || !comment) {
      return res.status(400).json({ error: 'Thiếu thông tin phân loại hoặc nội dung đánh giá' });
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Đánh giá sao phải từ 1 đến 5' });
    }

    const finalName = user_name || 'Người dùng ẩn danh';
    const finalRating = rating || 5;
    const finalPath = page_path || '/';

    let newReview;

    try {
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const result = await queryWithTimeout(
        'INSERT INTO page_reviews (user_type, user_name, rating, comment, page_path) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [user_type, finalName, finalRating, comment, finalPath]
      );
      newReview = result.rows[0];
      console.log('Successfully saved page review to Postgres.');
    } catch (dbErr) {
      console.warn('Database query failed or timed out, saving review to in-memory fallback:', dbErr.message);
      newReview = {
        id: memoryReviews.length + 1,
        user_type,
        user_name: finalName,
        rating: finalRating,
        comment,
        page_path: finalPath,
        created_at: new Date().toISOString()
      };
      memoryReviews.push(newReview);
    }

    res.status(201).json({ success: true, review: newReview });
  } catch (error) {
    console.error('Add page review error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Helper to filter out negative reviews
const isPositiveReview = (r) => {
  if (r.rating !== undefined && r.rating < 4) return false;
  const comment = (r.comment || '').toLowerCase();
  const negativeKeywords = [
    'tệ', 'chán', 'lỗi', 'hỏng', 'không tốt', 'đắt', 'chậm', 'kém', 
    'app lag', 'lag', 'rác', 'lừa đảo', 'phí tiền', 'thất vọng', 'kém chất lượng'
  ];
  return !negativeKeywords.some(keyword => comment.includes(keyword));
};

// Get random reviews for homepage
const getRandomPageReviews = async (req, res) => {
  try {
    let buyerReviews = [];
    let sellerReviews = [];

    try {
      if (!pool) {
        throw new Error('Database pool not initialized');
      }

      const buyerRes = await queryWithTimeout(
        "SELECT * FROM page_reviews WHERE user_type = 'buyer' AND rating >= 4 ORDER BY RANDOM() LIMIT 20",
        []
      );
      buyerReviews = buyerRes.rows.filter(isPositiveReview).slice(0, 6);

      const sellerRes = await queryWithTimeout(
        "SELECT * FROM page_reviews WHERE user_type = 'seller' AND rating >= 4 ORDER BY RANDOM() LIMIT 20",
        []
      );
      sellerReviews = sellerRes.rows.filter(isPositiveReview).slice(0, 6);

      console.log(`Fetched positive reviews from Postgres (Buyers: ${buyerReviews.length}, Sellers: ${sellerReviews.length})`);
    } catch (dbErr) {
      console.warn('Database query failed or timed out, retrieving positive reviews from in-memory fallback:', dbErr.message);
      // Filter from in-memory database
      const memoryBuyers = memoryReviews.filter(r => r.user_type === 'buyer').filter(isPositiveReview);
      const memorySellers = memoryReviews.filter(r => r.user_type === 'seller').filter(isPositiveReview);
      
      // Shuffle helper
      const shuffle = arr => arr.sort(() => 0.5 - Math.random());
      
      buyerReviews = shuffle(memoryBuyers).slice(0, 6);
      sellerReviews = shuffle(memorySellers).slice(0, 6);
    }

    res.json({
      success: true,
      buyerReviews,
      sellerReviews
    });
  } catch (error) {
    console.error('Get random reviews error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

module.exports = {
  addPageReview,
  getRandomPageReviews
};
