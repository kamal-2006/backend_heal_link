const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient'); // Added
const Feedback = require('../models/Feedback'); // Added
const Appointment = require('../models/Appointment');
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

// @desc    Get all appointments for the logged-in doctor
// @route   GET /api/v1/doctor/appointments
// @access  Private (Doctors only)
exports.getDoctorAppointments = asyncHandler(async (req, res, next) => {
  const appointments = await Appointment.find({ doctor: req.user.id })
    .populate({
      path: 'patient',
      select: 'firstName lastName email phone',
      populate: {
        path: 'patientInfo',
        select: 'patientId'
      }
    })
    .populate({
      path: 'doctor',
      select: 'firstName lastName email',
    });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments,
  });
});

// @desc    Get doctor dashboard data
// @route   GET /api/v1/doctor/dashboard-data
// @access  Private (Doctors only)
exports.getDoctorDashboardData = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.id; // User ID of the logged-in doctor

  // Get today's date for filtering appointments
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 1. Appointments Today
  const appointmentsToday = await Appointment.countDocuments({
    doctor: doctorId,
    date: { $gte: today, $lt: tomorrow },
    status: { $in: ['scheduled', 'confirmed'] },
  });

  // 2. Total Patients
  const totalPatients = await Patient.countDocuments({
    primaryDoctor: doctorId,
  });

  // 3. Pending Reviews (Feedback)
  const pendingReviews = await Feedback.countDocuments({
    doctor: doctorId,
    read: false,
  });

  // 4. Upcoming Appointments (for display in frontend)
  const upcomingAppointments = await Appointment.find({
    doctor: doctorId,
    date: { $gte: new Date() }, // Appointments from now onwards
    status: { $in: ['scheduled', 'confirmed'] },
  })
    .populate({
      path: 'patient',
      select: 'firstName lastName',
      populate: {
        path: 'patientInfo',
        select: 'patientId'
      }
    })
    .sort('date')
    .limit(4); // Limit to 4 upcoming appointments for the dashboard

  res.status(200).json({
    success: true,
    data: {
      appointmentsToday,
      totalPatients,
      pendingReviews,
          upcomingAppointments: upcomingAppointments.map(apt => {
            const patientName = apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : 'N/A';
            const patientId = apt.patient && apt.patient.patientInfo ? apt.patient.patientInfo.patientId : 'N/A';
            return {
              _id: apt._id,
              patient: {
                firstName: apt.patient ? apt.patient.firstName : 'N/A',
                lastName: apt.patient ? apt.patient.lastName : 'N/A',
                patientInfo: {
                  patientId: patientId
                }
              },
              date: apt.date,
              reason: apt.reason,
              status: apt.status,
            }
          }),    },
  });
});