const Appointment = require('../models/Appointment');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
    try {
        let query;

        if (req.user.role === 'doctor') {
            query = Appointment.find({ doctor: req.user.id }).populate({
                path: 'patient',
                select: 'firstName lastName'
            });
        } else if (req.user.role === 'patient') {
            query = Appointment.find({ patient: req.user.id }).populate({
                path: 'doctor',
                select: 'firstName lastName'
            });
        } else {
            // Should not happen
            return res.status(403).json({ success: false, error: 'User role not recognized' });
        }

        const appointments = await query;

        res.status(200).json({ success: true, count: appointments.length, data: appointments });
    } catch (error) {
        res.status(400).json({ success: false });
    }
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
    try {
        req.body.doctor = req.user.id;
        const appointment = await Appointment.create(req.body);
        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
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
