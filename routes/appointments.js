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
  confirmAppointment,
  getAppointmentsNeedingFeedback,
  markAppointmentCompleted
} = require('../controllers/appointments');

const { bulkSwapAppointments } = require('../controllers/bulkSwap');

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

router
  .route('/feedback-needed/:patientId')
  .get(protect, authorize('patient'), getAppointmentsNeedingFeedback);

router
  .route('/:id/complete')
  .put(protect, authorize('doctor', 'admin'), markAppointmentCompleted);

// This route is placed in appointments.js but conceptually relates to doctors
router
  .route('/doctors/:id/availability')
  .get(protect, getDoctorAvailability);

router
  .route('/bulk-swap')
  .post(protect, authorize('doctor', 'admin'), bulkSwapAppointments);

module.exports = router;
