const jwt = require('jsonwebtoken');
const { pool } = require('../config/pg');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Không có quyền truy cập (Missing token)' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hanomate_secret_key_2026');
    
    let user = null;

    if (!pool) {
      return res.status(500).json({ error: 'Kết nối database chưa được thiết lập' });
    }

    const resUser = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    if (resUser.rows.length > 0) {
      user = resUser.rows[0];
      user.role = user.role || 'buyer';
    } else {
      const resSeller = await pool.query('SELECT * FROM sellers WHERE id = $1', [decoded.id]);
      if (resSeller.rows.length > 0) {
        user = resSeller.rows[0];
        user.role = 'seller';
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Không tìm thấy người dùng trên hệ thống' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Protect middleware token validation error:', error);
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hanomate_secret_key_2026');
    let user = null;

    if (pool) {
      const resUser = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      if (resUser.rows.length > 0) {
        user = resUser.rows[0];
        user.role = user.role || 'buyer';
      } else {
        const resSeller = await pool.query('SELECT * FROM sellers WHERE id = $1', [decoded.id]);
        if (resSeller.rows.length > 0) {
          user = resSeller.rows[0];
          user.role = 'seller';
        }
      }
    }

    req.user = user;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = { protect, optionalProtect };
