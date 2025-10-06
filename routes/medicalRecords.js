const express = require('express');
const {
  getMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  uploadMedicalRecordFile,
  downloadMedicalRecord,
  patientUploadReport,
  getPatientOwnRecords,
  updatePatientOwnRecord,
  deletePatientOwnRecord
} = require('../controllers/medicalRecords');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple, handleUploadError } = require('../middleware/upload');

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

// Patient-specific routes
router.route('/patient/upload')
  .post(authorize('patient'), uploadMultiple, handleUploadError, patientUploadReport);

router.route('/patient/my-records')
  .get(authorize('patient'), getPatientOwnRecords);

router.route('/patient/:id')
  .put(authorize('patient'), updatePatientOwnRecord)
  .delete(authorize('patient'), deletePatientOwnRecord);

module.exports = router;