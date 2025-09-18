const express = require('express');
const {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescriptions');

const router = express.Router();

const { protect } = require('../middleware/auth');

router
  .route('/')
  .get(protect, getPrescriptions)
  .post(protect, createPrescription);

router
  .route('/:id')
  .get(protect, getPrescription)
  .put(protect, updatePrescription)
  .delete(protect, deletePrescription);

module.exports = router;
