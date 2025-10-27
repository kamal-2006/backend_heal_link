const { body, validationResult } = require('express-validator');
const ErrorResponse = require('../utils/errorResponse');

// Middleware to parse JSON strings in FormData before validation
exports.parseFormDataJSON = (req, res, next) => {
  // Parse availability if it's a string
  if (req.body.availability && typeof req.body.availability === 'string') {
    try {
      req.body.availability = JSON.parse(req.body.availability);
    } catch (error) {
      return next(new ErrorResponse('Invalid availability format', 400));
    }
  }
  
  // Parse other JSON fields if needed
  if (req.body.hospital && typeof req.body.hospital === 'string') {
    try {
      req.body.hospital = JSON.parse(req.body.hospital);
    } catch (error) {
      return next(new ErrorResponse('Invalid hospital format', 400));
    }
  }
  
  if (req.body.awards && typeof req.body.awards === 'string') {
    try {
      req.body.awards = JSON.parse(req.body.awards);
    } catch (error) {
      return next(new ErrorResponse('Invalid awards format', 400));
    }
  }
  
  next();
};

// Validation middleware for doctor profile updates
exports.validateDoctorProfileUpdate = [
  body('consultationFee')
    .optional()
    .isNumeric()
    .withMessage('Consultation fee must be a number')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee cannot be negative'),
    
  body('experience')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience must be a non-negative integer'),
    
  body('specialization')
    .optional()
    .isIn([
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
    ])
    .withMessage('Invalid specialization'),
    
  body('about')
    .optional()
    .isLength({ max: 500 })
    .withMessage('About section cannot exceed 500 characters'),
    
  body('availability.days')
    .optional()
    .isArray()
    .withMessage('Availability days must be an array'),
    
  body('availability.days.*')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day of week'),
    
  body('availability.timeSlots')
    .optional()
    .isArray()
    .withMessage('Time slots must be an array'),
    
  body('availability.timeSlots.*.startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
    
  body('availability.timeSlots.*.endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
    
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Invalid gender'),
    
  body('bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be boolean'),
    
  // Custom validation function
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      return next(new ErrorResponse(`Validation failed: ${errorMessages.join(', ')}`, 400));
    }
    next();
  }
];

// Validation for availability time slots
exports.validateTimeSlots = (req, res, next) => {
  // Skip validation if availability is not provided
  if (!req.body.availability) {
    return next();
  }
  
  // Ensure availability is an object
  if (typeof req.body.availability !== 'object') {
    return next(new ErrorResponse('Availability must be an object', 400));
  }
  
  // Skip validation if timeSlots is not provided or is empty
  if (!req.body.availability.timeSlots || !Array.isArray(req.body.availability.timeSlots) || req.body.availability.timeSlots.length === 0) {
    return next();
  }
  
  const timeSlots = req.body.availability.timeSlots;
  
  for (let i = 0; i < timeSlots.length; i++) {
    const slot = timeSlots[i];
    
    // Skip if slot doesn't have both times
    if (!slot || !slot.startTime || !slot.endTime) {
      continue;
    }
    
    try {
      const startTime = new Date(`1970-01-01T${slot.startTime}:00`);
      const endTime = new Date(`1970-01-01T${slot.endTime}:00`);
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return next(new ErrorResponse(`Time slot ${i + 1}: Invalid time format`, 400));
      }
      
      if (startTime >= endTime) {
        return next(new ErrorResponse(`Time slot ${i + 1}: End time must be after start time`, 400));
      }
    } catch (error) {
      return next(new ErrorResponse(`Time slot ${i + 1}: Error parsing time - ${error.message}`, 400));
    }
  }
  
  next();
};

module.exports = {
  parseFormDataJSON: exports.parseFormDataJSON,
  validateDoctorProfileUpdate: exports.validateDoctorProfileUpdate,
  validateTimeSlots: exports.validateTimeSlots
};