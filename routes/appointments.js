const express = require('express');
const {
  getAppointments,
  getAppointment,
  bookAppointment,
  updateAppointment,
  deleteAppointment,
  getPatientAppointments,
  cancelAppointment,
  getDoctorAvailability
} = require('../controllers/appointments');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, authorize('patient', 'doctor', 'admin'), getAppointments);

router
  .route('/book')
  .post(protect, authorize('patient', 'doctor', 'admin'), bookAppointment);

router
  .route('/patient/:id')
  .get(protect, authorize('patient', 'doctor', 'admin'), getPatientAppointments);

router
  .route('/:id')
  .get(protect, authorize('patient', 'doctor', 'admin'), getAppointment)
  .put(protect, authorize('patient', 'doctor', 'admin'), updateAppointment)
  .delete(protect, authorize('admin'), deleteAppointment);

router
  .route('/:id/cancel')
  .put(protect, authorize('patient', 'doctor', 'admin'), cancelAppointment);

// This route is placed in appointments.js but conceptually relates to doctors
router
  .route('/doctors/:id/availability')
  .get(protect, getDoctorAvailability);

module.exports = router;
