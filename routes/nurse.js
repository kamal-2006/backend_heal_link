const express = require('express');
const router = express.Router();
const {
    getNurseProfile,
    getAssignedPatients,
    getPatientDetails,
    uploadPatientReport,
    getPatientReports,
    addPatientMedication,
    getPatientMedications,
    updateMedicationStatus,
    getNurseDashboard
} = require('../controllers/nurse');

const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// Apply protect and authorize middleware to all routes
router.use(protect);
router.use(authorize('nurse'));

// Nurse profile and dashboard
router.get('/profile', getNurseProfile);
router.get('/dashboard', getNurseDashboard);

// Patient routes
router.get('/patients', getAssignedPatients);
router.get('/patients/:id', getPatientDetails);

// Medical reports routes
router.post('/reports', uploadSingle, uploadPatientReport);
router.get('/patients/:id/reports', getPatientReports);

// Medication routes
router.post('/medications', addPatientMedication);
router.get('/patients/:id/medications', getPatientMedications);
router.put('/medications/:id', updateMedicationStatus);

module.exports = router;
