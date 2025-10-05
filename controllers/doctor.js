const Doctor = require('../models/Doctor');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get current doctor profile
// @route   GET /api/v1/doctor/me
// @access  Private (Doctors only)
exports.getDoctorProfile = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user.id }).populate({
    path: 'user',
    select: '-password',
  });

  if (!doctor) {
    // To provide a better error message, we'll check if the user exists but doesn't have a doctor profile.
    const user = await User.findById(req.user.id);
    if (user && user.role === 'doctor') {
      return next(
        new ErrorResponse(
          'Doctor profile not found. Please complete your profile.',
          404
        )
      );
    }
    return next(new ErrorResponse('Doctor not found', 404));
  }

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

// @desc    Update doctor profile
// @route   PUT /api/v1/doctor/me
// @access  Private (Doctors only)
exports.updateDoctorProfile = asyncHandler(async (req, res, next) => {
  const doctor = await Doctor.findOne({ user: req.user.id });

  if (!doctor) {
    return next(new ErrorResponse('Doctor profile not found', 404));
  }

  // Update doctor fields
  const {
    specialization,
    experience,
    qualification,
    about,
    consultationFee,
    availability,
    hospital,
  } = req.body;

  const fieldsToUpdate = {
    specialization,
    experience,
    qualification,
    about,
    consultationFee,
    availability,
    hospital,
  };

  // Filter out undefined fields
  Object.keys(fieldsToUpdate).forEach(
    (key) => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
  );

  const updatedDoctor = await Doctor.findByIdAndUpdate(
    doctor._id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  ).populate({
    path: 'user',
    select: '-password',
  });

  res.status(200).json({
    success: true,
    data: updatedDoctor,
  });
});

// @desc    Get all doctors (for patients/admin)
// @route   GET /api/v1/doctor
// @access  Private
exports.getDoctors = asyncHandler(async (req, res, next) => {
  const doctors = await User.find({ role: 'doctor' })
    .select('-password')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: doctors.length,
    data: doctors
  });
});

// @desc    Get single doctor by ID
// @route   GET /api/v1/doctor/:id
// @access  Private
exports.getDoctor = asyncHandler(async (req, res, next) => {
  const doctor = await User.findOne({ 
    _id: req.params.id, 
    role: 'doctor' 
  }).select('-password');

  if (!doctor) {
    return next(new ErrorResponse('Doctor not found', 404));
  }

  res.status(200).json({
    success: true,
    data: doctor
  });
});