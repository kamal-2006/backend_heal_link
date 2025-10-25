const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: false // Allow patient to add their own medications
  },
  name: {
    type: String,
    required: [true, 'Please add medication name']
  },
  dosage: {
    type: String,
    required: [true, 'Please add dosage information']
  },
  frequency: {
    type: String,
    required: [true, 'Please add frequency information']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  instructions: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  reminders: {
    enabled: {
      type: Boolean,
      default: true
    },
    times: [String]
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Medication', MedicationSchema);