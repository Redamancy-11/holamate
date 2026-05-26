const express = require('express');
const router = express.Router();
const { createReport, getReports } = require('../controllers/reportController');

// GET /api/reports
router.get('/', getReports);

// POST /api/reports
router.post('/', createReport);

module.exports = router;
