const express = require('express');
const {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  deletePrescription,
} = require('../controllers/prescriptions');

const router = express.Router();

router
  .route('/')
  .get(getPrescriptions)
  .post(createPrescription);

router
  .route('/:id')
  .get(getPrescription)
  .put(updatePrescription)
  .delete(deletePrescription);

module.exports = router;
