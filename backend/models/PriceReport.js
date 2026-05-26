const mongoose = require('mongoose');

const priceReportSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    itemName: {
      type: String,
      required: [true, 'Vui lòng nhập tên sản phẩm/dịch vụ'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Vui lòng nhập giá'],
    },
    currency: {
      type: String,
      default: 'VND',
    },
    reportedBy: {
      type: String, // Có thể thay bằng ObjectId ref User nếu có hệ thống user
      default: 'anonymous',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PriceReport', priceReportSchema);
