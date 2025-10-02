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

// Protected routes
router.post('/', protect, authorize('admin'), createDoctor);
router.put('/:id', protect, authorize('doctor', 'admin'), updateDoctor);
router.delete('/:id', protect, authorize('admin'), deleteDoctor);

module.exports = router;