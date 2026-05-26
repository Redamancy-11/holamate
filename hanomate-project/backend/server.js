const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const vendorRoutes = require('./routes/vendorRoutes');
const vendorRoutesFallback = require('./routes/vendorRoutesFallback');
// Mock AI routes for demo when Gemini key isn't available
const aiMockRoutes = require('./routes/aiMockRoutes');

const app = express();
const port = process.env.PORT || 4001;
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hanomate_project';

app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.json({ success: true, message: 'HanoMate Project Backend is running.' });
});

// Mount mock AI endpoint for Planner chat UI
app.use('/api/ai', aiMockRoutes);

const startServer = () => {
  app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
  });
};

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB:', mongoUri);
    app.use('/api/vendors', vendorRoutes);
    startServer();
  })
  .catch((err) => {
    console.warn('MongoDB connection error, falling back to JSON storage:', err.message);
    app.use('/api/vendors', vendorRoutesFallback);
    startServer();
  });
