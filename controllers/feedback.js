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
                select: 'firstName lastName email profilePicture'
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

        // Enhance with doctor specialization from Doctor model
        const Doctor = require('../models/Doctor');
        const enhancedFeedback = [];
        
        for (let fb of feedback) {
            if (fb.doctor) {
                const doctorInfo = await Doctor.findOne({ user: fb.doctor._id })
                    .select('specialization experience');
                
                const enhancedFb = {
                    ...fb.toObject(),
                    doctor: {
                        ...fb.doctor.toObject(),
                        specialization: doctorInfo?.specialization || 'General Medicine',
                        experience: doctorInfo?.experience || 0
                    }
                };
                
                enhancedFeedback.push(enhancedFb);
            } else {
                enhancedFeedback.push(fb);
            }
        }

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: enhancedFeedback.length,
            pagination,
            data: enhancedFeedback
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
                select: 'firstName lastName email profilePicture'
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

        // Enhance with doctor specialization
        const Doctor = require('../models/Doctor');
        let enhancedFeedback = feedback.toObject();
        
        if (feedback.doctor) {
            const doctorInfo = await Doctor.findOne({ user: feedback.doctor._id })
                .select('specialization experience');
            
            enhancedFeedback = {
                ...enhancedFeedback,
                doctor: {
                    ...feedback.doctor.toObject(),
                    specialization: doctorInfo?.specialization || 'General Medicine',
                    experience: doctorInfo?.experience || 0
                }
            };
        }

        res.status(200).json({
            success: true,
            data: enhancedFeedback
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
        // Ensure patient ID is set from authenticated user
        req.body.patient = req.user.id;
        
        // Check if feedback already exists for this appointment
        if (req.body.appointment) {
            const existingFeedback = await Feedback.findOne({ 
                appointment: req.body.appointment,
                patient: req.user.id 
            });
            
            if (existingFeedback) {
                return res.status(400).json({
                    success: false,
                    error: 'Feedback already exists for this appointment'
                });
            }
        }
        
        const feedback = await Feedback.create(req.body);

        // Populate the created feedback with doctor and appointment info
        const populatedFeedback = await Feedback.findById(feedback._id)
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status notes'
            });

        // Enhance with doctor specialization
        const Doctor = require('../models/Doctor');
        const doctorInfo = await Doctor.findOne({ user: populatedFeedback.doctor._id })
            .select('specialization experience');

        const enhancedFeedback = {
            ...populatedFeedback.toObject(),
            doctor: {
                ...populatedFeedback.doctor.toObject(),
                specialization: doctorInfo?.specialization || 'General Medicine',
                experience: doctorInfo?.experience || 0
            }
        };

        console.log(`Feedback created for appointment ${req.body.appointment} by patient ${req.user.id}`);

        res.status(201).json({
            success: true,
            data: enhancedFeedback
        });
    } catch (error) {
        console.error('Create feedback error:', error);
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
        const feedback = await Feedback.find({ doctor: req.user.id })
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
                select: 'firstName lastName email profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status notes'
            })
            .sort('-createdAt');

        // Enhance with doctor specialization from Doctor model
        const Doctor = require('../models/Doctor');
        const enhancedFeedback = [];
        
        for (let fb of feedback) {
            if (fb.doctor && fb.doctor._id) {
                const doctorInfo = await Doctor.findOne({ user: fb.doctor._id })
                    .select('specialization experience');
                
                const enhancedFb = {
                    ...fb.toObject(),
                    doctor: {
                        ...fb.doctor.toObject(),
                        specialization: doctorInfo?.specialization || 'General Medicine',
                        experience: doctorInfo?.experience || 0
                    }
                };
                
                enhancedFeedback.push(enhancedFb);
            } else {
                // If doctor is missing, include feedback without doctor enhancement
                enhancedFeedback.push(fb.toObject());
            }
        }

        res.status(200).json({
            success: true,
            count: enhancedFeedback.length,
            data: enhancedFeedback
        });
    } catch (error) {
        console.error('Error getting patient feedback:', error);
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

// @desc    Update feedback read status
// @route   PUT /api/v1/feedback/:id/read
// @access  Private (Admin, Doctor)
exports.updateFeedbackReadStatus = async (req, res, next) => {
    try {
        let feedback = await Feedback.findById(req.params.id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                error: 'Feedback not found'
            });
        }

        // Only allow admin or the doctor who received the feedback to mark as read
        if (req.user.role !== 'admin' && feedback.doctor.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this feedback'
            });
        }

        feedback.read = req.body.read;
        await feedback.save();

        res.status(200).json({
            success: true,
            data: feedback
        });
    } catch (error) {
        console.error('Error updating feedback read status:', error);
        res.status(500).json({
            success: false,
            error: 'Server error updating feedback read status'
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
        console.log('=== Get Appointments For Feedback ===');
        console.log('Patient ID:', req.user.id);
        
        // First, get completed appointments for the patient
        const appointments = await Appointment.find({
            patient: req.user.id,
            status: 'completed'
        })
        .populate({
            path: 'doctor',
            select: 'firstName lastName email profilePicture role'
        })
        .populate({
            path: 'patient', 
            select: 'firstName lastName email'
        })
        .sort('-date');

        console.log(`Found ${appointments.length} completed appointments`);
        
        // Debug: Check for appointments with missing or incomplete doctor data
        appointments.forEach((appointment, index) => {
            if (!appointment.doctor) {
                console.warn(`Appointment ${appointment._id} has no doctor populated`);
            } else if (!appointment.doctor.firstName || !appointment.doctor.lastName) {
                console.warn(`Appointment ${appointment._id} has incomplete doctor data:`, {
                    doctorId: appointment.doctor._id,
                    firstName: appointment.doctor.firstName,
                    lastName: appointment.doctor.lastName,
                    email: appointment.doctor.email
                });
            }
        });

        // For each appointment, get the doctor's additional info from Doctor model and check for existing feedback
        const appointmentsWithoutFeedback = [];
        const Doctor = require('../models/Doctor');
        
        for (let appointment of appointments) {
            console.log(`Processing appointment ${appointment._id}:`);
            console.log(`- Date: ${appointment.date}`);
            console.log(`- Doctor User: ${appointment.doctor ? appointment.doctor.firstName + ' ' + appointment.doctor.lastName : 'No doctor'}`);
            
            // Check if feedback already exists for this appointment
            const existingFeedback = await Feedback.findOne({ appointment: appointment._id });
            
            if (!existingFeedback) {
                console.log(`- No existing feedback found`);
                
                // Get additional doctor information from Doctor model
                let doctorInfo = null;
                if (appointment.doctor) {
                    doctorInfo = await Doctor.findOne({ user: appointment.doctor._id })
                        .select('specialization experience qualification consultationFee');
                    
                    console.log(`- Doctor Info: ${doctorInfo ? 'Found' : 'Not found'}`);
                    if (doctorInfo) {
                        console.log(`  - Specialization: ${doctorInfo.specialization}`);
                        console.log(`  - Experience: ${doctorInfo.experience}`);
                    }
                }
                
                // Create enhanced appointment object
                const enhancedAppointment = {
                    ...appointment.toObject(),
                    doctor: appointment.doctor ? {
                        _id: appointment.doctor._id,
                        firstName: appointment.doctor.firstName,
                        lastName: appointment.doctor.lastName,
                        email: appointment.doctor.email,
                        profilePicture: appointment.doctor.profilePicture,
                        // Add doctor profile information
                        specialization: doctorInfo?.specialization || 'General Medicine',
                        experience: doctorInfo?.experience || 0,
                        qualification: doctorInfo?.qualification || '',
                        consultationFee: doctorInfo?.consultationFee || 0
                    } : null
                };
                
                appointmentsWithoutFeedback.push(enhancedAppointment);
                console.log(`- Added to feedback list`);
            } else {
                console.log(`- Feedback already exists, skipping`);
            }
        }

        console.log(`Returning ${appointmentsWithoutFeedback.length} appointments needing feedback`);
        
        res.status(200).json({
            success: true,
            count: appointmentsWithoutFeedback.length,
            data: appointmentsWithoutFeedback
        });
    } catch (error) {
        console.error('Error getting appointments for feedback:', error);
        console.error('Error details:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({
            success: false,
            error: 'Failed to fetch appointments for feedback',
            message: error.message
        });
    }
};

