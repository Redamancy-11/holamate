const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    items: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    customerName: {
      type: String,
      required: [true, 'Vui lòng nhập tên người nhận'],
    },
    customerPhone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại'],
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Vui lòng nhập địa chỉ giao hàng (ví dụ: Phòng 302 Dom A)'],
    },
    status: {
      type: String,
      enum: ['pending', 'preparing', 'delivering', 'completed', 'cancelled'],
      default: 'pending',
    },
    customerNote: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
