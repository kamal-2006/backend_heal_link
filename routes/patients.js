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
  updatePatientSettings
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
  .route('/dashboard')
  .get(protect, authorize('patient'), getPatientDashboard);

// General routes (admin/doctor access)
router
  .route('/')
  .get(protect, getPatients)
  .post(protect, createPatient);

router
  .route('/:id')
  .get(protect, getPatient)
  .put(protect, updatePatient)
  .delete(protect, deletePatient);

module.exports = router;