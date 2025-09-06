const express = require('express');
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointments');

const router = express.Router();

router
  .route('/')
  .get(getAppointments)
  .post(createAppointment);

router
  .route('/:id')
  .get(getAppointment)
  .put(updateAppointment)
  .delete(deleteAppointment);

module.exports = router;
