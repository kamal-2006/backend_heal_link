const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please add a title for the medical record']
  },
  recordType: {
    type: String,
    enum: ['Lab', 'Imaging', 'Prescription', 'Consultation', 'Surgery', 'Other'],
    required: [true, 'Please specify the record type']
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  },
  fileUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['new', 'viewed'],
    default: 'new'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);