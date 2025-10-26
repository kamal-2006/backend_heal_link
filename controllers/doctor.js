const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Patient = require('../models/Patient'); // Added
const Feedback = require('../models/Feedback'); // Added
const Appointment = require('../models/Appointment');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get current doctor profile (Complete data for Profile & Settings pages)
// @route   GET /api/v1/doctor/me
// @access  Private (Doctors only)
exports.getDoctorProfile = asyncHandler(async (req, res, next) => {
  console.log('=== Get Doctor Profile Request ===');
  console.log('User ID:', req.user.id);

  let doctor = await Doctor.findOne({ user: req.user.id }).populate({
    path: 'user',
    select: '-password',
  });

  if (!doctor) {
    // Check if user exists but doesn't have doctor profile
    const user = await User.findById(req.user.id);
    if (user && user.role === 'doctor') {
      console.log('Creating new doctor profile for user:', req.user.id);
      
      // Create new doctor profile with default values
      doctor = new Doctor({
        user: req.user.id,
        specialization: 'General Medicine',
        experience: 0,
        consultationFee: 0,
        availability: {
          days: [],
          timeSlots: []
        },
        isActive: true,
        rating: 0,
        totalReviews: 0
      });
      
      await doctor.save();
      
      // Populate the user data
      doctor = await Doctor.findById(doctor._id).populate({
        path: 'user',
        select: '-password',
      });
    } else {
      return next(new ErrorResponse('Doctor not found', 404));
    }
  }

  // Ensure all required fields have default values
  let needsUpdate = false;
  
  if (!doctor.specialization) {
    doctor.specialization = 'General Medicine';
    needsUpdate = true;
  }
  
  if (doctor.experience === undefined || doctor.experience === null) {
    doctor.experience = 0;
    needsUpdate = true;
  }
  
  if (doctor.consultationFee === undefined || doctor.consultationFee === null) {
    doctor.consultationFee = 0;
    needsUpdate = true;
  }
  
  if (!doctor.availability) {
    doctor.availability = { days: [], timeSlots: [] };
    needsUpdate = true;
  }
  
  if (doctor.isActive === undefined || doctor.isActive === null) {
    doctor.isActive = true;
    needsUpdate = true;
  }

  if (needsUpdate) {
    console.log('Updating doctor with default values');
    await doctor.save();
  }

  console.log('Returning doctor profile with all fields:', {
    id: doctor._id,
    specialization: doctor.specialization,
    experience: doctor.experience,
    consultationFee: doctor.consultationFee,
    availabilityDays: doctor.availability?.days?.length || 0,
    timeSlots: doctor.availability?.timeSlots?.length || 0,
    isActive: doctor.isActive
  });

  res.status(200).json({
    success: true,
    data: doctor,
  });
});

