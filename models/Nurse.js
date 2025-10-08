const mongoose = require('mongoose');

const NurseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  nurseId: {
    type: String,
    unique: true,
    default: function() {
      return 'N-' + Math.floor(1000 + Math.random() * 9000);
    }
  },
  assignedPatients: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Patient'
  }],
  department: {
    type: String,
    enum: ['Emergency', 'ICU', 'Pediatrics', 'Surgery', 'General', 'Cardiology', 'Oncology', 'Orthopedics', 'Neurology', 'Other'],
    default: 'General'
  },
  shift: {
    type: String,
    enum: ['Morning', 'Evening', 'Night', 'Rotating'],
    default: 'Morning'
  },
  licenseNumber: {
    type: String,
    required: [true, 'Please add license number']
  },
  qualification: {
    type: String
  },
  experience: {
    type: Number, // in years
    default: 0
  },
  specialization: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Populate user details when fetching nurse
NurseSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'firstName lastName email phone'
  });
  next();
});

module.exports = mongoose.model('Nurse', NurseSchema);
