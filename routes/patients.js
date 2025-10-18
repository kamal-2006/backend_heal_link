const express = require('express');
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
  getMyProfile,
  updateMyProfile,
  getPatientDashboard,
  updatePatientSettings,
  getNotificationPreferences,
  updateNotificationPreferences,
  getAllPatientsForAdmin,
  getPatientDetailsForAdmin,
  updatePatientForAdmin,
  deletePatientForAdmin,
  getPatientDashboardData
} = require('../controllers/patients');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Patient-specific routes (must be authenticated as patient)
router
  .route('/me')
  .get(protect, authorize('patient'), getMyProfile)
  .put(protect, authorize('patient'), updateMyProfile);

router
  .route('/me/settings')
  .put(protect, authorize('patient'), updatePatientSettings);

router
  .route('/me/notifications')
  .get(protect, authorize('patient'), getNotificationPreferences)
  .put(protect, authorize('patient'), updateNotificationPreferences);

router
  .route('/dashboard')
  .get(protect, authorize('patient'), getPatientDashboard);

router
  .route('/dashboard-data')
  .get(protect, authorize('patient'), getPatientDashboardData);

// Doctor routes - Allow doctors to access patient data
router
  .route('/')
  .get(protect, authorize('doctor', 'admin'), getPatients);

// Admin routes (no authentication required) - MUST come before /:id routes
router
  .route('/admin/patients')
  .get(getAllPatientsForAdmin);

router
  .route('/admin/patients/:id')
  .get(getPatientDetailsForAdmin)
  .put(updatePatientForAdmin)
  .delete(deletePatientForAdmin);

// General routes (admin/doctor access)
router
  .route('/')
  .get(protect, authorize('doctor', 'admin'), getPatients)
  .post(protect, createPatient);

router
  .route('/:id')
  .get(protect, getPatient)
  .put(protect, updatePatient)
  .delete(protect, deletePatient);

module.exports = router;