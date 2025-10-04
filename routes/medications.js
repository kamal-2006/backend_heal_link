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
  getActiveMedications,
  getMyMedications,
  getMyActiveMedications,
  getMyMedicationReminders,
  updateMedicationReminders,
  addMedicationNote
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

// Patient-specific routes
router
  .route('/my')
  .get(protect, authorize('patient'), getMyMedications);

router
  .route('/my/active')
  .get(protect, authorize('patient'), getMyActiveMedications);

router
  .route('/my/reminders')
  .get(protect, authorize('patient'), getMyMedicationReminders);

// Status update route
router
  .route('/:id/status')
  .put(protect, authorize('admin', 'doctor', 'patient'), updateMedicationStatus);

// Patient medication management routes
router
  .route('/:id/reminders')
  .put(protect, authorize('patient'), updateMedicationReminders);

router
  .route('/:id/notes')
  .put(protect, authorize('patient'), addMedicationNote);

// Individual medication routes
router
  .route('/:id')
  .get(protect, authorize('admin', 'doctor', 'patient'), getMedication)
  .put(protect, authorize('admin', 'doctor'), updateMedication)
  .delete(protect, authorize('admin', 'doctor'), deleteMedication);

module.exports = router;