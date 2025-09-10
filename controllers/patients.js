const Patient = require('../models/Patient');

// @desc    Get all patients
// @route   GET /api/v1/patients
// @access  Private
exports.getPatients = async (req, res, next) => {
    try {
        const patients = await Patient.find();
        res.status(200).json({ success: true, count: patients.length, data: patients });
    } catch (error) {
        res.status(400).json({ success: false });
    }
};

// @desc    Get single patient
// @route   GET /api/v1/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Show patient ${req.params.id}` });
};

// @desc    Create new patient
// @route   POST /api/v1/patients
// @access  Private
exports.createPatient = async (req, res, next) => {
    res.status(201).json({ success: true, msg: 'Create new patient' });
};

// @desc    Update patient
// @route   PUT /api/v1/patients/:id
// @access  Private
exports.updatePatient = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Update patient ${req.params.id}` });
};

// @desc    Delete patient
// @route   DELETE /api/v1/patients/:id
// @access  Private
exports.deletePatient = async (req, res, next) => {
    res.status(200).json({ success: true, msg: `Delete patient ${req.params.id}` });
};
