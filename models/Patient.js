const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  patientId: {
    type: String,
    unique: true,
    default: function() {
      return 'P-' + Math.floor(1000 + Math.random() * 9000);
    }
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  height: {
    value: Number,
    unit: {
      type: String,
      enum: ['cm', 'ft'],
      default: 'cm'
    }
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'United States'
    }
  },
  allergies: [String],
  medicalConditions: [String],
  medications: [String],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    email: String
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expiryDate: Date
  },
  preferredPharmacy: {
    name: String,
    address: String,
    phone: String
  },
  preferredLanguage: {
    type: String,
    default: 'English'
  },
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other']
  },
  occupation: String,
  smokingStatus: {
    type: String,
    enum: ['Never', 'Former', 'Current', 'Unknown']
  },
  alcoholUse: {
    type: String,
    enum: ['Never', 'Occasionally', 'Regularly', 'Unknown']
  },
  settings: {
    notificationPreferences: {
      appointmentReminders: {
        type: Boolean,
        default: true
      },
      medicationReminders: {
        type: Boolean,
        default: true
      },
      emailNotifications: {
        type: Boolean,
        default: true
      },
      smsNotifications: {
        type: Boolean,
        default: false
      },
      pushNotifications: {
        type: Boolean,
        default: true
      }
    },
    privacySettings: {
      shareDataWithDoctors: {
        type: Boolean,
        default: true
      },
      shareDataForResearch: {
        type: Boolean,
        default: false
      },
      allowAnonymizedDataUse: {
        type: Boolean,
        default: false
      }
    },
    displayPreferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system'
      },
      fontSize: {
        type: String,
        enum: ['small', 'medium', 'large'],
        default: 'medium'
      },
      language: {
        type: String,
        default: 'English'
      }
    },
    communicationPreferences: {
      preferredContactMethod: {
        type: String,
        enum: ['email', 'phone', 'sms', 'app'],
        default: 'email'
      },
      preferredAppointmentReminder: {
        type: Number, // hours before appointment
        default: 24
      }
    },
    accessibilitySettings: {
      highContrast: {
        type: Boolean,
        default: false
      },
      screenReader: {
        type: Boolean,
        default: false
      },
      reducedMotion: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate appointments
PatientSchema.virtual('appointments', {
  ref: 'Appointment',
  localField: '_id',
  foreignField: 'patient',
  justOne: false
});

// Virtual populate medical records
PatientSchema.virtual('medicalRecords', {
  ref: 'MedicalRecord',
  localField: '_id',
  foreignField: 'patient',
  justOne: false
});

// Virtual populate prescriptions
PatientSchema.virtual('prescriptions', {
  ref: 'Prescription',
  localField: '_id',
  foreignField: 'patient',
  justOne: false
});

module.exports = mongoose.model('Patient', PatientSchema);
