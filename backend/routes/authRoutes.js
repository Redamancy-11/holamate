const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { passport } = require('../config/passport');
const { pool } = require('../config/pg');
const { register, login, getMe, socialAuth, socialLoginRedirect } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

router.post('/register', register);
router.post('/login', login);
router.post('/social', socialAuth);

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const facebookEnabled = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
const instagramEnabled = Boolean(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET);

if (googleEnabled) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/' }), socialLoginRedirect);
} else {
  // Mock Google Redirect Flow to log in directly
  router.get('/google', async (req, res) => {
    try {
      if (!pool) {
        return res.status(500).json({ error: 'Kết nối database Postgres chưa được thiết lập' });
      }
      
      const name = 'Anh Tuấn Google';
      const email = 'anhtuan.google@gmail.com';
      const provider = 'google';
      const socialId = 'google_mock_123456';
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EA4335&color=fff`;

      const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      let user;

      if (checkUser.rows.length === 0) {
        const insertRes = await pool.query(
          'INSERT INTO users (name, email, provider, social_id, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [name, email, provider, socialId, avatar]
        );
        user = insertRes.rows[0];
      } else {
        user = checkUser.rows[0];
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'hanomate_secret_key_2026', { expiresIn: '30d' });
      const redirectUrl = new URL(`${CLIENT_URL}/auth/callback`);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('_id', user.id.toString());
      redirectUrl.searchParams.set('id', user.id.toString());
      redirectUrl.searchParams.set('name', user.name);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('avatar', user.avatar || '');
      redirectUrl.searchParams.set('provider', user.provider);
      redirectUrl.searchParams.set('role', user.role || 'buyer');
      redirectUrl.searchParams.set('vendor_id', user.vendor_id || '');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(500).json({ error: 'Lỗi server khi đăng nhập giả lập Google', detail: error.message });
    }
  });

  router.get('/google/callback', (req, res) => res.status(200).json({ message: 'Callback giả lập hoạt động trực tiếp trên route /google' }));
}

if (facebookEnabled) {
  router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
  router.get('/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/' }), socialLoginRedirect);
} else {
  // Mock Facebook Redirect Flow
  router.get('/facebook', async (req, res) => {
    try {
      if (!pool) {
        return res.status(500).json({ error: 'Kết nối database Postgres chưa được thiết lập' });
      }

      const name = 'Anh Tuấn Facebook';
      const email = 'anhtuan.facebook@gmail.com';
      const provider = 'facebook';
      const socialId = 'facebook_mock_123456';
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877F2&color=fff`;

      const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      let user;

      if (checkUser.rows.length === 0) {
        const insertRes = await pool.query(
          'INSERT INTO users (name, email, provider, social_id, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [name, email, provider, socialId, avatar]
        );
        user = insertRes.rows[0];
      } else {
        user = checkUser.rows[0];
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'hanomate_secret_key_2026', { expiresIn: '30d' });
      const redirectUrl = new URL(`${CLIENT_URL}/auth/callback`);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('_id', user.id.toString());
      redirectUrl.searchParams.set('id', user.id.toString());
      redirectUrl.searchParams.set('name', user.name);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('avatar', user.avatar || '');
      redirectUrl.searchParams.set('provider', user.provider);
      redirectUrl.searchParams.set('role', user.role || 'buyer');
      redirectUrl.searchParams.set('vendor_id', user.vendor_id || '');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(500).json({ error: 'Lỗi server khi đăng nhập giả lập Facebook', detail: error.message });
    }
  });

  router.get('/facebook/callback', (req, res) => res.status(200).json({ message: 'Callback giả lập hoạt động trực tiếp trên route /facebook' }));
}

if (instagramEnabled) {
  router.get('/instagram', passport.authenticate('instagram', { scope: ['user_profile'] }));
  router.get('/instagram/callback', passport.authenticate('instagram', { session: false, failureRedirect: '/' }), socialLoginRedirect);
} else {
  // Mock Instagram Redirect Flow
  router.get('/instagram', async (req, res) => {
    try {
      if (!pool) {
        return res.status(500).json({ error: 'Kết nối database Postgres chưa được thiết lập' });
      }

      const name = 'Anh Tuấn Instagram';
      const email = 'anhtuan.instagram@gmail.com';
      const provider = 'instagram';
      const socialId = 'instagram_mock_123456';
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C13584&color=fff`;

      const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      let user;

      if (checkUser.rows.length === 0) {
        const insertRes = await pool.query(
          'INSERT INTO users (name, email, provider, social_id, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [name, email, provider, socialId, avatar]
        );
        user = insertRes.rows[0];
      } else {
        user = checkUser.rows[0];
      }

      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'hanomate_secret_key_2026', { expiresIn: '30d' });
      const redirectUrl = new URL(`${CLIENT_URL}/auth/callback`);
      redirectUrl.searchParams.set('token', token);
      redirectUrl.searchParams.set('_id', user.id.toString());
      redirectUrl.searchParams.set('id', user.id.toString());
      redirectUrl.searchParams.set('name', user.name);
      redirectUrl.searchParams.set('email', user.email);
      redirectUrl.searchParams.set('avatar', user.avatar || '');
      redirectUrl.searchParams.set('provider', user.provider);
      redirectUrl.searchParams.set('role', user.role || 'buyer');
      redirectUrl.searchParams.set('vendor_id', user.vendor_id || '');

      res.redirect(redirectUrl.toString());
    } catch (error) {
      res.status(500).json({ error: 'Lỗi server khi đăng nhập giả lập Instagram', detail: error.message });
    }
  });

  router.get('/instagram/callback', (req, res) => res.status(200).json({ message: 'Callback giả lập hoạt động trực tiếp trên route /instagram' }));
}

router.get('/me', protect, getMe);

module.exports = router;
