const express = require('express');
const {
  getFeedbacks,
  getFeedback,
  createFeedback,
  updateFeedback,
  deleteFeedback,
  getPatientFeedbackHistory,
  getAppointmentsForFeedback,
} = require('../controllers/feedback');

const router = express.Router();

const { protect } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getFeedbacks)
  .post(protect, createFeedback);

router
  .route('/patient/history')
  .get(protect, getPatientFeedbackHistory);

router
  .route('/patient/appointments')
  .get(protect, getAppointmentsForFeedback);

router
  .route('/:id')
  .get(protect, getFeedback)
  .put(protect, updateFeedback)
  .delete(protect, deleteFeedback);

module.exports = router;
