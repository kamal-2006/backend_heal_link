const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  medication: {
    type: String,
    required: true,
  },
  dosage: {
    type: String,
    required: true,
  },
  frequency: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);
