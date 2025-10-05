const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');

// Helper function to update doctor availability based on appointments
const updateDoctorAvailability = async (doctorId) => {
    try {
        // Get all confirmed appointments for this doctor
        const appointments = await Appointment.find({
            doctor: doctorId,
            status: { $in: ['confirmed', 'pending'] }
        }).sort({ date: 1 });

        // Get doctor
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) return;

        // Generate timeSlots from appointments
        const timeSlots = appointments.map(appointment => {
            const appointmentDate = new Date(appointment.date);
            const startTime = appointmentDate.toTimeString().slice(0, 5); // HH:MM format
            const endTime = new Date(appointmentDate.getTime() + 30 * 60000).toTimeString().slice(0, 5); // Add 30 minutes
            
            return {
                startTime,
                endTime,
                date: appointmentDate.toISOString().split('T')[0], // YYYY-MM-DD format
                appointmentId: appointment._id
            };
        });

        // Update doctor availability
        await Doctor.findByIdAndUpdate(doctorId, {
            $set: {
                'availability.timeSlots': timeSlots
            }
        });
    } catch (error) {
        console.error('Error updating doctor availability:', error);
    }
};

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
    try {
        // Get all appointments for admin view
        const query = Appointment.find().populate({
            path: 'doctor',
            select: 'firstName lastName specialty'
        }).populate({
            path: 'patient',
            select: 'firstName lastName email phone'
        });

        // Add pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Appointment.countDocuments();

        query.skip(startIndex).limit(limit).sort({ date: -1 });

        const appointments = await query;

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
            count: appointments.length, 
            pagination,
            data: appointments 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get appointments for a specific patient
// @route   GET /api/v1/appointments/patient/:id
// @access  Private
exports.getPatientAppointments = async (req, res) => {
    try {
        // Check if user is authorized to view these appointments
        if (req.user.role !== 'admin' && req.user.id !== req.params.id && req.user.role !== 'doctor') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to view these appointments'
            });
        }

        const appointments = await Appointment.find({ patient: req.params.id })
            .populate({
                path: 'doctor',
                select: 'firstName lastName specialty'
            })
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Private
exports.getAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName email specialty'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName email phone'
            });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Make sure user is appointment owner or admin
        if (
            req.user.role !== 'admin' &&
            appointment.patient.toString() !== req.user.id &&
            appointment.doctor.toString() !== req.user.id
        ) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this appointment'
            });
        }

        res.status(200).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Book new appointment
// @route   POST /api/v1/appointments/book
// @access  Private
exports.bookAppointment = async (req, res, next) => {
    try {
        // Get patient record for current user
        const patient = await Patient.findOne({ user: req.user.id });
        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient profile not found'
            });
        }

        // Resolve doctor: support both Doctor document ID and Doctor's User ID
        const doctorIdentifier = req.body.doctor;
        let doctor = null;
        if (doctorIdentifier) {
            // Try by Doctor document ID first
            doctor = await Doctor.findById(doctorIdentifier).populate('user');
            if (!doctor) {
                // Fallback: try by User ID linked to a doctor profile
                doctor = await Doctor.findOne({ user: doctorIdentifier }).populate('user');
            }
        }
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Validate and normalize date
        const appointmentDate = new Date(req.body.date);
        if (isNaN(appointmentDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid appointment date'
            });
        }

        // Check for existing appointment at the same time
        const existingAppointment = await Appointment.findOne({
            doctor: doctor.user._id, // Use the user ID from doctor
            date: appointmentDate,
            status: { $ne: 'cancelled' } // Not cancelled
        });

        if (existingAppointment) {
            return res.status(400).json({
                success: false,
                error: 'Doctor is not available at this time'
            });
        }

        // Create appointment with proper references
        const appointment = await Appointment.create({
            doctor: doctor.user._id, // Use the user ID from doctor
            patient: req.user.id, // Current user is the patient
            date: appointmentDate,
            reason: req.body.reason,
            notes: req.body.notes || ''
        });

        // Populate the appointment for the response
        const populatedAppointment = await Appointment.findById(appointment._id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName email'
            });

        // Update doctor availability with new appointment
        await updateDoctorAvailability(doctor._id);
        
        res.status(201).json({
            success: true,
            data: populatedAppointment
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
    try {
        let appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // If changing date/time, check for conflicts
        if (req.body.date && req.body.date !== appointment.date.toISOString()) {
            const existingAppointment = await Appointment.findOne({
                doctor: appointment.doctor,
                date: new Date(req.body.date),
                _id: { $ne: req.params.id }, // Not this appointment
                status: { $ne: 'cancelled' } // Not cancelled
            });

            if (existingAppointment) {
                return res.status(400).json({
                    success: false,
                    error: 'Doctor is not available at this time'
                });
            }
        }

        appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate({
            path: 'doctor',
            select: 'firstName lastName specialty'
        }).populate({
            path: 'patient',
            select: 'firstName lastName email phone'
        });

        // Update doctor availability with new appointment time
        await updateDoctorAvailability(appointment.doctor._id);

        res.status(200).json({
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

// @desc    Cancel appointment
// @route   PUT /api/v1/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        // Make sure user is appointment owner or admin
        if (
            req.user.role !== 'admin' &&
            appointment.patient.toString() !== req.user.id &&
            appointment.doctor.toString() !== req.user.id
        ) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to cancel this appointment'
            });
        }

        // Update status to cancelled
        appointment.status = 'cancelled';
        await appointment.save();

        res.status(200).json({
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

// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private (Admin only)
exports.deleteAppointment = async (req, res, next) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({
                success: false,
                error: 'Appointment not found'
            });
        }

        const doctorId = appointment.doctor;
        await appointment.deleteOne();

        // Update doctor availability after deleting appointment
        await updateDoctorAvailability(doctorId);

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get doctor availability
// @route   GET /api/v1/doctors/:id/availability
// @access  Private
exports.getDoctorAvailability = async (req, res) => {
    try {
        // Check if doctor exists
        const doctor = await User.findById(req.params.id);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Get date from query params or use today
        const date = req.query.date ? new Date(req.query.date) : new Date();
        
        // Set hours to 0 to get start of day
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        // Set hours to 23:59:59 to get end of day
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);

        // Find all appointments for this doctor on the specified date
        const appointments = await Appointment.find({
            doctor: req.params.id,
            date: {
                $gte: startDate,
                $lte: endDate
            },
            status: { $ne: 'cancelled' } // Not cancelled
        });

        // Create time slots (9 AM to 5 PM, 30 min intervals)
        const timeSlots = [];
        const startHour = 9; // 9 AM
        const endHour = 17; // 5 PM
        const intervalMinutes = 30;

        for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += intervalMinutes) {
                const slotTime = new Date(date);
                slotTime.setHours(hour, minute, 0, 0);
                
                // Check if slot is available
                const isBooked = appointments.some(appointment => {
                    const appointmentTime = new Date(appointment.date);
                    return appointmentTime.getHours() === hour && 
                           appointmentTime.getMinutes() === minute;
                });

                timeSlots.push({
                    time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                    available: !isBooked
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                date: date.toISOString().split('T')[0],
                timeSlots
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};