// @desc    Get all feedback for admin with complete details (public access)
// @route   GET /api/v1/feedback/public/admin
// @access  Public
exports.getPublicAdminFeedback = async (req, res) => {
    try {
        console.log('=== Public Admin Feedback API ===');
        
        // Get all feedback with complete population
        const feedbacks = await Feedback.find({})
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture phone'
            })
            .populate({
                path: 'patient',
                select: 'firstName lastName email phone profilePicture'
            })
            .populate({
                path: 'appointment',
                select: 'date reason status'
            })
            .sort('-createdAt');

        console.log(`Found ${feedbacks.length} feedback entries`);

        // Enhance feedback with additional profile information
        const enhancedFeedbacks = [];
        
        for (let feedback of feedbacks) {
            let enhancedFeedback = { ...feedback.toObject() };
            
            // Get additional doctor profile information if doctor exists
            if (feedback.doctor) {
                const Doctor = require('../models/Doctor');
                const doctorProfile = await Doctor.findOne({ user: feedback.doctor._id })
                    .select('specialization experience qualification consultationFee rating');
                
                if (doctorProfile) {
                    enhancedFeedback.doctor = {
                        ...feedback.doctor.toObject(),
                        specialization: doctorProfile.specialization || 'General Medicine',
                        experience: doctorProfile.experience || 0,
                        qualification: doctorProfile.qualification || '',
                        consultationFee: doctorProfile.consultationFee || 0,
                        rating: doctorProfile.rating || 0
                    };
                }
            }
            
            // Get additional patient profile information if patient exists
            if (feedback.patient) {
                const Patient = require('../models/Patient');
                const patientProfile = await Patient.findOne({ user: feedback.patient._id })
                    .select('patientId dateOfBirth gender bloodGroup address emergencyContact');
                
                if (patientProfile) {
                    enhancedFeedback.patient = {
                        ...feedback.patient.toObject(),
                        patientId: patientProfile.patientId || '',
                        dateOfBirth: patientProfile.dateOfBirth,
                        gender: patientProfile.gender || '',
                        bloodGroup: patientProfile.bloodGroup || '',
                        address: patientProfile.address || '',
                        emergencyContact: patientProfile.emergencyContact || ''
                    };
                }
            }
            
            enhancedFeedbacks.push(enhancedFeedback);
        }

        res.status(200).json({
            success: true,
            count: enhancedFeedbacks.length,
            data: enhancedFeedbacks
        });
    } catch (error) {
        console.error('Public admin feedback error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Export feedback controller functions
module.exports = {
    getFeedbacks: exports.getFeedbacks,
    getFeedback: exports.getFeedback,
    createFeedback: exports.createFeedback,
    updateFeedback: exports.updateFeedback,
    deleteFeedback: exports.deleteFeedback,
    getPatientFeedbackHistory: exports.getPatientFeedbackHistory,
    getAppointmentsForFeedback: exports.getAppointmentsForFeedback,
    getMyFeedback: exports.getMyFeedback,
    createMyFeedback: exports.createMyFeedback,
    getDoctorFeedback: exports.getDoctorFeedback,
    updateFeedbackReadStatus: exports.updateFeedbackReadStatus,
    getAppointmentsNeedingFeedback: exports.getAppointmentsForFeedback,
    getPublicAdminFeedback: exports.getPublicAdminFeedback
};
