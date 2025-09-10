const Prescription = require('../models/Prescription');

// @desc    Get all prescriptions
// @route   GET /api/v1/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res, next) => {
    try {
        let query;

        if (req.user.role === 'doctor') {
            query = Prescription.find({ doctor: req.user.id }).populate({
                path: 'patient',
                select: 'firstName lastName'
            });
        } else if (req.user.role === 'patient') {
            query = Prescription.find({ patient: req.user.id }).populate({
                path: 'doctor',
                select: 'firstName lastName'
            });
        } else {
            // Should not happen
            return res.status(403).json({ success: false, error: 'User role not recognized' });
        }

        const prescriptions = await query;

        res.status(200).json({ success: true, count: prescriptions.length, data: prescriptions });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
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
    try {
        req.body.doctor = req.user.id;
        const prescription = await Prescription.create(req.body);
        res.status(201).json({
            success: true,
            data: prescription
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
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
