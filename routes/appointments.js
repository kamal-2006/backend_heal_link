const express = require('express');
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointments');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router
  .route('/')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router
  .route('/:id')
  .get(protect, getAppointment)
  .put(protect, updateAppointment)
  .delete(protect, deleteAppointment);

module.exports = router;