// @desc    Update doctor profile (Complete Settings page backend)
// @route   PUT /api/v1/doctor/me
// @access  Private (Doctors only)
exports.updateDoctorProfile = asyncHandler(async (req, res, next) => {
  console.log('=== Doctor Profile Update Request ===');
  console.log('User ID:', req.user.id);
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  // Find the doctor
  const doctor = await Doctor.findOne({ user: req.user.id });

  if (!doctor) {
    console.log('Doctor not found for user:', req.user.id);
    return next(new ErrorResponse('Doctor profile not found', 404));
  }

  console.log('Current doctor data:', {
    id: doctor._id,
    specialization: doctor.specialization,
    experience: doctor.experience,
    consultationFee: doctor.consultationFee,
    availability: doctor.availability,
    isActive: doctor.isActive
  });

  // Initialize update object
  const updateData = {};
  
  // Handle basic profile fields
  if (req.body.specialization !== undefined) {
    updateData.specialization = req.body.specialization;
  }
  
  if (req.body.experience !== undefined) {
    const exp = Number(req.body.experience);
    if (!isNaN(exp) && exp >= 0) {
      updateData.experience = exp;
    } else {
      return next(new ErrorResponse('Experience must be a valid non-negative number', 400));
    }
  }
  
  if (req.body.qualification !== undefined) {
    updateData.qualification = req.body.qualification;
  }
  
  if (req.body.about !== undefined) {
    updateData.about = req.body.about;
  }
  
  // Handle consultation fee with validation
  if (req.body.consultationFee !== undefined) {
    const fee = Number(req.body.consultationFee);
    if (!isNaN(fee) && fee >= 0) {
      updateData.consultationFee = fee;
      console.log('Setting consultation fee to:', fee);
    } else {
      return next(new ErrorResponse('Consultation fee must be a valid non-negative number', 400));
    }
  }
  
  // Handle availability with comprehensive validation
  if (req.body.availability !== undefined) {
    const availability = req.body.availability;
    
    // Validate availability structure
    if (typeof availability !== 'object' || availability === null) {
      return next(new ErrorResponse('Availability must be a valid object', 400));
    }
    
    updateData.availability = {
      days: Array.isArray(availability.days) ? availability.days.filter(day => 
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(day)
      ) : [],
      timeSlots: Array.isArray(availability.timeSlots) ? availability.timeSlots.filter(slot => 
        slot && typeof slot === 'object' && slot.startTime && slot.endTime
      ).map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        ...(slot.date && { date: slot.date })
      })) : []
    };
    
    console.log('Setting availability to:', updateData.availability);
  }
  
  // Handle hospital information
  if (req.body.hospital !== undefined) {
    updateData.hospital = {
      name: req.body.hospital.name || '',
      address: req.body.hospital.address || '',
      phone: req.body.hospital.phone || ''
    };
  }
  
  // Handle active status
  if (req.body.isActive !== undefined) {
    updateData.isActive = Boolean(req.body.isActive);
    console.log('Setting active status to:', updateData.isActive);
  }
  
  // Handle personal information updates
  if (req.body.gender !== undefined) {
    updateData.gender = req.body.gender;
  }
  
  if (req.body.dateOfBirth !== undefined) {
    updateData.dateOfBirth = req.body.dateOfBirth;
  }
  
  if (req.body.bloodType !== undefined) {
    updateData.bloodType = req.body.bloodType;
  }

  console.log('Final update data:', JSON.stringify(updateData, null, 2));

  // Validate that we have something to update
  if (Object.keys(updateData).length === 0) {
    return next(new ErrorResponse('No valid fields provided for update', 400));
  }

  // Perform the update with validation
  const updatedDoctor = await Doctor.findByIdAndUpdate(
    doctor._id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).populate({
    path: 'user',
    select: '-password',
  });

  if (!updatedDoctor) {
    return next(new ErrorResponse('Failed to update doctor profile', 500));
  }

  console.log('Doctor profile updated successfully');

  res.status(200).json({
    success: true,
    message: 'Doctor profile updated successfully',
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

  // 2. Total Patients (based on appointments)
  const appointmentsWithPatients = await Appointment.find({
    doctor: doctorId,
  }).distinct('patient');
  const totalPatients = appointmentsWithPatients.length;

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
      })
    },
  });
});

// @desc    Get doctor's patients
// @route   GET /api/v1/doctor/patients
// @access  Private (Doctors only)
exports.getDoctorPatients = asyncHandler(async (req, res, next) => {
  const doctorId = req.user.id; // User ID of the logged-in doctor

  // Get all unique patients who have appointments with this doctor
  const appointments = await Appointment.find({
    doctor: doctorId,
  })
    .populate({
      path: 'patient',
      select: 'firstName lastName email phone patientId',
      populate: {
        path: 'patientInfo',
        select: 'patientId'
      }
    })
    .sort('-date');

  // Extract unique patients with their latest appointment info
  const patientsMap = new Map();
  
  appointments.forEach(appointment => {
    if (appointment.patient && appointment.patient._id) {
      const patientId = appointment.patient._id.toString();
      
      if (!patientsMap.has(patientId)) {
        patientsMap.set(patientId, {
          _id: appointment.patient._id,
          name: `${appointment.patient.firstName || ''} ${appointment.patient.lastName || ''}`.trim(),
          email: appointment.patient.email || '',
          phone: appointment.patient.phone || '',
          patientId: appointment.patient?.patientInfo?.patientId || appointment.patient.patientId || 'N/A',
          lastAppointment: {
            date: appointment.date,
            reason: appointment.reason || 'N/A',
            status: appointment.status,
          },
          totalAppointments: 1,
        });
      } else {
        // Increment appointment count for existing patient
        const existingPatient = patientsMap.get(patientId);
        existingPatient.totalAppointments += 1;
      }
    }
  });

  const patients = Array.from(patientsMap.values());

  res.status(200).json({
    success: true,
    count: patients.length,
    data: patients,
  });
});