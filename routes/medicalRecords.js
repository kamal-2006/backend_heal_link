const express = require('express');
const {
  getMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  uploadMedicalRecordFile,
  downloadMedicalRecord
} = require('../controllers/medicalRecords');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');

// Protect all routes
router.use(protect);

// Routes for all users (with appropriate authorization)
router.route('/')
  .get(getMedicalRecords);

router.route('/:id')
  .get(getMedicalRecord);

// Routes for doctors and admins only
router.route('/')
  .post(authorize('doctor', 'admin'), createMedicalRecord);

router.route('/:id')
  .put(authorize('doctor', 'admin'), updateMedicalRecord)
  .delete(authorize('doctor', 'admin'), deleteMedicalRecord);

// File upload and download routes
router.route('/:id/upload')
  .put(authorize('doctor', 'admin'), uploadMedicalRecordFile);

router.route('/:id/download')
  .get(downloadMedicalRecord);

module.exports = router;