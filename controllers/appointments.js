const Appointment = require('../models/Appointment');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
    res.status(200).json({ success: true, msg: 'Show all appointments' });
};

// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Private
exports.getAppointment = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Show appointment ${req.params.id}` });
};

// @desc    Create new appointment
// @route   POST /api/v1/appointments
// @access  Private
exports.createAppointment = async (req, res, next) => {
    res.status(201).json({ success: true, msg: 'Create new appointment' });
};

// @desc    Update appointment
// @route   PUT /api/v1/appointments/:id
// @access  Private
exports.updateAppointment = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Update appointment ${req.params.id}` });
};

// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private
exports.deleteAppointment = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Delete appointment ${req.params.id}` });
};
