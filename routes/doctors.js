const express = require('express');
const {
    getDoctors,
    getDoctor,
    getDoctorsBySpecialization,
    getAvailableDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    getDoctorProfile,
    updateDoctorProfile,
    getDoctorDashboardData
} = require('../controllers/doctors');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getDoctors);
router.get('/available', getAvailableDoctors);
router.get('/specialization/:specialization', getDoctorsBySpecialization);

// Doctor profile routes
router.route('/me').get(protect, authorize('doctor'), getDoctorProfile);
router.route('/me').put(protect, authorize('doctor'), updateDoctorProfile);

router.get('/:id', getDoctor);

router.route('/dashboard-data').get(protect, authorize('doctor'), getDoctorDashboardData);

// Doctor management routes (no auth required for admin features)
router.post('/', createDoctor);
router.put('/:id', updateDoctor);
router.delete('/:id', deleteDoctor);

// Debug route to test if middleware is being applied
router.post('/test', (req, res) => {
    res.json({ success: true, message: 'Test route works without auth' });
});

module.exports = router;