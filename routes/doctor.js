const express = require('express');
const {
  getDoctorProfile,
  updateDoctorProfile,
  getDoctors,
  getDoctor
} = require('../controllers/doctor');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.get('/me', protect, authorize('doctor'), getDoctorProfile);
router.put('/me', protect, authorize('doctor'), updateDoctorProfile);

// Public routes (require authentication but not doctor role)
router.get('/', protect, getDoctors);
router.get('/:id', protect, getDoctor);

module.exports = router;