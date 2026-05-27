const { pool } = require('../config/pg');
const { getVendorById } = require('../services/vendorService');
const crypto = require('crypto');

// Helper: format a DB row into a consistent API response
const formatOrder = (row) => ({
  _id: row.id,
  vendor: row.vendor_id,
  vendorName: row.vendor_name,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  deliveryAddress: row.delivery_address,
  items: row.items,
  totalAmount: row.total_amount,
  status: row.status,
  customerNote: row.customer_note,
  sellerNote: row.seller_note,
  customerId: row.customer_id,
  sellerId: row.seller_id,
  deliveryLongitude: row.delivery_longitude ? Number(row.delivery_longitude) : null,
  deliveryLatitude: row.delivery_latitude ? Number(row.delivery_latitude) : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// Create a new order
const createOrder = async (req, res) => {
  try {
    const { vendorId, items, customerName, customerPhone, deliveryAddress, customerNote, deliveryLongitude, deliveryLatitude } = req.body;

    if (!vendorId || !items || !items.length || !customerName || !customerPhone || !deliveryAddress) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin đơn hàng' });
    }

    const vendor = await getVendorById(vendorId);
    if (!vendor) {
      return res.status(404).json({ error: 'Không tìm thấy cửa hàng' });
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = items.map(item => {
      totalAmount += item.price * item.quantity;
      return {
        name: item.name,
        price: item.price,
        quantity: item.quantity
      };
    });

    const orderId = 'ord_' + crypto.randomBytes(4).toString('hex');
    const customerId = req.user ? req.user.id : null;

    // Resolve seller_id from vendor's owner_id
    let sellerId = null;
    if (vendor.owner_id) {
      sellerId = vendor.owner_id;
    } else {
      // Fallback: look up from DB
      try {
        const vendorRow = await pool.query('SELECT owner_id FROM vendors WHERE id = $1', [vendorId]);
        if (vendorRow.rows.length > 0 && vendorRow.rows[0].owner_id) {
          sellerId = vendorRow.rows[0].owner_id;
        }
      } catch (e) {
        // non-critical, continue without seller_id
      }
    }

    // Fetch commission_rate from Postgres vendors table (fallback to 10.0)
    let commissionRate = 10.0;
    try {
      const vRes = await pool.query('SELECT commission_rate FROM vendors WHERE id = $1', [vendorId]);
      if (vRes.rows.length > 0 && vRes.rows[0].commission_rate !== null) {
        commissionRate = parseFloat(vRes.rows[0].commission_rate);
      }
    } catch (e) {
      console.warn('Error fetching commission rate for order:', e.message);
    }
    const commissionAmount = Math.round(totalAmount * (commissionRate / 100));

    const query = `
      INSERT INTO orders (id, vendor_id, vendor_name, customer_name, customer_phone, delivery_address, items, total_amount, status, customer_note, customer_id, seller_id, delivery_longitude, delivery_latitude, commission_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *;
    `;
    const params = [
      orderId,
      vendorId,
      vendor.name,
      customerName,
      customerPhone,
      deliveryAddress,
      JSON.stringify(orderItems),
      totalAmount,
      'pending',
      customerNote || '',
      customerId,
      sellerId,
      deliveryLongitude !== undefined ? parseFloat(deliveryLongitude) : null,
      deliveryLatitude !== undefined ? parseFloat(deliveryLatitude) : null,
      commissionAmount
    ];

    const result = await pool.query(query, params);
    res.status(201).json(formatOrder(result.rows[0]));
  } catch (error) {
    console.error('Error creating order in Postgres:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get order details by ID
const getOrderById = async (req, res) => {
  try {
    const query = 'SELECT * FROM orders WHERE id = $1 LIMIT 1;';
    const result = await pool.query(query, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    res.json(formatOrder(result.rows[0]));
  } catch (error) {
    console.error('Error fetching order by ID:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get all orders (supports filtering by vendorId or sellerId)
const getOrders = async (req, res) => {
  try {
    const { vendorId, sellerId, includeHidden } = req.query;
    let query = 'SELECT * FROM orders';
    const params = [];
    const conditions = [];

    if (vendorId) {
      conditions.push(`vendor_id = $${params.length + 1}`);
      params.push(vendorId);
    }
    if (sellerId) {
      conditions.push(`seller_id = $${params.length + 1}`);
      params.push(sellerId);
    }
    if (includeHidden !== 'true') {
      conditions.push('seller_hidden = FALSE');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC;';

    const result = await pool.query(query, params);
    res.json(result.rows.map(formatOrder));
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get orders for the currently logged-in buyer
const getMyOrders = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để xem lịch sử đơn hàng' });
    }

    const query = 'SELECT * FROM orders WHERE customer_id = $1 AND buyer_hidden = FALSE ORDER BY created_at DESC;';
    const result = await pool.query(query, [req.user.id]);
    res.json(result.rows.map(formatOrder));
  } catch (error) {
    console.error('Error fetching buyer orders:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Get orders for the currently logged-in seller (via their vendor)
const getSellerOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để xem đơn hàng' });
    }
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Chỉ tài khoản người bán mới có quyền xem đơn hàng cửa hàng' });
    }

    const vendorId = req.user.vendor_id;
    if (!vendorId) {
      return res.json([]);
    }

    const { includeHidden } = req.query;
    let query = 'SELECT * FROM orders WHERE (vendor_id = $1 OR seller_id = $2)';
    if (includeHidden !== 'true') {
      query += ' AND seller_hidden = FALSE';
    }
    query += ' ORDER BY created_at DESC;';

    const result = await pool.query(query, [vendorId, req.user.id]);
    res.json(result.rows.map(formatOrder));
  } catch (error) {
    console.error('Error fetching seller orders:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Update order status (only seller who owns the vendor, or the buyer who placed it for cancellation)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, sellerNote } = req.body;
    const validStatuses = ['pending', 'preparing', 'delivering', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Trạng thái không hợp lệ. Các trạng thái hợp lệ: ${validStatuses.join(', ')}` });
    }

    // Fetch the order first
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!orderResult.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    const order = orderResult.rows[0];

    // Authorization check
    if (req.user) {
      const isSeller = req.user.role === 'seller' && (
        req.user.vendor_id === order.vendor_id ||
        req.user.id === order.seller_id
      );
      const isBuyer = req.user.id === order.customer_id;

      if (!isSeller && !isBuyer) {
        return res.status(403).json({ error: 'Bạn không có quyền cập nhật trạng thái đơn hàng này' });
      }

      // Buyers can only cancel pending orders
      if (isBuyer && !isSeller) {
        if (status !== 'cancelled') {
          return res.status(403).json({ error: 'Người mua chỉ có thể hủy đơn hàng' });
        }
        if (order.status !== 'pending') {
          return res.status(400).json({ error: 'Chỉ có thể hủy đơn hàng đang chờ xử lý' });
        }
      }
    }

    let query;
    let params;
    if (sellerNote !== undefined) {
      query = `
        UPDATE orders 
        SET status = $1, seller_note = $2, updated_at = now() 
        WHERE id = $3 
        RETURNING *;
      `;
      params = [status, sellerNote, req.params.id];
    } else {
      query = `
        UPDATE orders 
        SET status = $1, updated_at = now() 
        WHERE id = $2 
        RETURNING *;
      `;
      params = [status, req.params.id];
    }
    const result = await pool.query(query, params);
    res.json(formatOrder(result.rows[0]));
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Soft delete / Hide order from history
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để ẩn đơn hàng' });
    }

    // Fetch order to verify ownership
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (!orderResult.rows.length) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    const order = orderResult.rows[0];
    const isSeller = req.user.role === 'seller' && (
      req.user.vendor_id === order.vendor_id ||
      req.user.id === order.seller_id
    );
    const isBuyer = req.user.id === order.customer_id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: 'Bạn không có quyền ẩn đơn hàng này' });
    }

    if (isSeller) {
      await pool.query('UPDATE orders SET seller_hidden = TRUE, updated_at = now() WHERE id = $1', [id]);
    } else {
      await pool.query('UPDATE orders SET buyer_hidden = TRUE, updated_at = now() WHERE id = $1', [id]);
    }

    res.json({ success: true, message: 'Đã ẩn đơn hàng khỏi lịch sử' });
  } catch (error) {
    console.error('Error hiding order:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// Bulk hide completed/cancelled orders for a seller
const bulkHideOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Bạn cần đăng nhập để dọn dẹp lịch sử' });
    }
    if (req.user.role !== 'seller') {
      return res.status(403).json({ error: 'Chỉ tài khoản người bán mới có quyền ẩn lịch sử đơn hàng' });
    }

    const vendorId = req.user.vendor_id;
    if (!vendorId) {
      return res.status(400).json({ error: 'Tài khoản chưa được liên kết với cửa hàng nào' });
    }

    const { range } = req.body;
    let intervalStr;
    switch (range) {
      case '3h':
        intervalStr = '3 hours';
        break;
      case 'day':
        intervalStr = '24 hours';
        break;
      case 'week':
        intervalStr = '7 days';
        break;
      case 'month':
        intervalStr = '30 days';
        break;
      default:
        return res.status(400).json({ error: 'Khoảng thời gian không hợp lệ. Phải là 3h, day, week, hoặc month' });
    }

    const query = `
      UPDATE orders 
      SET seller_hidden = TRUE, updated_at = now() 
      WHERE (vendor_id = $1 OR seller_id = $2)
        AND status IN ('completed', 'cancelled')
        AND created_at >= now() - $3::INTERVAL;
    `;

    const result = await pool.query(query, [vendorId, req.user.id, intervalStr]);
    res.json({ success: true, count: result.rowCount, message: `Đã dọn dẹp ${result.rowCount} đơn hàng hoàn thành/đã hủy.` });
  } catch (error) {
    console.error('Error in bulkHideOrders:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  deleteOrder,
  bulkHideOrders
};
