const express = require('express');
const {
  register,
  login,
  getMe,
  googleLogin,
  updateRole,
  logout
} = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/google', googleLogin);
router.put('/update-role', protect, updateRole);
router.get('/me', protect, getMe);

module.exports = router;
