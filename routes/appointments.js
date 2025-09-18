const express = require('express');
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointments');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, authorize('patient', 'doctor'), getAppointments)
  .post(protect, authorize('patient', 'doctor'), createAppointment);

router
  .route('/:id')
  .get(protect, authorize('patient', 'doctor'), getAppointment)
  .put(protect, authorize('patient'), updateAppointment)
  .delete(protect, authorize('patient'), deleteAppointment);

module.exports = router;
