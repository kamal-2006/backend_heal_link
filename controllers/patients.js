const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Get all patients
// @route   GET /api/v1/patients
// @access  Private
exports.getPatients = async (req, res, next) => {
    try {
        const patients = await Patient.find().populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        res.status(200).json({ success: true, count: patients.length, data: patients });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update patient settings
// @route   PUT /api/v1/patients/me/settings
// @access  Private (Patient only)
exports.updatePatientSettings = async (req, res, next) => {
    try {
        const {
            notificationPreferences,
            privacySettings,
            displayPreferences,
            communicationPreferences,
            accessibilitySettings
        } = req.body;

        // Find patient by user ID
        let patient = await Patient.findOne({ user: req.user.id });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient profile not found'
            });
        }

        // Create settings object with only provided fields
        const settingsUpdate = {};
        
        if (notificationPreferences) {
            settingsUpdate.notificationPreferences = notificationPreferences;
        }
        
        if (privacySettings) {
            settingsUpdate.privacySettings = privacySettings;
        }
        
        if (displayPreferences) {
            settingsUpdate.displayPreferences = displayPreferences;
        }
        
        if (communicationPreferences) {
            settingsUpdate.communicationPreferences = communicationPreferences;
        }
        
        if (accessibilitySettings) {
            settingsUpdate.accessibilitySettings = accessibilitySettings;
        }

        // Update patient with settings
        patient = await Patient.findOneAndUpdate(
            { user: req.user.id },
            { settings: settingsUpdate },
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            data: patient.settings
        });
    } catch (error) {
        console.error('Error updating patient settings:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get single patient
// @route   GET /api/v1/patients/:id
// @access  Private
exports.getPatient = async (req, res, next) => {
    try {
        const patient = await Patient.findById(req.params.id).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        res.status(200).json({ success: true, data: patient });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Create new patient
// @route   POST /api/v1/patients
// @access  Private
exports.createPatient = async (req, res, next) => {
    try {
        // Check if user already has a patient profile
        const existingPatient = await Patient.findOne({ user: req.user.id });
        if (existingPatient) {
            return res.status(400).json({
                success: false,
                error: 'User already has a patient profile'
            });
        }

        // Create patient profile
        const patient = await Patient.create({
            user: req.user.id,
            ...req.body
        });

        res.status(201).json({ success: true, data: patient });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Update patient
// @route   PUT /api/v1/patients/:id
// @access  Private
exports.updatePatient = async (req, res, next) => {
    try {
        let patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Ensure user owns the patient profile or is admin
        if (patient.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this profile'
            });
        }

        patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({ success: true, data: patient });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Delete patient
// @route   DELETE /api/v1/patients/:id
// @access  Private
exports.deletePatient = async (req, res, next) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Ensure user owns the patient profile or is admin
        if (patient.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to delete this profile'
            });
        }

        await patient.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// @desc    Get patient dashboard data
// @route   GET /api/v1/patients/:id/dashboard
// @access  Private
exports.getPatientDashboard = async (req, res) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Ensure user owns the patient profile or is admin
        if (patient.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this dashboard'
            });
        }

        // Get upcoming appointments
        const upcomingAppointments = await Appointment.countDocuments({
            patient: patient._id,
            date: { $gte: new Date() }
        });

        // Get past appointments
        const pastAppointments = await Appointment.countDocuments({
            patient: patient._id,
            date: { $lt: new Date() }
        });

        // Get medical records count (placeholder until we create the model)
        const medicalRecords = 0;

        // Get notifications count (placeholder for now)
        const notifications = 2;

        res.status(200).json({
            success: true,
            data: {
                upcomingAppointments,
                pastAppointments,
                medicalRecords,
                notifications
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error fetching dashboard data'
        });
    }
};

// @desc    Get current patient's profile
// @route   GET /api/v1/patients/me
// @access  Private (Patient only)
exports.getMyProfile = async (req, res, next) => {
    try {
        // Find patient by user ID
        const patient = await Patient.findOne({ user: req.user.id })
            .populate({
                path: 'user',
                select: 'firstName lastName email phone role createdAt'
            })
            .populate({
                path: 'appointments',
                select: 'date time status doctor',
                populate: {
                    path: 'doctor',
                    select: 'firstName lastName specialization'
                }
            })
            .populate({
                path: 'medicalRecords',
                select: 'recordType date diagnosis treatment notes'
            });

        if (!patient) {
            // If patient profile doesn't exist, create one
            const newPatient = await Patient.create({
                user: req.user.id
            });

            const populatedPatient = await Patient.findById(newPatient._id)
                .populate({
                    path: 'user',
                    select: 'firstName lastName email phone role createdAt'
                });

            return res.status(200).json({
                success: true,
                data: populatedPatient
            });
        }

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error fetching patient profile'
        });
    }
};

// @desc    Update current patient's profile
// @route   PUT /api/v1/patients/me
// @access  Private (Patient only)
exports.updateMyProfile = async (req, res, next) => {
    try {
        const { 
            dateOfBirth, 
            gender,
            bloodType, 
            height,
            weight,
            address,
            allergies, 
            medicalConditions,
            medications,
            emergencyContact, 
            insuranceInfo,
            preferredLanguage,
            maritalStatus,
            occupation,
            smokingStatus,
            alcoholUse
        } = req.body;

        // Find patient by user ID
        let patient = await Patient.findOne({ user: req.user.id });

        const updateData = {
            dateOfBirth,
            gender,
            bloodType,
            height,
            weight,
            address,
            allergies,
            medicalConditions,
            medications,
            emergencyContact,
            insuranceInfo,
            preferredLanguage,
            maritalStatus,
            occupation,
            smokingStatus,
            alcoholUse
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        if (!patient) {
            // If patient profile doesn't exist, create one
            patient = await Patient.create({
                user: req.user.id,
                ...updateData
            });
        } else {
            // Update existing patient profile
            patient = await Patient.findOneAndUpdate(
                { user: req.user.id },
                updateData,
                { new: true, runValidators: true }
            );
        }

        // Populate user details
        await patient.populate({
            path: 'user',
            select: 'firstName lastName email phone role'
        });

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Error updating patient profile:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};
