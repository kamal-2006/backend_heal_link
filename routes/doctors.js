const express = require('express');
const {
    getDoctors,
    getDoctor,
    getDoctorsBySpecialization,
    getAvailableDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor
} = require('../controllers/doctors');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getDoctors);
router.get('/available', getAvailableDoctors);
router.get('/specialization/:specialization', getDoctorsBySpecialization);
router.get('/:id', getDoctor);

// Doctor management routes (no auth required for admin features)
router.post('/', createDoctor);
router.put('/:id', updateDoctor);
router.delete('/:id', deleteDoctor);

// Debug route to test if middleware is being applied
router.post('/test', (req, res) => {
    res.json({ success: true, message: 'Test route works without auth' });
});

module.exports = router;