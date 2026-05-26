const { pool } = require('../config/pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'hanomate_secret_key_2026', {
    expiresIn: '30d',
  });
};

const socialLoginRedirect = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.redirect(`${CLIENT_URL}/?authError=missing_user`);
    }

    const token = generateToken(user.id);
    const redirectUrl = new URL(`${CLIENT_URL}/auth/callback`);
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('_id', user.id.toString());
    redirectUrl.searchParams.set('id', user.id.toString());
    redirectUrl.searchParams.set('name', user.name);
    redirectUrl.searchParams.set('email', user.email);
    redirectUrl.searchParams.set('avatar', user.avatar || '');
    redirectUrl.searchParams.set('provider', user.provider || 'social');
    redirectUrl.searchParams.set('role', user.role || 'buyer');
    redirectUrl.searchParams.set('vendor_id', user.vendor_id || '');

    res.redirect(redirectUrl.toString());
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi xử lý đăng nhập mạng xã hội', detail: error.message });
  }
};

// @desc    Đăng ký user mới
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const userRole = role === 'seller' ? 'seller' : 'buyer';

    // Check pool connection
    if (!pool) {
      return res.status(500).json({ error: 'Kết nối database Postgres chưa được thiết lập' });
    }

    // Check if email already exists in users or sellers table
    const checkEmail = await pool.query(
      'SELECT email FROM users WHERE email = $1 UNION SELECT email FROM sellers WHERE email = $1',
      [email]
    );
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A56DB&color=fff`;

    if (userRole === 'seller') {
      // 1. Insert into sellers table
      const insertRes = await pool.query(
        'INSERT INTO sellers (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, hashedPassword, defaultAvatar]
      );
      let seller = insertRes.rows[0];

      // 2. Automatically create a vendor profile
      const vendorId = 'v_' + crypto.randomBytes(4).toString('hex');
      const vendorName = `Cửa hàng của ${name}`;
      
      await pool.query(
        'INSERT INTO vendors (id, name, category, address, menu, rating, owner_id, longitude, latitude) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [vendorId, vendorName, 'Đồ ăn & Đồ uống', 'Khu CNC Hòa Lạc', JSON.stringify([]), 5.0, seller.id, 105.52522, 21.01354]
      );

      // 3. Update seller with vendor_id
      const updateSellerRes = await pool.query(
        'UPDATE sellers SET vendor_id = $1 WHERE id = $2 RETURNING *',
        [vendorId, seller.id]
      );
      seller = updateSellerRes.rows[0];

      return res.status(201).json({
        _id: seller.id,
        id: seller.id,
        name: seller.name,
        email: seller.email,
        avatar: seller.avatar,
        role: 'seller',
        vendor_id: seller.vendor_id || '',
        token: generateToken(seller.id),
      });
    } else {
      // Insert into users table (buyer)
      const insertRes = await pool.query(
        'INSERT INTO users (name, email, password, provider, avatar, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, email, hashedPassword, 'local', defaultAvatar, 'buyer']
      );
      const user = insertRes.rows[0];

      return res.status(201).json({
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: 'buyer',
        vendor_id: '',
        token: generateToken(user.id),
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Đăng nhập
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!pool) {
      return res.status(500).json({ error: 'Kết nối database Postgres chưa được thiết lập' });
    }

    // 1. Try to find in users (buyer)
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (checkUser.rows.length > 0) {
      const user = checkUser.rows[0];

      if (!user.password) {
        return res.status(400).json({ error: 'Tài khoản này được đăng ký bằng mạng xã hội. Vui lòng chọn đăng nhập bằng Google/Facebook.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }

      return res.json({
        _id: user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role || 'buyer',
        vendor_id: '',
        token: generateToken(user.id),
      });
    }

    // 2. Try to find in sellers
    const checkSeller = await pool.query('SELECT * FROM sellers WHERE email = $1', [email]);
    if (checkSeller.rows.length > 0) {
      const seller = checkSeller.rows[0];

      const isMatch = await bcrypt.compare(password, seller.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
      }

      return res.json({
        _id: seller.id,
        id: seller.id,
        name: seller.name,
        email: seller.email,
        avatar: seller.avatar,
        role: 'seller',
        vendor_id: seller.vendor_id || '',
        token: generateToken(seller.id),
      });
    }

    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Lấy thông tin user hiện tại
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }
    res.json({
      _id: req.user.id,
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      provider: req.user.provider,
      role: req.user.role,
      vendor_id: req.user.vendor_id || '',
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server', detail: error.message });
  }
};

// @desc    Mock/Real Social Login (Lưu vào Postgres)
// @route   POST /api/auth/social
// @access  Public
const socialAuth = async (req, res) => {
  try {
    const { provider, email, name, socialId, avatar } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Thiếu email để xác thực mạng xã hội' });
    }

    if (!pool) {
      return res.status(500).json({ error: 'Kết nối database Postgres chưa được thiết lập' });
    }

    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    const finalAvatar = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=1A56DB&color=fff`;

    if (checkUser.rows.length === 0) {
      // Create new user
      const insertRes = await pool.query(
        'INSERT INTO users (name, email, provider, social_id, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name || 'Mạng xã hội', email, provider || 'social', socialId || '', finalAvatar]
      );
      user = insertRes.rows[0];
    } else {
      // Update existing user with social info
      user = checkUser.rows[0];
      const updateRes = await pool.query(
        'UPDATE users SET provider = COALESCE($1, provider), social_id = COALESCE($2, social_id), avatar = COALESCE($3, avatar) WHERE id = $4 RETURNING *',
        [provider || user.provider, socialId || user.social_id, finalAvatar, user.id]
      );
      user = updateRes.rows[0];
    }

    res.json({
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role || 'buyer',
      vendor_id: user.vendor_id || '',
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi đăng nhập mạng xã hội', detail: error.message });
  }
};

module.exports = {
  register,
  login,
  getMe,
  socialAuth,
  socialLoginRedirect,
};
