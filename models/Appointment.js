const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
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
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rescheduled', 'no-show', 'in-progress'],
    default: 'pending',
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled'],
    default: 'scheduled',
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
