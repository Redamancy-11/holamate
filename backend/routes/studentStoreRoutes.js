const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMyStore,
  updateMyStore,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getStoreOrders,
  updateStoreOrderStatus,
} = require('../controllers/studentStoreController');

// All routes require authentication
router.use(protect);

// Store info
router.get('/my', getMyStore);
router.put('/my', updateMyStore);

// Menu management
router.post('/menu', addMenuItem);
router.put('/menu/:itemId', updateMenuItem);
router.delete('/menu/:itemId', deleteMenuItem);

// Orders
router.get('/orders', getStoreOrders);
router.put('/orders/:orderId/status', updateStoreOrderStatus);

module.exports = router;
