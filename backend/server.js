const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const { connectPg } = require('./config/pg');
const { passport, setupPassport } = require('./config/passport');

// Load biến môi trường
dotenv.config();

// Kết nối Database
connectDB();
// Kết nối Postgres/Supabase nếu được cấu hình
connectPg();

const app = express();

app.use(passport.initialize());
setupPassport();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
// Location pings from frontend (GPS)
app.use('/api/location', require('./routes/locationRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Health check
app.get('/api', (req, res) => {
  res.json({ message: 'HanoMate API đang chạy 🚀' });
});

// Serve frontend build in production
const clientBuildPath = path.join(__dirname, '../frontend/dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Khởi động server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server đang chạy trên port ${PORT}`);
  });
}

module.exports = app;
