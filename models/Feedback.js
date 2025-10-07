const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
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
  appointment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Appointment',
    required: true,
  },
  appointmentType: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency', 'check-up'],
    default: 'consultation',
  },
  feedbackType: {
    type: String,
    enum: ['compliment', 'complaint', 'suggestion'],
    default: 'compliment',
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
  },
  status: {
    type: String,
    enum: ['completed', 'pending'],
    default: 'completed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
