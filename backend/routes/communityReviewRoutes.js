const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/auth');
const {
  createReview,
  getReviews,
  voteReview,
  reportReview
} = require('../controllers/communityReviewController');

// Public/optional auth list reviews
router.get('/', optionalProtect, getReviews);

// Protected actions
router.post('/', protect, createReview);
router.post('/:id/vote', protect, voteReview);
router.post('/:id/report', protect, reportReview);

module.exports = router;
