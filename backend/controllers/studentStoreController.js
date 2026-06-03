const { pool } = require('../config/pg');
const crypto = require('crypto');

// @desc    Get student store by owner user_id
// @route   GET /api/student-store/my
const getMyStore = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;

    const storeRes = await pool.query(
      'SELECT * FROM student_stores WHERE user_id = $1',
      [userId]
    );

    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Bạn chưa có cửa hàng sinh viên' });
    }

    const store = storeRes.rows[0];

    // Get menu items
    const menuRes = await pool.query(
      'SELECT * FROM student_store_menu WHERE store_id = $1 ORDER BY created_at ASC',
      [store.id]
    );

    return res.json({
      success: true,
      store: { ...store, menu: menuRes.rows }
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Update student store info
// @route   PUT /api/student-store/my
const updateMyStore = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;
    const { store_name, description, category, phone, address, operating_hours, longitude, latitude } = req.body;

    const updateRes = await pool.query(
      `UPDATE student_stores SET
        store_name = COALESCE($1, store_name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        phone = COALESCE($4, phone),
        address = COALESCE($5, address),
        operating_hours = COALESCE($6, operating_hours),
        longitude = COALESCE($7, longitude),
        latitude = COALESCE($8, latitude),
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $9 RETURNING *`,
      [store_name, description, category, phone, address, operating_hours, longitude, latitude, userId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }

    // Also update vendor name if exists
    const store = updateRes.rows[0];
    if (store.vendor_id) {
      await pool.query(
        'UPDATE vendors SET name = $1, category = $2, address = $3, longitude = $4, latitude = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6',
        [store_name || store.store_name, category || store.category, address || store.address, longitude || store.longitude, latitude || store.latitude, store.vendor_id]
      );
    }

    return res.json({ success: true, store: store });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Add menu item to student store
// @route   POST /api/student-store/menu
const addMenuItem = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;
    const { name, description, price, category, image } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Tên món và giá là bắt buộc' });
    }

    // Get store_id from user
    const storeRes = await pool.query('SELECT id, vendor_id FROM student_stores WHERE user_id = $1', [userId]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }

    const store = storeRes.rows[0];

    const insertRes = await pool.query(
      'INSERT INTO student_store_menu (store_id, name, description, price, category, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [store.id, name, description || '', parseInt(price), category || 'Món chính', image || null]
    );

    // Sync menu to vendors table for map display
    await syncMenuToVendor(store.id, store.vendor_id);

    return res.status(201).json({ success: true, item: insertRes.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Update a menu item
// @route   PUT /api/student-store/menu/:itemId
const updateMenuItem = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;
    const { itemId } = req.params;
    const { name, description, price, category, image, is_available } = req.body;

    // Verify ownership
    const storeRes = await pool.query('SELECT id, vendor_id FROM student_stores WHERE user_id = $1', [userId]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }
    const store = storeRes.rows[0];

    const updateRes = await pool.query(
      `UPDATE student_store_menu SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        category = COALESCE($4, category),
        image = COALESCE($5, image),
        is_available = COALESCE($6, is_available)
      WHERE id = $7 AND store_id = $8 RETURNING *`,
      [name, description, price ? parseInt(price) : null, category, image, is_available, itemId, store.id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy món ăn' });
    }

    await syncMenuToVendor(store.id, store.vendor_id);

    return res.json({ success: true, item: updateRes.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/student-store/menu/:itemId
const deleteMenuItem = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;
    const { itemId } = req.params;

    const storeRes = await pool.query('SELECT id, vendor_id FROM student_stores WHERE user_id = $1', [userId]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }
    const store = storeRes.rows[0];

    await pool.query('DELETE FROM student_store_menu WHERE id = $1 AND store_id = $2', [itemId, store.id]);

    await syncMenuToVendor(store.id, store.vendor_id);

    return res.json({ success: true, message: 'Đã xóa món ăn' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Get orders for student store
// @route   GET /api/student-store/orders
const getStoreOrders = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;

    const storeRes = await pool.query('SELECT vendor_id FROM student_stores WHERE user_id = $1', [userId]);
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }

    const vendorId = storeRes.rows[0].vendor_id;
    if (!vendorId) {
      return res.json({ success: true, orders: [] });
    }

    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 50',
      [vendorId]
    );

    return res.json({ success: true, orders: ordersRes.rows });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Update order status from student store
// @route   PUT /api/student-store/orders/:orderId/status
const updateStoreOrderStatus = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const userId = req.user.id;
    const { orderId } = req.params;
    const { status } = req.body;

    // Verify store ownership
    const storeRes = await pool.query('SELECT vendor_id FROM student_stores WHERE user_id = $1', [userId]);
    if (storeRes.rows.length === 0) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    const vendorId = storeRes.rows[0].vendor_id;

    const updateRes = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND vendor_id = $3 RETURNING *',
      [status, orderId, vendorId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    // Update store stats
    if (status === 'completed') {
      const order = updateRes.rows[0];
      const total = order.total_amount || 0;
      await pool.query(
        'UPDATE student_stores SET total_orders = total_orders + 1, total_revenue = total_revenue + $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [total, userId]
      );
    }

    return res.json({ success: true, order: updateRes.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// Helper: Sync student store menu to vendors.menu JSONB
const syncMenuToVendor = async (storeId, vendorId) => {
  if (!vendorId) return;
  try {
    const menuRes = await pool.query(
      'SELECT name, price, description FROM student_store_menu WHERE store_id = $1 AND is_available = TRUE ORDER BY created_at ASC',
      [storeId]
    );
    const menu = menuRes.rows.map(m => ({ name: m.name, price: m.price, description: m.description || '' }));
    await pool.query('UPDATE vendors SET menu = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [JSON.stringify(menu), vendorId]);
  } catch (err) {
    console.warn('Sync menu to vendor failed:', err.message);
  }
};

const getAllStudentStoresPublic = async (req, res) => {
  try {
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const result = await pool.query('SELECT * FROM student_stores ORDER BY created_at DESC');
    const stores = result.rows;
    
    // Fetch menus for each store
    for (let store of stores) {
      const menuRes = await pool.query('SELECT * FROM student_store_menu WHERE store_id = $1', [store.id]);
      store.menu = menuRes.rows;
    }
    
    res.json({ success: true, data: stores });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

const getStudentStorePublicById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) return res.status(500).json({ error: 'Database chưa kết nối' });
    const storeRes = await pool.query(
      'SELECT * FROM student_stores WHERE id = $1 OR vendor_id = $1',
      [id]
    );
    if (storeRes.rows.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng sinh viên' });
    }
    const store = storeRes.rows[0];
    const menuRes = await pool.query('SELECT * FROM student_store_menu WHERE store_id = $1', [store.id]);
    store.menu = menuRes.rows;
    res.json({ success: true, data: store });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

module.exports = {
  getMyStore,
  updateMyStore,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getStoreOrders,
  updateStoreOrderStatus,
  getAllStudentStoresPublic,
  getStudentStorePublicById,
};
