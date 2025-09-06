const express = require('express');
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patients');

const router = express.Router();

router
  .route('/')
  .get(getPatients)
  .post(createPatient);

router
  .route('/:id')
  .get(getPatient)
  .put(updatePatient)
  .delete(deletePatient);

module.exports = router;
