const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Get all feedback
// @route   GET /api/v1/feedback
// @access  Private (Admin and doctors can see all, patients see their own)
exports.getFeedbacks = async (req, res, next) => {
    try {
        // Build query based on user role
        let filterQuery = {};
        
        // If user is a patient, only show their feedback
        if (req.user.role === 'patient') {
            filterQuery.patient = req.user.id;
        }
        // Admin and doctors can see all feedback
        // No additional filtering needed for admin/doctor roles
        
        let query = Feedback.find(filterQuery)
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            });
        
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Feedback.countDocuments(filterQuery);

        query = query.skip(startIndex).limit(limit);
        const feedback = await query;

        // Enhance with doctor specialization from Doctor model
        const Doctor = require('../models/Doctor');
        const enhancedFeedback = [];
        
        for (let fb of feedback) {
            if (fb.doctor) {
                const doctorInfo = await Doctor.findOne({ user: fb.doctor._id })
                    .select('specialization experience');
                
                const enhancedFb = {
                    ...fb.toObject(),
                    doctor: {
                        ...fb.doctor.toObject(),
                        specialization: doctorInfo?.specialization || 'General Medicine',
                        experience: doctorInfo?.experience || 0
                    }
                };
                
                enhancedFeedback.push(enhancedFb);
            } else {
                enhancedFeedback.push(fb);
            }
        }

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: enhancedFeedback.length,
            pagination,
            data: enhancedFeedback
        });
    } catch (error) {
        console.error('Get feedbacks error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get single feedback
// @route   GET /api/v1/feedback/:id
// @access  Private
exports.getFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.findById(req.params.id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            });

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Enhance with doctor specialization
        const Doctor = require('../models/Doctor');
        let enhancedFeedback = feedback.toObject();
        
        if (feedback.doctor) {
            const doctorInfo = await Doctor.findOne({ user: feedback.doctor._id })
                .select('specialization experience');
            
            enhancedFeedback = {
                ...enhancedFeedback,
                doctor: {
                    ...feedback.doctor.toObject(),
                    specialization: doctorInfo?.specialization || 'General Medicine',
                    experience: doctorInfo?.experience || 0
                }
            };
        }

        res.status(200).json({
            success: true,
            data: enhancedFeedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Create new feedback
// @route   POST /api/v1/feedback
// @access  Private/Patient
exports.createFeedback = async (req, res, next) => {
    try {
        // Ensure patient ID is set from authenticated user
        req.body.patient = req.user.id;
        
        // Check if feedback already exists for this appointment
        if (req.body.appointment) {
            const existingFeedback = await Feedback.findOne({ 
                appointment: req.body.appointment,
                patient: req.user.id 
            });
            
            if (existingFeedback) {
                return res.status(400).json({
                    success: false,
                    error: 'Feedback already exists for this appointment'
                });
            }
        }
        
        const feedback = await Feedback.create(req.body);

        // Populate the created feedback with doctor and appointment info
        const populatedFeedback = await Feedback.findById(feedback._id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status notes'
            });

        // Enhance with doctor specialization
        const Doctor = require('../models/Doctor');
        const doctorInfo = await Doctor.findOne({ user: populatedFeedback.doctor._id })
            .select('specialization experience');

        const enhancedFeedback = {
            ...populatedFeedback.toObject(),
            doctor: {
                ...populatedFeedback.doctor.toObject(),
                specialization: doctorInfo?.specialization || 'General Medicine',
                experience: doctorInfo?.experience || 0
            }
        };

        console.log(`Feedback created for appointment ${req.body.appointment} by patient ${req.user.id}`);

        res.status(201).json({
            success: true,
            data: enhancedFeedback
        });
    } catch (error) {
        console.error('Create feedback error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update feedback
// @route   PUT /api/v1/feedback/:id
// @access  Private/Patient
exports.updateFeedback = async (req, res, next) => {
    try {
        let feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        if (feedback.patient.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this feedback'
            });
        }

        feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: feedback
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete feedback
// @route   DELETE /api/v1/feedback/:id
// @access  Private/Patient
exports.deleteFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        if (feedback.patient.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to delete this feedback'
            });
        }

        await feedback.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get patient's feedback
exports.getPatientFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find({ patient: req.params.patientId })
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialty'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: feedback.length,
            data: feedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get doctor's feedback
exports.getDoctorFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find({ doctor: req.user.id })
            .populate({
                path: 'patient',
                select: 'firstName lastName profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: feedback.length,
            data: feedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get my feedback as patient
exports.getMyFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.find({ patient: req.user.id })
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status notes'
            })
            .sort('-createdAt');

        // Enhance with doctor specialization from Doctor model
        const Doctor = require('../models/Doctor');
        const enhancedFeedback = [];
        
        for (let fb of feedback) {
            if (fb.doctor && fb.doctor._id) {
                const doctorInfo = await Doctor.findOne({ user: fb.doctor._id })
                    .select('specialization experience');
                
                const enhancedFb = {
                    ...fb.toObject(),
                    doctor: {
                        ...fb.doctor.toObject(),
                        specialization: doctorInfo?.specialization || 'General Medicine',
                        experience: doctorInfo?.experience || 0
                    }
                };
                
                enhancedFeedback.push(enhancedFb);
            } else {
                // If doctor is missing, include feedback without doctor enhancement
                enhancedFeedback.push(fb.toObject());
            }
        }

        res.status(200).json({
            success: true,
            count: enhancedFeedback.length,
            data: enhancedFeedback
        });
    } catch (error) {
        console.error('Error getting patient feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Create my feedback as patient
exports.createMyFeedback = async (req, res, next) => {
    try {
        req.body.patient = req.user.id;
        const feedback = await Feedback.create(req.body);

        const populatedFeedback = await Feedback.findById(feedback._id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialty'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            });

        res.status(201).json({
            success: true,
            data: populatedFeedback
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update my feedback as patient
exports.updateMyFeedback = async (req, res, next) => {
    try {
        let feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        if (feedback.patient.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this feedback'
            });
        }

        feedback = await Feedback.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate({
            path: 'doctor',
            select: 'firstName lastName specialty'
        }).populate({
            path: 'appointment',
            select: 'date reason status'
        });

        res.status(200).json({
            success: true,
            data: feedback
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete my feedback as patient
exports.deleteMyFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        if (feedback.patient.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to delete this feedback'
            });
        }

        await feedback.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Update feedback read status
// @route   PUT /api/v1/feedback/:id/read
// @access  Private (Admin, Doctor)
exports.updateFeedbackReadStatus = async (req, res, next) => {
    try {
        let feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Only allow admin or the doctor who received the feedback to mark as read
        if (req.user.role !== 'admin' && feedback.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this feedback'
            });
        }

        feedback.read = req.body.read;
        await feedback.save();

        res.status(200).json({
            success: true,
            data: feedback
        });
    } catch (error) {
        console.error('Error updating feedback read status:', error);
        res.status(500).json({
            success: false,
            error: 'Server error updating feedback read status'
        });
    }
};

// @desc    Get patient's feedback history
// @route   GET /api/v1/feedback/patient/history
// @access  Private (Patient only)
exports.getPatientFeedbackHistory = async (req, res, next) => {
    try {
        const feedback = await Feedback.find({ patient: req.user.id })
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialty'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: feedback.length,
            data: feedback
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get appointments available for feedback
// @route   GET /api/v1/feedback/patient/appointments
// @access  Private (Patient only)
exports.getAppointmentsForFeedback = async (req, res, next) => {
    try {
        // First, get completed appointments for the patient
        const appointments = await Appointment.find({
            patient: req.user.id,
            status: 'completed'
        })
        .populate({
            path: 'doctor',
            select: 'firstName lastName email profilePicture'
        })
        .sort('-date');

        // For each appointment, get the doctor's additional info from Doctor model and check for existing feedback
        const appointmentsWithoutFeedback = [];
        const Doctor = require('../models/Doctor');
        
        for (let appointment of appointments) {
            // Check if feedback already exists for this appointment
            const existingFeedback = await Feedback.findOne({ appointment: appointment._id });
            
            if (!existingFeedback) {
                // Get additional doctor information
                const doctorInfo = await Doctor.findOne({ user: appointment.doctor._id })
                    .select('specialization experience qualification');
                
                // Create enhanced appointment object
                const enhancedAppointment = {
                    ...appointment.toObject(),
                    doctor: {
                        ...appointment.doctor.toObject(),
                        specialization: doctorInfo?.specialization || 'General Medicine',
                        experience: doctorInfo?.experience || 0,
                        qualification: doctorInfo?.qualification || ''
                    }
                };
                
                appointmentsWithoutFeedback.push(enhancedAppointment);
            }
        }

        console.log(`Found ${appointmentsWithoutFeedback.length} appointments needing feedback for patient ${req.user.id}`);
        
        res.status(200).json({
            success: true,
            count: appointmentsWithoutFeedback.length,
            data: appointmentsWithoutFeedback
        });
    } catch (error) {
        console.error('Error getting appointments for feedback:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};
