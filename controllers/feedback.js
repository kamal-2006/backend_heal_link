const Feedback = require('../models/Feedback');

// @desc    Get all feedback
// @route   GET /api/v1/feedback
// @access  Private
exports.getFeedbacks = async (req, res, next) => {
    try {
        const feedbacks = await Feedback.find();
        res.status(200).json({ success: true, count: feedbacks.length, data: feedbacks });
    } catch (error) {
        res.status(400).json({ success: false });
    }
};

// @desc    Get single feedback
// @route   GET /api/v1/feedback/:id
// @access  Private
exports.getFeedback = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Show feedback ${req.params.id}` });
};

// @desc    Create new feedback
// @route   POST /api/v1/feedback
// @access  Private
exports.createFeedback = async (req, res, next) => {
    res.status(201).json({ success: true, msg: 'Create new feedback' });
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
