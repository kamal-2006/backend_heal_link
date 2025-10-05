const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  phone: {
    type: String,
    required: function() {
      return !this.googleId; // Only required if not Google OAuth user
    },
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'nurse', 'admin'],
    default: 'patient',
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Only required if not Google OAuth user
    },
    minlength: 6,
    select: false,
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
  },
  googleProfile: {
    type: mongoose.Schema.Types.Mixed,
  },
  isGoogleUser: {
    type: Boolean,
    default: false,
  },
  // 2FA fields
  twoFactorSecret: {
    type: String,
    select: false,
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false,
  },
  backupCodes: [{
    code: String,
    used: {
      type: Boolean,
      default: false,
    },
  }],
  isDefaultPassword: {
    type: Boolean,
    default: false,
  },
  // Doctor-specific fields
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot be more than 1000 characters'],
  },
  specialty: {
    type: String,
  },
  department: {
    type: String,
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
  },
  qualifications: [{
    type: String,
  }],
  languages: [{
    type: String,
  }],
  licenseNumber: {
    type: String,
  },
  consultationHours: {
    type: String,
  },
  availabilityStatus: {
    type: String,
    enum: ['on-duty', 'off-duty', 'busy'],
    default: 'on-duty',
  },
  location: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, firstName: this.firstName, lastName: this.lastName, email: this.email, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
