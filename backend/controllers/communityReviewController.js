const { pool } = require('../config/pg');

// Create a review
const createReview = async (req, res) => {
  try {
    const {
      review_type,
      vendor_id,
      student_store_id,
      dish_name,
      rating,
      content,
      images,
      is_anonymous
    } = req.body;

    const userId = req.user.id;

    if (!review_type || !content || !rating) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (loại review, đánh giá hoặc nội dung)' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Đánh giá phải từ 1 đến 5 sao' });
    }

    // Set default status: reviews with images go to 'pending' for moderation
    const hasImages = Array.isArray(images) && images.length > 0;
    const status = hasImages ? 'pending' : 'approved';

    const query = `
      INSERT INTO community_reviews (
        user_id, review_type, vendor_id, student_store_id, dish_name,
        rating, content, images, is_anonymous, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const params = [
      userId,
      review_type,
      review_type === 'vendor' || (review_type === 'dish' && vendor_id) ? vendor_id : null,
      review_type === 'student_store' || (review_type === 'dish' && student_store_id) ? student_store_id : null,
      review_type === 'dish' ? dish_name : null,
      rating,
      content,
      JSON.stringify(images || []),
      is_anonymous || false,
      status
    ];

    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    const result = await pool.query(query, params);
    res.status(201).json({
      success: true,
      message: hasImages ? 'Review đã được gửi và đang chờ kiểm duyệt ảnh.' : 'Đăng review thành công.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create community review error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Get reviews (with filters)
const getReviews = async (req, res) => {
  try {
    const { vendor_id, student_store_id, dish_name, type, status } = req.query;
    const userId = req.user ? req.user.id : null;

    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    // Admins can see all status, normal users see approved + their own pending
    let statusFilter = "status = 'approved'";
    if (req.user && req.user.is_admin) {
      statusFilter = status ? "status = $6" : "status IN ('approved', 'pending', 'hidden')";
    } else if (userId) {
      statusFilter = "(status = 'approved' OR user_id = $6)";
    }

    const query = `
      SELECT 
        r.*,
        CASE WHEN r.is_anonymous THEN 'Người dùng ẩn danh' ELSE u.name END as reviewer_name,
        CASE WHEN r.is_anonymous THEN 'https://ui-avatars.com/api/?name=An+Danh&background=6B7280&color=fff' ELSE u.avatar END as reviewer_avatar,
        COALESCE((SELECT AVG(rating) FROM review_votes WHERE review_id = r.id), 0)::float as average_vote,
        COALESCE((SELECT COUNT(*) FROM review_votes WHERE review_id = r.id), 0)::integer as total_votes,
        (SELECT rating FROM review_votes WHERE review_id = r.id AND user_id = $1) as user_vote,
        (SELECT COUNT(*) FROM review_reports WHERE review_id = r.id)::integer as reports_count
      FROM community_reviews r
      JOIN users u ON r.user_id = u.id
      WHERE ${statusFilter}
        AND ($2::text IS NULL OR r.vendor_id = $2)
        AND ($3::uuid IS NULL OR r.student_store_id = $3)
        AND ($4::text IS NULL OR r.dish_name ILIKE $4)
        AND ($5::text IS NULL OR r.review_type = $5)
        AND ($6::uuid IS NULL OR 1=1)
      ORDER BY r.created_at DESC;
    `;

    const params = [
      userId,
      vendor_id || null,
      student_store_id || null,
      dish_name ? `%${dish_name}%` : null,
      type || null,
      userId // sets the $6 value for status filtering
    ];

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get community reviews error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Vote review usefulness (1-5 stars)
const voteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Đánh giá hữu ích phải từ 1 đến 5 sao' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    // Check if review exists
    const checkReview = await pool.query('SELECT * FROM community_reviews WHERE id = $1', [id]);
    if (checkReview.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy review' });
    }

    // Upsert vote
    const query = `
      INSERT INTO review_votes (review_id, user_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (review_id, user_id)
      DO UPDATE SET rating = EXCLUDED.rating
      RETURNING *;
    `;
    const result = await pool.query(query, [id, userId, rating]);

    // Recalculate stats for response
    const statsRes = await pool.query(`
      SELECT 
        COALESCE(AVG(rating), 0)::float as average_vote,
        COUNT(*)::integer as total_votes
      FROM review_votes
      WHERE review_id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã vote mức độ hữu ích!',
      data: {
        vote: result.rows[0],
        average_vote: statsRes.rows[0].average_vote,
        total_votes: statsRes.rows[0].total_votes
      }
    });
  } catch (error) {
    console.error('Vote review error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Report review
const reportReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    if (!reason) {
      return res.status(400).json({ error: 'Thiếu lý do báo cáo review' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    // Check if review exists
    const checkReview = await pool.query('SELECT * FROM community_reviews WHERE id = $1', [id]);
    if (checkReview.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy review để báo cáo' });
    }

    // Check if already reported by this user
    const checkReport = await pool.query('SELECT * FROM review_reports WHERE review_id = $1 AND user_id = $2', [id, userId]);
    if (checkReport.rows.length > 0) {
      return res.status(400).json({ error: 'Bạn đã báo cáo đánh giá này rồi' });
    }

    const query = `
      INSERT INTO review_reports (review_id, user_id, reason, description)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await pool.query(query, [id, userId, reason, description || '']);

    res.status(201).json({
      success: true,
      message: 'Báo cáo vi phạm đã được gửi tới quản trị viên.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Report review error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Admin: Get all reviews (including pending/reports)
const adminGetReviews = async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    const query = `
      SELECT 
        r.*,
        u.name as reviewer_name,
        u.email as reviewer_email,
        (SELECT COUNT(*) FROM review_votes WHERE review_id = r.id)::integer as total_votes,
        (SELECT COUNT(*) FROM review_reports WHERE review_id = r.id)::integer as reports_count
      FROM community_reviews r
      JOIN users u ON r.user_id = u.id
      ORDER BY reports_count DESC, r.created_at DESC;
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Admin get reviews error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Admin: Get reports for a specific review
const adminGetReviewReports = async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    const query = `
      SELECT 
        rep.*,
        u.name as reporter_name,
        u.email as reporter_email
      FROM review_reports rep
      JOIN users u ON rep.user_id = u.id
      WHERE rep.review_id = $1
      ORDER BY rep.created_at DESC;
    `;
    const result = await pool.query(query, [id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Admin get review reports error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Admin: Moderate review (approve/hide/delete)
const adminModerateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'hidden', 'deleted'

    if (!status || !['approved', 'hidden', 'deleted'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái kiểm duyệt không hợp lệ' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Database pool chưa được thiết lập' });
    }

    if (status === 'deleted') {
      await pool.query('DELETE FROM community_reviews WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Đã xóa review vĩnh viễn.' });
    }

    const query = `
      UPDATE community_reviews
      SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy review' });
    }

    // If resolved, mark related reports as resolved
    await pool.query(
      "UPDATE review_reports SET status = $1 WHERE review_id = $2",
      [status === 'approved' ? 'resolved_keep' : 'resolved_hide', id]
    );

    res.json({
      success: true,
      message: `Đã cập nhật trạng thái review thành: ${status === 'approved' ? 'Đã duyệt' : 'Đã ẩn'}.`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Admin moderate review error:', error.message);
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

module.exports = {
  createReview,
  getReviews,
  voteReview,
  reportReview,
  adminGetReviews,
  adminGetReviewReports,
  adminModerateReview
};
