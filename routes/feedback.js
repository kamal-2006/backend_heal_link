const express = require('express');
const {
  getFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats
} = require('../controllers/feedback');

const router = express.Router();

const { protect } = require('../middleware/auth');

router
  .route('/')
  .get(getFeedbackStats)
  .post(protect, createFeedback);

router
  .route('/stats')
  .get(getFeedbackStats);

router
  .route('/admin')
  .get(protect, getFeedbacks);

router
  .route('/:id')
  .get(protect, getFeedback)
  .put(protect, updateFeedback)
  .delete(protect, deleteFeedback);

module.exports = router;
