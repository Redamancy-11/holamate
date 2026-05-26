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

    const query = `
      INSERT INTO orders (id, vendor_id, vendor_name, customer_name, customer_phone, delivery_address, items, total_amount, status, customer_note, customer_id, seller_id, delivery_longitude, delivery_latitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      deliveryLatitude !== undefined ? parseFloat(deliveryLatitude) : null
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
    const { vendorId, sellerId } = req.query;
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

    const query = 'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC;';
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

    // Query by vendor_id OR seller_id to catch all orders
    const query = 'SELECT * FROM orders WHERE vendor_id = $1 OR seller_id = $2 ORDER BY created_at DESC;';
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
    const { status } = req.body;
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

    const query = `
      UPDATE orders 
      SET status = $1, updated_at = now() 
      WHERE id = $2 
      RETURNING *;
    `;
    const result = await pool.query(query, [status, req.params.id]);
    res.json(formatOrder(result.rows[0]));
  } catch (error) {
    console.error('Error updating order status:', error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getOrders,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus
};
