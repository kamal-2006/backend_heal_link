const express = require('express');
const {
  getPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patients');

const router = express.Router();

const { protect } = require('../middlewares/auth');

router
  .route('/')
  .get(protect, getPatients)
  .post(protect, createPatient);

router
  .route('/:id')
  .get(protect, getPatient)
  .put(protect, updatePatient)
  .delete(protect, deletePatient);

module.exports = router;