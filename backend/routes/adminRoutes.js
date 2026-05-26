const express = require('express');
const router = express.Router();
const { updateVendorInfo, updateVendorMenu, scanMenuImage } = require('../controllers/adminController');

router.put('/vendors/:vendorId', updateVendorInfo);
router.patch('/vendors/:vendorId/menu', updateVendorMenu);
router.post('/vendors/:vendorId/scan-menu', scanMenuImage);

module.exports = router;
