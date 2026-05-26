const { pool } = require('../config/pg');
const crypto = require('crypto');

// ===================== MIDDLEWARE =====================
const requireAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập' });
  }
  // Check if user is admin (from users table with is_admin = true)
  if (!req.user.is_admin) {
    return res.status(403).json({ error: 'Bạn không có quyền Admin' });
  }
  next();
};

// ===================== DASHBOARD OVERVIEW =====================
const getDashboardStats = async (req, res) => {
  try {
    // Total users (buyers)
    const usersRes = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersRes.rows[0].count);

    // Total sellers
    const sellersRes = await pool.query('SELECT COUNT(*) as count FROM sellers');
    const totalSellers = parseInt(sellersRes.rows[0].count);

    // Total vendors
    const vendorsRes = await pool.query('SELECT COUNT(*) as count FROM vendors');
    const totalVendors = parseInt(vendorsRes.rows[0].count);

    // Order stats
    const ordersRes = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'preparing') as preparing,
        COUNT(*) FILTER (WHERE status = 'delivering') as delivering,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
        COALESCE(SUM(commission_amount) FILTER (WHERE status = 'completed'), 0) as total_commission
      FROM orders
    `);
    const orderStats = ordersRes.rows[0];

    // Revenue last 30 days (daily breakdown)
    const revenueByDay = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as revenue
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // New users last 30 days
    const newUsersRes = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const newUsers30d = parseInt(newUsersRes.rows[0].count);

    // New sellers last 30 days
    const newSellersRes = await pool.query(`
      SELECT COUNT(*) as count FROM sellers WHERE created_at >= NOW() - INTERVAL '30 days'
    `);
    const newSellers30d = parseInt(newSellersRes.rows[0].count);

    // Top vendors by revenue
    const topVendors = await pool.query(`
      SELECT 
        v.id, v.name, v.category, v.address,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'completed'), 0) as revenue
      FROM vendors v
      LEFT JOIN orders o ON o.vendor_id = v.id
      GROUP BY v.id, v.name, v.category, v.address
      ORDER BY revenue DESC
      LIMIT 10
    `);

    res.json({
      users: { total: totalUsers, new30d: newUsers30d },
      sellers: { total: totalSellers, new30d: newSellers30d },
      vendors: { total: totalVendors },
      orders: {
        total: parseInt(orderStats.total),
        completed: parseInt(orderStats.completed),
        cancelled: parseInt(orderStats.cancelled),
        pending: parseInt(orderStats.pending),
        preparing: parseInt(orderStats.preparing),
        delivering: parseInt(orderStats.delivering),
        totalRevenue: parseInt(orderStats.total_revenue),
        totalCommission: parseInt(orderStats.total_commission)
      },
      revenueByDay: revenueByDay.rows.map(r => ({
        date: r.date,
        orders: parseInt(r.orders),
        revenue: parseInt(r.revenue)
      })),
      topVendors: topVendors.rows.map(v => ({
        id: v.id,
        name: v.name,
        category: v.category,
        address: v.address,
        orderCount: parseInt(v.order_count),
        revenue: parseInt(v.revenue)
      }))
    });
  } catch (error) {
    console.error('Admin getDashboardStats error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===================== USER MANAGEMENT =====================
const getAllUsers = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT id, name, email, avatar, provider, role, is_admin, created_at FROM users';
    const params = [];
    if (search) {
      query += ' WHERE (name ILIKE $1 OR email ILIKE $1)';
      params.push(`%${search}%`);
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) FROM users';
    const countParams = [];
    if (search) {
      countQuery += ' WHERE (name ILIKE $1 OR email ILIKE $1)';
      countParams.push(`%${search}%`);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin getAllUsers error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, is_admin } = req.body;

    const result = await pool.query(`
      UPDATE users 
      SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), is_admin = COALESCE($4, is_admin)
      WHERE id = $5 
      RETURNING id, name, email, avatar, provider, role, is_admin, created_at
    `, [name, email, role, is_admin, userId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Admin updateUser error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    res.json({ success: true, message: 'Đã xóa người dùng' });
  } catch (error) {
    console.error('Admin deleteUser error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===================== SELLER MANAGEMENT =====================
const getAllSellers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT s.id, s.name, s.email, s.avatar, s.vendor_id, s.phone, s.created_at,
             v.name as vendor_name, v.category as vendor_category, v.address as vendor_address,
             v.status as vendor_status, v.commission_rate
      FROM sellers s
      LEFT JOIN vendors v ON s.vendor_id = v.id
    `;
    const params = [];
    if (search) {
      query += ' WHERE (s.name ILIKE $1 OR s.email ILIKE $1 OR v.name ILIKE $1)';
      params.push(`%${search}%`);
    }
    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ sellers: result.rows });
  } catch (error) {
    console.error('Admin getAllSellers error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { name, email, phone } = req.body;

    const result = await pool.query(`
      UPDATE sellers 
      SET name = COALESCE($1, name), email = COALESCE($2, email), phone = COALESCE($3, phone)
      WHERE id = $4 
      RETURNING *
    `, [name, email, phone, sellerId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy người bán' });
    }

    res.json({ success: true, seller: result.rows[0] });
  } catch (error) {
    console.error('Admin updateSeller error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const deleteSeller = async (req, res) => {
  try {
    const { sellerId } = req.params;
    // Also clean up vendor
    const seller = await pool.query('SELECT vendor_id FROM sellers WHERE id = $1', [sellerId]);
    if (seller.rows.length && seller.rows[0].vendor_id) {
      await pool.query('DELETE FROM vendors WHERE id = $1', [seller.rows[0].vendor_id]);
    }
    await pool.query('DELETE FROM sellers WHERE id = $1', [sellerId]);
    res.json({ success: true, message: 'Đã xóa người bán và cửa hàng liên kết' });
  } catch (error) {
    console.error('Admin deleteSeller error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===================== VENDOR MANAGEMENT =====================
const getAllVendorsAdmin = async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = `
      SELECT v.*, s.name as owner_name, s.email as owner_email,
        (SELECT COUNT(*) FROM orders WHERE vendor_id = v.id) as order_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE vendor_id = v.id AND status = 'completed') as revenue
      FROM vendors v
      LEFT JOIN sellers s ON v.owner_id = s.id
    `;
    const params = [];
    const conditions = [];
    if (search) {
      conditions.push(`(v.name ILIKE $${params.length + 1} OR v.address ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (category) {
      conditions.push(`v.category ILIKE $${params.length + 1}`);
      params.push(`%${category}%`);
    }
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY v.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      vendors: result.rows.map(v => ({
        ...v,
        order_count: parseInt(v.order_count),
        revenue: parseInt(v.revenue),
        menu: v.menu || []
      }))
    });
  } catch (error) {
    console.error('Admin getAllVendorsAdmin error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateVendorAdmin = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { name, category, address, phone, note, status, commission_rate } = req.body;

    const result = await pool.query(`
      UPDATE vendors 
      SET name = COALESCE($1, name), 
          category = COALESCE($2, category), 
          address = COALESCE($3, address),
          phone = COALESCE($4, phone),
          note = COALESCE($5, note),
          status = COALESCE($6, status),
          commission_rate = COALESCE($7, commission_rate),
          updated_at = now()
      WHERE id = $8
      RETURNING *
    `, [name, category, address, phone, note, status, commission_rate, vendorId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }

    res.json({ success: true, vendor: result.rows[0] });
  } catch (error) {
    console.error('Admin updateVendorAdmin error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const deleteVendorAdmin = async (req, res) => {
  try {
    const { vendorId } = req.params;
    // Clear seller's vendor_id reference
    await pool.query('UPDATE sellers SET vendor_id = NULL WHERE vendor_id = $1', [vendorId]);
    await pool.query('DELETE FROM vendors WHERE id = $1', [vendorId]);
    res.json({ success: true, message: 'Đã xóa cửa hàng' });
  } catch (error) {
    console.error('Admin deleteVendorAdmin error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===================== ORDER MANAGEMENT =====================
const getAllOrdersAdmin = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (search) {
      conditions.push(`(customer_name ILIKE $${params.length + 1} OR customer_phone ILIKE $${params.length + 1} OR id ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (conditions.length) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Count
    let countQuery = 'SELECT COUNT(*) FROM orders';
    const countParams = [];
    const countConditions = [];
    if (status && status !== 'all') {
      countConditions.push(`status = $${countParams.length + 1}`);
      countParams.push(status);
    }
    if (search) {
      countConditions.push(`(customer_name ILIKE $${countParams.length + 1} OR customer_phone ILIKE $${countParams.length + 1} OR id ILIKE $${countParams.length + 1})`);
      countParams.push(`%${search}%`);
    }
    if (countConditions.length) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      orders: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Admin getAllOrdersAdmin error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateOrderAdmin = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, seller_note } = req.body;

    const result = await pool.query(`
      UPDATE orders 
      SET status = COALESCE($1, status),
          seller_note = COALESCE($2, seller_note),
          updated_at = now()
      WHERE id = $3 
      RETURNING *
    `, [status, seller_note, orderId]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (error) {
    console.error('Admin updateOrderAdmin error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===================== FINANCE =====================
const getFinanceOverview = async (req, res) => {
  try {
    const revenueRes = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(commission_amount), 0) as total_commission,
        COUNT(*) as completed_orders
      FROM orders 
      WHERE status = 'completed'
    `);

    const vendorRevenues = await pool.query(`
      SELECT 
        v.id, v.name, v.commission_rate,
        COALESCE(SUM(o.total_amount), 0) as revenue,
        COALESCE(SUM(o.commission_amount), 0) as commission,
        COUNT(o.id) as order_count
      FROM vendors v
      LEFT JOIN orders o ON o.vendor_id = v.id AND o.status = 'completed'
      GROUP BY v.id, v.name, v.commission_rate
      HAVING COUNT(o.id) > 0
      ORDER BY revenue DESC
    `);

    res.json({
      overview: {
        totalRevenue: parseInt(revenueRes.rows[0].total_revenue),
        totalCommission: parseInt(revenueRes.rows[0].total_commission),
        completedOrders: parseInt(revenueRes.rows[0].completed_orders)
      },
      vendorRevenues: vendorRevenues.rows.map(v => ({
        id: v.id,
        name: v.name,
        commissionRate: v.commission_rate,
        revenue: parseInt(v.revenue),
        commission: parseInt(v.commission),
        orderCount: parseInt(v.order_count)
      }))
    });
  } catch (error) {
    console.error('Admin getFinanceOverview error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

const updateCommissionRate = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { commission_rate } = req.body;

    if (commission_rate === undefined || commission_rate < 0 || commission_rate > 100) {
      return res.status(400).json({ error: 'Tỉ lệ hoa hồng phải từ 0% đến 100%' });
    }

    const result = await pool.query(
      'UPDATE vendors SET commission_rate = $1, updated_at = now() WHERE id = $2 RETURNING id, name, commission_rate',
      [commission_rate, vendorId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }

    res.json({ success: true, vendor: result.rows[0] });
  } catch (error) {
    console.error('Admin updateCommissionRate error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ===================== ADMIN LOGIN =====================
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');

    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND is_admin = TRUE', [email]);
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Tài khoản Admin không tồn tại' });
    }

    const user = result.rows[0];
    if (!user.password) {
      return res.status(400).json({ error: 'Tài khoản này không có mật khẩu. Hãy liên hệ Super Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email hoặc mật khẩu Admin không đúng' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'hanomate_secret_key_2026', { expiresIn: '7d' });

    res.json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: 'admin',
      is_admin: true,
      token
    });
  } catch (error) {
    console.error('Admin login error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  requireAdmin,
  getDashboardStats,
  getAllUsers,
  updateUser,
  deleteUser,
  getAllSellers,
  updateSeller,
  deleteSeller,
  getAllVendorsAdmin,
  updateVendorAdmin,
  deleteVendorAdmin,
  getAllOrdersAdmin,
  updateOrderAdmin,
  getFinanceOverview,
  updateCommissionRate,
  adminLogin
};
