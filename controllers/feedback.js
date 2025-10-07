const Feedback = require('../models/Feedback');
const User = require('../models/User');

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
                select: 'firstName lastName'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName profilePicture'
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
                select: 'firstName lastName'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName profilePicture'
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

        // Check if doctor exists
        const doctor = await User.findById(req.body.doctor);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Check if patient has already submitted feedback for this doctor
        const existingFeedback = await Feedback.findOne({
            doctor: req.body.doctor,
            patient: req.user.id
        });

        if (existingFeedback) {
            return res.status(400).json({
                success: false,
                error: 'You have already submitted feedback for this doctor'
            });
        }

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
// @access  Private
exports.updateFeedback = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Update feedback ${req.params.id}` });
};

// @desc    Delete feedback
// @route   DELETE /api/v1/feedback/:id
// @access  Private
exports.deleteFeedback = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Delete feedback ${req.params.id}` });
};

// @desc    Get feedback stats for admin (no auth)
// @route   GET /api/v1/feedback/stats
// @access  Public (Admin dashboard)
exports.getFeedbackStats = async (req, res, next) => {
    try {
        const feedbacks = await Feedback.find()
            .populate({
                path: 'doctor',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName email profilePicture'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: feedbacks.length,
            data: feedbacks
        });
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback stats'
        });
    }
};
