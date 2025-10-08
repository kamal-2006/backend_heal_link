const express = require("express");
const {
  getAppointments,
  getAppointment,
  bookAppointment,
  updateAppointment,
  deleteAppointment,
  getPatientAppointments,
  cancelAppointment,
  getDoctorAvailability,
  updateExpiredAppointments,
  confirmAppointment
} = require('../controllers/appointments');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getAppointments);  // Now requires authentication

router
  .route('/book')
  .post(protect, authorize('patient', 'doctor', 'admin'), bookAppointment);

router
  .route('/patient/:id')
  .get(protect, authorize('patient', 'doctor', 'admin'), getPatientAppointments);

router
  .route('/:id')
  .get(protect, getAppointment)
  .put(protect, updateAppointment)
  .delete(protect, authorize('admin'), deleteAppointment);

router
  .route('/:id/cancel')
  .put(protect, authorize('patient', 'doctor', 'admin'), cancelAppointment);

router
  .route('/:id/confirm')
  .put(protect, authorize('doctor', 'admin'), confirmAppointment);

router
  .route('/update-status')
  .put(protect, authorize('admin'), updateExpiredAppointments);

// This route is placed in appointments.js but conceptually relates to doctors
router
  .route('/doctors/:id/availability')
  .get(protect, getDoctorAvailability);

module.exports = router;
