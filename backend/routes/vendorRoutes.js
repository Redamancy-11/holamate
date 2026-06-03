const express = require('express');
const router = express.Router();
const { getAllVendors, getVendorById } = require('../services/vendorService');
const { protect } = require('../middleware/auth');
const { pool } = require('../config/pg');

// GET /api/vendors?search=...
router.get('/', async (req, res) => {
  try {
    const search = req.query.search || '';
    const vendors = await getAllVendors(search);
    res.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Vendor Routes Error:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách vendor.' });
  }
});

// GET /api/vendors/:id
router.get('/:id', async (req, res) => {
  try {
    const vendor = await getVendorById(req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor không tìm thấy.' });
    res.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Vendor Route By ID Error:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy vendor.' });
  }
});

// PUT /api/vendors/:id
// @desc    Cập nhật thông tin cửa hàng và thực đơn (chỉ dành cho seller sở hữu)
// @access  Private (Seller only)
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, address, phone, note, menu, coords } = req.body;

    if (req.user.role !== 'seller') {
      return res.status(403).json({ success: false, message: 'Chỉ tài khoản người bán mới có quyền sửa đổi thông tin cửa hàng.' });
    }

    if (req.user.vendor_id !== id) {
      return res.status(403).json({ success: false, message: 'Bạn không sở hữu cửa hàng này.' });
    }

    if (!pool) {
      return res.status(500).json({ success: false, message: 'Kết nối database Postgres chưa được thiết lập.' });
    }

    const checkVendor = await pool.query('SELECT * FROM vendors WHERE id = $1', [id]);
    if (checkVendor.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy cửa hàng trong database.' });
    }

    const query = `
      UPDATE vendors
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          address = COALESCE($3, address),
          phone = COALESCE($4, phone),
          note = COALESCE($5, note),
          menu = COALESCE($6, menu),
          longitude = COALESCE($7, longitude),
          latitude = COALESCE($8, latitude),
          updated_at = now()
      WHERE id = $9
      RETURNING *;
    `;

    const params = [
      name !== undefined ? name : null,
      category !== undefined ? category : null,
      address !== undefined ? address : null,
      phone !== undefined ? phone : null,
      note !== undefined ? note : null,
      menu !== undefined ? JSON.stringify(menu) : null,
      (coords && Array.isArray(coords) && coords[0] !== undefined) ? Number(coords[0]) : null,
      (coords && Array.isArray(coords) && coords[1] !== undefined) ? Number(coords[1]) : null,
      id
    ];

    const result = await pool.query(query, params);
    const r = result.rows[0];

    const updatedVendor = {
      id: r.id,
      name: r.name,
      category: r.category,
      address: r.address,
      district: r.district,
      hours: r.hours,
      rating: r.rating,
      coords: r.longitude && r.latitude ? [Number(r.longitude), Number(r.latitude)] : [],
      tags: r.tags,
      tips: r.tips,
      menu: typeof r.menu === 'string' ? JSON.parse(r.menu) : (r.menu || []),
      phone: r.phone,
      note: r.note
    };

    res.json({ success: true, message: 'Cập nhật cửa hàng thành công.', data: updatedVendor });
  } catch (error) {
    console.error('Error updating vendor:', error.message);
    res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật cửa hàng.', detail: error.message });
  }
});

module.exports = router;
