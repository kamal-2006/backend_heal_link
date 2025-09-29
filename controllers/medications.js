const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const Medication = require('../models/Medication');
const Patient = require('../models/Patient');
const User = require('../models/User');

// @desc    Get all medications
// @route   GET /api/v1/medications
// @route   GET /api/v1/patients/:patientId/medications
// @access  Private
exports.getMedications = asyncHandler(async (req, res, next) => {
  let query;

  // Check if patient ID is provided in params
  if (req.params.patientId) {
    // Find patient by ID
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      return next(new ErrorResponse(`No patient found with id ${req.params.patientId}`, 404));
    }

    // Check if user is authorized to view this patient's medications
    if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
        patient.user.toString() !== req.user.id) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to access these medications`, 401));
    }

    // Get medications for this patient
    query = Medication.find({ patient: req.params.patientId });
  } else {
    // If user is patient, only show their medications
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      
      if (!patient) {
        return next(new ErrorResponse('Patient profile not found', 404));
      }
      
      query = Medication.find({ patient: patient._id });
    } else if (req.user.role === 'doctor') {
      // If doctor, show medications they prescribed
      query = Medication.find({ doctor: req.user.id });
    } else {
      // Admin can see all medications
      query = Medication.find();
    }
  }

  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Medication.countDocuments(query);

  query = query.skip(startIndex).limit(limit);

  // Filter by status if provided
  if (req.query.status) {
    query = query.find({ status: req.query.status });
  }

  // Sort by date
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-startDate');
  }

  // Execute query with populate
  const medications = await query
    .populate({
      path: 'doctor',
      select: 'name role'
    })
    .populate({
      path: 'patient',
      select: 'user',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }

  res.status(200).json({
    success: true,
    count: medications.length,
    pagination,
    data: medications
  });
});

// @desc    Get single medication
// @route   GET /api/v1/medications/:id
// @access  Private
exports.getMedication = asyncHandler(async (req, res, next) => {
  const medication = await Medication.findById(req.params.id)
    .populate({
      path: 'doctor',
      select: 'name role'
    })
    .populate({
      path: 'patient',
      select: 'user',
      populate: {
        path: 'user',
        select: 'name email'
      }
    });

  if (!medication) {
    return next(new ErrorResponse(`No medication found with id ${req.params.id}`, 404));
  }

  // Make sure user is authorized to view this medication
  const patient = await Patient.findById(medication.patient);
  
  if (!patient) {
    return next(new ErrorResponse('Patient not found', 404));
  }

  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
      patient.user.toString() !== req.user.id) {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this medication`, 401));
  }

  res.status(200).json({
    success: true,
    data: medication
  });
});

// @desc    Create new medication
// @route   POST /api/v1/patients/:patientId/medications
// @access  Private (doctors and admins only)
exports.createMedication = asyncHandler(async (req, res, next) => {
  // Check if user is doctor or admin
  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to prescribe medications', 401));
  }

  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  
  if (!patient) {
    return next(new ErrorResponse(`No patient found with id ${req.params.patientId}`, 404));
  }

  // Add patient and doctor to req.body
  req.body.patient = req.params.patientId;
  req.body.doctor = req.user.id;

  const medication = await Medication.create(req.body);

  res.status(201).json({
    success: true,
    data: medication
  });
});

// @desc    Update medication
// @route   PUT /api/v1/medications/:id
// @access  Private (doctors and admins only)
exports.updateMedication = asyncHandler(async (req, res, next) => {
  let medication = await Medication.findById(req.params.id);

  if (!medication) {
    return next(new ErrorResponse(`No medication found with id ${req.params.id}`, 404));
  }

  // Make sure user is medication creator or admin
  if (medication.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this medication`, 401));
  }

  medication = await Medication.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: medication
  });
});

// @desc    Delete medication
// @route   DELETE /api/v1/medications/:id
// @access  Private (doctors and admins only)
exports.deleteMedication = asyncHandler(async (req, res, next) => {
  const medication = await Medication.findById(req.params.id);

  if (!medication) {
    return next(new ErrorResponse(`No medication found with id ${req.params.id}`, 404));
  }

  // Make sure user is medication creator or admin
  if (medication.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this medication`, 401));
  }

  await medication.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update medication status (taken/skipped)
// @route   PUT /api/v1/medications/:id/status
// @access  Private (patients, doctors, and admins)
exports.updateMedicationStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status || !['active', 'completed', 'cancelled'].includes(status)) {
    return next(new ErrorResponse('Please provide a valid status (active, completed, cancelled)', 400));
  }

  let medication = await Medication.findById(req.params.id);

  if (!medication) {
    return next(new ErrorResponse(`No medication found with id ${req.params.id}`, 404));
  }

  // Check authorization
  const patient = await Patient.findById(medication.patient);
  
  if (!patient) {
    return next(new ErrorResponse('Patient not found', 404));
  }

  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
      patient.user.toString() !== req.user.id) {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this medication status`, 401));
  }

  medication = await Medication.findByIdAndUpdate(
    req.params.id, 
    { status }, 
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: medication
  });
});

// @desc    Get patient's active medications
// @route   GET /api/v1/patients/:patientId/medications/active
// @access  Private
exports.getActiveMedications = asyncHandler(async (req, res, next) => {
  // Find patient by ID
  const patient = await Patient.findById(req.params.patientId);
  
  if (!patient) {
    return next(new ErrorResponse(`No patient found with id ${req.params.patientId}`, 404));
  }

  // Check if user is authorized to view this patient's medications
  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
      patient.user.toString() !== req.user.id) {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to access these medications`, 401));
  }

  // Get active medications for this patient
  const medications = await Medication.find({ 
    patient: req.params.patientId,
    status: 'active',
    $or: [
      { endDate: { $gte: new Date() } },
      { endDate: { $exists: false } }
    ]
  }).populate({
    path: 'doctor',
    select: 'name role'
  });

  res.status(200).json({
    success: true,
    count: medications.length,
    data: medications
  });
});