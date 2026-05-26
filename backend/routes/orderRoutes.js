const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrderById,
  getOrders,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  deleteOrder,
  bulkHideOrders
} = require('../controllers/orderController');
const { protect, optionalProtect } = require('../middleware/auth');

// Buyer places an order (optionalProtect so guest checkout still works, but customer_id is saved if logged in)
router.post('/', optionalProtect, createOrder);

// Buyer gets their own order history (must be logged in)
router.get('/my', protect, getMyOrders);

// Seller gets orders for their vendor (must be logged in as seller)
router.get('/seller', protect, getSellerOrders);

// Bulk hide completed/cancelled orders for a seller
router.post('/bulk-hide', protect, bulkHideOrders);

// Get all orders with optional filters (vendorId, sellerId) — for admin/debug
router.get('/', getOrders);

// Get a single order by ID
router.get('/:id', getOrderById);

// Update order status (with auth: seller can progress, buyer can cancel pending)
router.put('/:id/status', optionalProtect, updateOrderStatus);

// Soft delete / hide order from history (requires login)
router.delete('/:id', protect, deleteOrder);

module.exports = router;
