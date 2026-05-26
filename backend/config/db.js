const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.warn('MongoDB URI not provided; running with local fallback data only.');
    return;
  }

  try {
    const conn = await mongoose.connect(uri, {
      // Mongoose 6+ không cần các option cũ nữa
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed (it is okay to run without it for AI demo): ${error.message}`);
    // process.exit(1);
  }
};

module.exports = connectDB;
