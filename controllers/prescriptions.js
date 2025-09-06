const Prescription = require('../models/Prescription');

// @desc    Get all prescriptions
// @route   GET /api/v1/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res, next) => {
    res.status(200).json({ success: true, msg: 'Show all prescriptions' });
};

// @desc    Get single prescription
// @route   GET /api/v1/prescriptions/:id
// @access  Private
exports.getPrescription = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Show prescription ${req.params.id}` });
};

// @desc    Create new prescription
// @route   POST /api/v1/prescriptions
// @access  Private
exports.createPrescription = async (req, res, next) => {
    res.status(201).json({ success: true, msg: 'Create new prescription' });
};

// @desc    Update prescription
// @route   PUT /api/v1/prescriptions/:id
// @access  Private
exports.updatePrescription = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Update prescription ${req.params.id}` });
};

// @desc    Delete prescription
// @route   DELETE /api/v1/prescriptions/:id
// @access  Private
exports.deletePrescription = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Delete prescription ${req.params.id}` });
};
