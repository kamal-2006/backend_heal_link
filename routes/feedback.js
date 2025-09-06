const express = require('express');
const {
  getFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} = require('../controllers/feedback');

const router = express.Router();

router
  .route('/')
  .get(getFeedbacks)
  .post(createFeedback);

router
  .route('/:id')
  .get(getFeedback)
  .put(updateFeedback)
  .delete(deleteFeedback);

module.exports = router;
