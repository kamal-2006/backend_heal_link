const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  doctorId: {
    type: String,
    unique: true,
    default: function() {
      return 'D-' + Math.floor(1000 + Math.random() * 9000);
    }
  },
  specialization: {
    type: String,
    required: [true, 'Please add a specialization'],
    enum: [
      'General Medicine',
      'Cardiology',
      'Dermatology',
      'Pediatrics',
      'Orthopedics',
      'Neurology',
      'Oncology',
      'Psychiatry',
      'Radiology',
      'Emergency Medicine',
      'Internal Medicine',
      'Surgery',
      'Gynecology',
      'Ophthalmology',
      'ENT',
      'Anesthesiology',
      'Pathology',
      'Gastroenterology',
      'Pulmonology',
      'Endocrinology'
    ]
  },
  experience: {
    type: Number,
    required: [true, 'Please add years of experience']
  },
  qualification: {
    type: String,
    required: [true, 'Please add qualification']
  },
  about: {
    type: String,
    maxlength: [500, 'About cannot be more than 500 characters']
  },
  consultationFee: {
    type: Number,
    required: [true, 'Please add consultation fee']
  },
  availability: {
    days: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    timeSlots: [{
      startTime: String,
      endTime: String
    }]
  },
  hospital: {
    name: String,
    address: String,
    phone: String
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate appointments
DoctorSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'doctor',
  justOne: false
});

module.exports = mongoose.model('Doctor', DoctorSchema);