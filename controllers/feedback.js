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
                select: 'firstName lastName specialty'
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

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: feedback.length,
            pagination,
            data: feedback
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
                select: 'firstName lastName specialty'
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

        res.status(200).json({
            success: true,
            data: feedback
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
        req.body.patient = req.user.id;
        const feedback = await Feedback.create(req.body);

        res.status(201).json({
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
        const feedback = await Feedback.find({ doctor: req.params.doctorId })
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
        // Find completed appointments that don't have feedback yet
        const appointments = await Appointment.find({
            patient: req.user.id,
            status: 'completed'
        })
        .populate({
            path: 'doctor',
            select: 'firstName lastName specialty'
        })
        .sort('-date');

        // Filter out appointments that already have feedback
        const appointmentsWithoutFeedback = [];
        for (let appointment of appointments) {
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
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};
