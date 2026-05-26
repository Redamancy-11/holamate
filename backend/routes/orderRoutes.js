const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getOrders,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { protect, optionalProtect } = require('../middleware/auth');

// Buyer places an order (optionalProtect so guest checkout still works, but customer_id is saved if logged in)
router.post('/', optionalProtect, createOrder);

// Buyer gets their own order history (must be logged in)
router.get('/my', protect, getMyOrders);

// Seller gets orders for their vendor (must be logged in as seller)
router.get('/seller', protect, getSellerOrders);

// Get all orders with optional filters (vendorId, sellerId) — for admin/debug
router.get('/', getOrders);

// Get a single order by ID
router.get('/:id', getOrderById);

// Update order status (with auth: seller can progress, buyer can cancel pending)
router.put('/:id/status', optionalProtect, updateOrderStatus);

module.exports = router;
