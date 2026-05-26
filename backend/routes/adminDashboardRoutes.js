const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  requireAdmin,
  getDashboardStats,
  getAllUsers,
  updateUser,
  deleteUser,
  getAllSellers,
  updateSeller,
  deleteSeller,
  getAllVendorsAdmin,
  updateVendorAdmin,
  deleteVendorAdmin,
  getAllOrdersAdmin,
  updateOrderAdmin,
  getFinanceOverview,
  updateCommissionRate,
  adminLogin
} = require('../controllers/adminDashboardController');

// Admin login (no protect needed)
router.post('/login', adminLogin);

// All routes below require authentication + admin role
router.use(protect);
router.use(requireAdmin);

// Dashboard overview
router.get('/dashboard/stats', getDashboardStats);

// User management
router.get('/dashboard/users', getAllUsers);
router.put('/dashboard/users/:userId', updateUser);
router.delete('/dashboard/users/:userId', deleteUser);

// Seller management
router.get('/dashboard/sellers', getAllSellers);
router.put('/dashboard/sellers/:sellerId', updateSeller);
router.delete('/dashboard/sellers/:sellerId', deleteSeller);

// Vendor management
router.get('/dashboard/vendors', getAllVendorsAdmin);
router.put('/dashboard/vendors/:vendorId', updateVendorAdmin);
router.delete('/dashboard/vendors/:vendorId', deleteVendorAdmin);

// Order management
router.get('/dashboard/orders', getAllOrdersAdmin);
router.put('/dashboard/orders/:orderId', updateOrderAdmin);

// Finance
router.get('/dashboard/finance', getFinanceOverview);
router.put('/dashboard/finance/commission/:vendorId', updateCommissionRate);

module.exports = router;
