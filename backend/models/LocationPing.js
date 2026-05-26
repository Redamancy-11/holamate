const mongoose = require('mongoose');

const LocationPingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  coords: { type: [Number], required: true }, // [lng, lat]
  accuracy: { type: Number },
  timestamp: { type: Date, default: Date.now },
  source: { type: String, default: 'browser' },
  provider: { type: String, default: 'unknown' },
  address: { type: String },
  placeName: { type: String },
  district: { type: String },
  city: { type: String },
  country: { type: String },
  raw: { type: mongoose.Schema.Types.Mixed },
  userAgent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('LocationPing', LocationPingSchema);
