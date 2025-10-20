const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  reason: {
    type: String,
    required: [true, 'Please add a reason for the appointment'],
  },
  notes: {
    type: String,
  },
  status: {
    type: String,
    enum: [
      'scheduled',
      'cancelled',
      'completed',
      'rescheduled',
    ],
    default: 'scheduled',
    index: true
  },
  isRescheduled: {
    type: Boolean,
    default: false,
  },
  originalDate: {
    type: Date,
  },
  rescheduleCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
