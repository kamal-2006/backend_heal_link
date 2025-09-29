const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getMedications,
  getMedication,
  createMedication,
  updateMedication,
  deleteMedication,
  updateMedicationStatus,
  getActiveMedications
} = require('../controllers/medications');

// Base routes
router
  .route('/')
  .get(protect, authorize('admin', 'doctor', 'patient'), getMedications)
  .post(protect, authorize('admin', 'doctor'), createMedication);

// Active medications route
router
  .route('/active')
  .get(protect, authorize('admin', 'doctor', 'patient'), getActiveMedications);

// Status update route
router
  .route('/:id/status')
  .put(protect, authorize('admin', 'doctor', 'patient'), updateMedicationStatus);

// Individual medication routes
router
  .route('/:id')
  .get(protect, authorize('admin', 'doctor', 'patient'), getMedication)
  .put(protect, authorize('admin', 'doctor'), updateMedication)
  .delete(protect, authorize('admin', 'doctor'), deleteMedication);

module.exports = router;