const express = require('express');
const router = express.Router();
const { getAllNursesForAdmin } = require('../controllers/adminNurse');

// Public route for admin to get all nurses
router.get('/all', getAllNursesForAdmin);

module.exports = router;
