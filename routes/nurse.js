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
    getNurseDashboard,
    getAssignedAppointments,
    getAllAppointments,
    getAllPatients,
    addMedicalReport,
    getMedicalReports
} = require('../controllers/nurse');

const { protect, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// Apply protect and authorize middleware to all routes
router.use(protect);
router.use(authorize('nurse'));

// Nurse profile and dashboard
router.get('/profile', getNurseProfile);
router.get('/dashboard', getNurseDashboard);
router.get('/dashboard-data', getNurseDashboard); // Alias for consistency with other dashboards

// Appointment routes
router.get('/appointments', getAssignedAppointments);
router.get('/appointments/all', getAllAppointments);

// Patient routes
router.get('/patients', getAssignedPatients);
router.get('/patients/all', getAllPatients);
router.get('/patients/:id', getPatientDetails);

// Medical reports routes
router.post('/reports', addMedicalReport);
router.get('/reports', getMedicalReports);
router.post('/reports/upload', uploadSingle, uploadPatientReport);
router.get('/patients/:id/reports', getPatientReports);

// Medication routes
router.post('/medications', addPatientMedication);
router.get('/patients/:id/medications', getPatientMedications);
router.put('/medications/:id', updateMedicationStatus);

module.exports = router;
