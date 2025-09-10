const express = require('express');
const {
  getFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} = require('../controllers/feedback');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router
  .route('/')
  .get(protect, getFeedbacks)
  .post(protect, createFeedback);

router
  .route('/:id')
  .get(protect, getFeedback)
  .put(protect, updateFeedback)
  .delete(protect, deleteFeedback);

module.exports = router;
