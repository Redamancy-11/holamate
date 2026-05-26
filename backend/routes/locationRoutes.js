const express = require('express');
const router = express.Router();
const { receiveLocation, detectIpLocation } = require('../controllers/locationController');
const { optionalProtect } = require('../middleware/auth');

// GET /api/location/detect-ip
router.get('/detect-ip', detectIpLocation);

// POST /api/location
router.post('/', optionalProtect, receiveLocation);

module.exports = router;
