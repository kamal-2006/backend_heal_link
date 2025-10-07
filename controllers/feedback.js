const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Get all feedback
// @route   GET /api/v1/feedback
// @access  Private
exports.getFeedbacks = async (req, res, next) => {
    try {
        let query;
        
        // Copy req.query
        const reqQuery = { ...req.query };
        
        // Fields to exclude
        const removeFields = ['select', 'sort', 'page', 'limit'];
        
        // Loop over removeFields and delete them from reqQuery
        removeFields.forEach(param => delete reqQuery[param]);
        
        // If user is a doctor, only show their feedback
        if (req.user.role === 'doctor') {
            reqQuery.doctor = req.user.id;
        }
        
        // If user is a patient, only show feedback they've given
        if (req.user.role === 'patient') {
            reqQuery.patient = req.user.id;
        }
        
        // Create query string
        let queryStr = JSON.stringify(reqQuery);
        
        // Create operators ($gt, $gte, etc)
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
        
        // Finding resource
        query = Feedback.find(JSON.parse(queryStr))
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialty'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            });
        
        // Select Fields
        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }
        
        // Sort
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }
        
        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Feedback.countDocuments(JSON.parse(queryStr));
        
        query = query.skip(startIndex).limit(limit);
        
        // Executing query
        const feedbacks = await query;
        
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
            count: feedbacks.length,
            pagination,
            data: feedbacks
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
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
                select: 'firstName lastName specialty'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName'
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

        // Make sure user is feedback owner or an admin
        if (req.user.role !== 'admin' && 
            feedback.patient.toString() !== req.user.id && 
            feedback.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this feedback'
            });
        }

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

// @desc    Create new feedback
// @route   POST /api/v1/feedback
// @access  Private
exports.createFeedback = async (req, res, next) => {
    try {
        // Add patient ID from authenticated user
        if (req.user.role === 'patient') {
            req.body.patient = req.user.id;
        } else {
            return res.status(401).json({
                success: false,
                error: 'Only patients can submit feedback'
            });
        }

        // Check if appointment exists and belongs to the patient
        const appointment = await Appointment.findById(req.body.appointment);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        if (appointment.patient.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to give feedback for this appointment'
            });
        }

        // Set doctor from appointment
        req.body.doctor = appointment.doctor;

        // Check if feedback already exists for this appointment
        const existingFeedback = await Feedback.findOne({
            appointment: req.body.appointment
        });

        if (existingFeedback) {
            return res.status(400).json({
                success: false,
                error: 'Feedback already submitted for this appointment'
            });
        }

        const feedback = await Feedback.create(req.body);

        // Populate the created feedback
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

// @desc    Update feedback
// @route   PUT /api/v1/feedback/:id
// @access  Private
exports.updateFeedback = async (req, res, next) => {
    try {
        let feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Make sure patient owns the feedback
        if (feedback.patient.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this feedback'
            });
        }

        // Update only allowed fields
        const allowedFields = ['rating', 'comment', 'appointmentType'];
        const updateData = {};
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        feedback = await Feedback.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true
            }
        ).populate({
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

// @desc    Delete feedback
// @route   DELETE /api/v1/feedback/:id
// @access  Private
exports.deleteFeedback = async (req, res, next) => {
    try {
        const feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Make sure patient owns the feedback
        if (feedback.patient.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to delete this feedback'
            });
        }

        await Feedback.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get patient feedback history with stats
// @route   GET /api/v1/feedback/patient/history
// @access  Private
exports.getPatientFeedbackHistory = async (req, res, next) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(401).json({
                success: false,
                error: 'Only patients can access feedback history'
            });
        }

        const feedbacks = await Feedback.find({ patient: req.user.id })
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialty'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            })
            .sort('-createdAt');

        // Calculate statistics
        const stats = {
            totalFeedbacks: feedbacks.length,
            averageRating: feedbacks.length > 0 ? 
                (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1) : 0,
            ratingDistribution: {
                1: feedbacks.filter(f => f.rating === 1).length,
                2: feedbacks.filter(f => f.rating === 2).length,
                3: feedbacks.filter(f => f.rating === 3).length,
                4: feedbacks.filter(f => f.rating === 4).length,
                5: feedbacks.filter(f => f.rating === 5).length
            },
            appointmentTypes: {
                consultation: feedbacks.filter(f => f.appointmentType === 'consultation').length,
                'follow-up': feedbacks.filter(f => f.appointmentType === 'follow-up').length,
                emergency: feedbacks.filter(f => f.appointmentType === 'emergency').length,
                'check-up': feedbacks.filter(f => f.appointmentType === 'check-up').length
            }
        };

        res.status(200).json({
            success: true,
            count: feedbacks.length,
            data: feedbacks,
            stats
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get completed appointments available for feedback
// @route   GET /api/v1/feedback/patient/appointments
// @access  Private
exports.getAppointmentsForFeedback = async (req, res, next) => {
    try {
        if (req.user.role !== 'patient') {
            return res.status(401).json({
                success: false,
                error: 'Only patients can access this endpoint'
            });
        }

        // Get completed appointments that don't have feedback yet
        const appointments = await Appointment.find({
            patient: req.user.id,
            status: 'completed'
        }).populate({
            path: 'doctor',
            select: 'firstName lastName specialty'
        }).sort('-date');

        // Filter out appointments that already have feedback
        const appointmentsWithoutFeedback = [];
        for (const appointment of appointments) {
            const existingFeedback = await Feedback.findOne({ appointment: appointment._id });
            if (!existingFeedback) {
                appointmentsWithoutFeedback.push(appointment);
            }
        }

        res.status(200).json({
            success: true,
            count: appointmentsWithoutFeedback.length,
            data: appointmentsWithoutFeedback
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
