const express = require('express');
const {
  register,
  login,
  getMe,
  googleLogin,
  updateRole,
  logout,
  changePassword,
  enable2FA,
  disable2FA,
  verify2FA,
  get2FAStatus,
  checkDefaultPassword
} = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/google', googleLogin);
router.put('/update-role', protect, updateRole);
router.put('/changepassword', protect, changePassword);
router.get('/check-default-password', protect, checkDefaultPassword);
router.get('/me', protect, getMe);

// 2FA routes
router.post('/2fa/enable', protect, enable2FA);
router.post('/2fa/disable', protect, disable2FA);
router.post('/2fa/verify', protect, verify2FA);
router.get('/2fa/status', protect, get2FAStatus);

module.exports = router;
