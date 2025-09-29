const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const User = require('../models/User');
const path = require('path');

// @desc    Get all medical records
// @route   GET /api/v1/records
// @route   GET /api/v1/patients/:patientId/records
// @access  Private
exports.getMedicalRecords = asyncHandler(async (req, res, next) => {
  let query;

  // Check if patient ID is provided in params
  if (req.params.patientId) {
    // Find patient by ID
    const patient = await Patient.findById(req.params.patientId);
    
    if (!patient) {
      return next(new ErrorResponse(`No patient found with id ${req.params.patientId}`, 404));
    }

    // Check if user is authorized to view this patient's records
    if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
        patient.user.toString() !== req.user.id) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to access these records`, 401));
    }

    // Get records for this patient
    query = MedicalRecord.find({ patient: req.params.patientId });
  } else {
    // If user is patient, only show their records
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user.id });
      
      if (!patient) {
        return next(new ErrorResponse('Patient profile not found', 404));
      }
      
      query = MedicalRecord.find({ patient: patient._id });
    } else if (req.user.role === 'doctor') {
      // If doctor, show records they created
      query = MedicalRecord.find({ doctor: req.user.id });
    } else {
      // Admin can see all records
      query = MedicalRecord.find();
    }
  }

  // Add pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await MedicalRecord.countDocuments(query);

  query = query.skip(startIndex).limit(limit);

  // Sort by date
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-date');
  }

  // Execute query with populate
  const records = await query
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
    count: records.length,
    pagination,
    data: records
  });
});

// @desc    Get single medical record
// @route   GET /api/v1/records/:id
// @access  Private
exports.getMedicalRecord = asyncHandler(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id)
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

  if (!record) {
    return next(new ErrorResponse(`No record found with id ${req.params.id}`, 404));
  }

  // Make sure user is authorized to view this record
  const patient = await Patient.findById(record.patient);
  
  if (!patient) {
    return next(new ErrorResponse('Patient not found', 404));
  }

  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
      patient.user.toString() !== req.user.id) {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this record`, 401));
  }

  // Update status to viewed if patient is viewing
  if (req.user.role === 'patient' && record.status === 'new') {
    record.status = 'viewed';
    await record.save();
  }

  res.status(200).json({
    success: true,
    data: record
  });
});

// @desc    Create new medical record
// @route   POST /api/v1/patients/:patientId/records
// @access  Private (doctors and admins only)
exports.createMedicalRecord = asyncHandler(async (req, res, next) => {
  // Check if user is doctor or admin
  if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to create medical records', 401));
  }

  // Check if patient exists
  const patient = await Patient.findById(req.params.patientId);
  
  if (!patient) {
    return next(new ErrorResponse(`No patient found with id ${req.params.patientId}`, 404));
  }

  // Add patient and doctor to req.body
  req.body.patient = req.params.patientId;
  req.body.doctor = req.user.id;

  const record = await MedicalRecord.create(req.body);

  res.status(201).json({
    success: true,
    data: record
  });
});

// @desc    Update medical record
// @route   PUT /api/v1/records/:id
// @access  Private (doctors and admins only)
exports.updateMedicalRecord = asyncHandler(async (req, res, next) => {
  let record = await MedicalRecord.findById(req.params.id);

  if (!record) {
    return next(new ErrorResponse(`No record found with id ${req.params.id}`, 404));
  }

  // Make sure user is record creator or admin
  if (record.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this record`, 401));
  }

  record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: record
  });
});

// @desc    Delete medical record
// @route   DELETE /api/v1/records/:id
// @access  Private (doctors and admins only)
exports.deleteMedicalRecord = asyncHandler(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id);

  if (!record) {
    return next(new ErrorResponse(`No record found with id ${req.params.id}`, 404));
  }

  // Make sure user is record creator or admin
  if (record.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this record`, 401));
  }

  await record.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload medical record file
// @route   PUT /api/v1/records/:id/upload
// @access  Private (doctors and admins only)
exports.uploadMedicalRecordFile = asyncHandler(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id);

  if (!record) {
    return next(new ErrorResponse(`No record found with id ${req.params.id}`, 404));
  }

  // Make sure user is record creator or admin
  if (record.doctor.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this record`, 401));
  }

  if (!req.files) {
    return next(new ErrorResponse('Please upload a file', 400));
  }

  const file = req.files.file;

  // Make sure the file is a valid medical document
  if (!file.mimetype.startsWith('application/pdf') && 
      !file.mimetype.startsWith('image/')) {
    return next(new ErrorResponse('Please upload a PDF or image file', 400));
  }

  // Check file size
  if (file.size > process.env.MAX_FILE_UPLOAD || file.size > 10000000) {
    return next(new ErrorResponse('File size cannot exceed 10MB', 400));
  }

  // Create custom filename
  file.name = `record_${record._id}${path.parse(file.name).ext}`;

  // Upload file
  file.mv(`${process.env.FILE_UPLOAD_PATH}/medical-records/${file.name}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse('Problem with file upload', 500));
    }

    // Update record with file URL
    await MedicalRecord.findByIdAndUpdate(req.params.id, {
      fileUrl: `/uploads/medical-records/${file.name}`
    });

    res.status(200).json({
      success: true,
      data: file.name
    });
  });
});

// @desc    Download medical record file
// @route   GET /api/v1/records/:id/download
// @access  Private
exports.downloadMedicalRecord = asyncHandler(async (req, res, next) => {
  const record = await MedicalRecord.findById(req.params.id);

  if (!record) {
    return next(new ErrorResponse(`No record found with id ${req.params.id}`, 404));
  }

  // Check if record has a file
  if (!record.fileUrl) {
    return next(new ErrorResponse('This record has no file to download', 404));
  }

  // Make sure user is authorized to download this record
  const patient = await Patient.findById(record.patient);
  
  if (!patient) {
    return next(new ErrorResponse('Patient not found', 404));
  }

  if (req.user.role !== 'admin' && req.user.role !== 'doctor' && 
      patient.user.toString() !== req.user.id) {
    return next(new ErrorResponse(`User ${req.user.id} is not authorized to download this record`, 401));
  }

  // Update status to viewed if patient is downloading
  if (req.user.role === 'patient' && record.status === 'new') {
    record.status = 'viewed';
    await record.save();
  }

  // Get file path
  const filePath = `${process.env.FILE_UPLOAD_PATH}${record.fileUrl.replace('/uploads', '')}`;

  // Send file
  res.download(filePath);
});