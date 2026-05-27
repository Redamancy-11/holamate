const express = require('express');
const router = express.Router();
const { addPageReview, getRandomPageReviews } = require('../controllers/reviewController');

router.post('/', addPageReview);
router.get('/random', getRandomPageReviews);

module.exports = router;
