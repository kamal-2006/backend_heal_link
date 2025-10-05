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
            firstName,
            lastName,
            phone,
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

        // Update User model fields if provided
        if (firstName !== undefined || lastName !== undefined || phone !== undefined) {
            const userUpdateData = {};
            if (firstName !== undefined) userUpdateData.firstName = firstName;
            if (lastName !== undefined) userUpdateData.lastName = lastName;
            if (phone !== undefined) userUpdateData.phone = phone;

            await User.findByIdAndUpdate(
                req.user.id,
                userUpdateData,
                { new: true, runValidators: true }
            );
        }

        // Sanitize and validate enum fields
        const sanitizeEnumField = (value, validValues) => {
            if (!value || value.trim() === '') return undefined;
            
            // Check if the value exists in valid values (case-insensitive)
            const found = validValues.find(v => v.toLowerCase() === value.toLowerCase());
            return found || undefined;
        };

        // Valid enum values
        const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
        const validMaritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Other'];
        const validSmokingStatuses = ['Never', 'Former', 'Current', 'Unknown'];
        const validAlcoholUses = ['Never', 'Occasionally', 'Regularly', 'Unknown'];
        const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

        // Update Patient model fields
        const updateData = {
            dateOfBirth,
            gender: sanitizeEnumField(gender, validGenders),
            bloodType: sanitizeEnumField(bloodType, validBloodTypes),
            height,
            weight,
            address,
            allergies,
            medicalConditions,
            medications,
            emergencyContact,
            insuranceInfo,
            preferredLanguage,
            maritalStatus: sanitizeEnumField(maritalStatus, validMaritalStatuses),
            occupation,
            smokingStatus: sanitizeEnumField(smokingStatus, validSmokingStatuses),
            alcoholUse: sanitizeEnumField(alcoholUse, validAlcoholUses)
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

// @desc    Get notification preferences
// @route   GET /api/v1/patients/me/notifications
// @access  Private (Patient only)
exports.getNotificationPreferences = async (req, res, next) => {
    try {
        // Find patient by user ID
        const patient = await Patient.findOne({ user: req.user.id });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient profile not found'
            });
        }

        // Return notification preferences with defaults if not set
        const notificationPreferences = {
            emailNotifications: patient.settings?.notificationPreferences?.emailNotifications ?? true,
            smsNotifications: patient.settings?.notificationPreferences?.smsNotifications ?? false,
            pushNotifications: patient.settings?.notificationPreferences?.pushNotifications ?? true,
            appointmentReminders: patient.settings?.notificationPreferences?.appointmentReminders ?? true,
            testResults: patient.settings?.notificationPreferences?.testResults ?? true
        };

        res.status(200).json({
            success: true,
            data: notificationPreferences
        });
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Update notification preferences
// @route   PUT /api/v1/patients/me/notifications
// @access  Private (Patient only)
exports.updateNotificationPreferences = async (req, res, next) => {
    try {
        const {
            emailNotifications,
            smsNotifications,
            pushNotifications,
            appointmentReminders,
            testResults
        } = req.body;

        // Find patient by user ID
        let patient = await Patient.findOne({ user: req.user.id });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient profile not found'
            });
        }

        // Update notification preferences
        const updateData = {
            'settings.notificationPreferences.emailNotifications': emailNotifications,
            'settings.notificationPreferences.smsNotifications': smsNotifications,
            'settings.notificationPreferences.pushNotifications': pushNotifications,
            'settings.notificationPreferences.appointmentReminders': appointmentReminders,
            'settings.notificationPreferences.testResults': testResults
        };

        // Filter out undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        patient = await Patient.findOneAndUpdate(
            { user: req.user.id },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Return updated notification preferences
        const notificationPreferences = {
            emailNotifications: patient.settings?.notificationPreferences?.emailNotifications ?? true,
            smsNotifications: patient.settings?.notificationPreferences?.smsNotifications ?? false,
            pushNotifications: patient.settings?.notificationPreferences?.pushNotifications ?? true,
            appointmentReminders: patient.settings?.notificationPreferences?.appointmentReminders ?? true,
            testResults: patient.settings?.notificationPreferences?.testResults ?? true
        };

        res.status(200).json({
            success: true,
            data: notificationPreferences
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// ============== ADMIN-SPECIFIC METHODS (NO AUTH REQUIRED) ==============

// @desc    Get all patients for admin (no auth)
// @route   GET /api/v1/patients/admin/patients
// @access  Public (Admin panel)
exports.getAllPatientsForAdmin = async (req, res, next) => {
    try {
        const patients = await Patient.find()
            .populate({
                path: 'user',
                select: 'firstName lastName email phone createdAt'
            })
            .populate({
                path: 'appointments',
                select: 'date time status',
                options: { sort: { date: -1 } }
            })
            .sort({ createdAt: -1 });

        const patientsWithStats = patients.map(patient => {
            const totalAppointments = patient.appointments ? patient.appointments.length : 0;
            const upcomingAppointments = patient.appointments ? 
                patient.appointments.filter(apt => new Date(apt.date) >= new Date()).length : 0;
            
            return {
                _id: patient._id,
                patientId: patient.patientId,
                user: patient.user,
                dateOfBirth: patient.dateOfBirth,
                gender: patient.gender,
                bloodType: patient.bloodType,
                allergies: patient.allergies,
                medicalConditions: patient.medicalConditions,
                emergencyContact: patient.emergencyContact,
                insuranceInfo: patient.insuranceInfo,
                createdAt: patient.createdAt,
                totalAppointments,
                upcomingAppointments,
                lastAppointment: patient.appointments && patient.appointments.length > 0 ? 
                    patient.appointments[0].date : null
            };
        });

        res.status(200).json({ 
            success: true, 
            count: patientsWithStats.length, 
            data: patientsWithStats 
        });
    } catch (error) {
        console.error('Error fetching patients for admin:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch patients' 
        });
    }
};

// @desc    Get single patient details for admin (no auth)
// @route   GET /api/v1/patients/admin/patients/:id
// @access  Public (Admin panel)
exports.getPatientDetailsForAdmin = async (req, res, next) => {
    try {
        const patient = await Patient.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'firstName lastName email phone createdAt'
            })
            .populate({
                path: 'appointments',
                select: 'date time status doctor reason notes',
                populate: {
                    path: 'doctor',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                },
                options: { sort: { date: -1 } }
            })
            .populate({
                path: 'medicalRecords',
                select: 'recordType date diagnosis treatment notes createdAt'
            })
            .populate({
                path: 'prescriptions',
                select: 'medication dosage frequency duration prescribedBy createdAt',
                populate: {
                    path: 'prescribedBy',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                }
            });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Calculate stats
        const totalAppointments = patient.appointments ? patient.appointments.length : 0;
        const upcomingAppointments = patient.appointments ? 
            patient.appointments.filter(apt => new Date(apt.date) >= new Date()).length : 0;
        const completedAppointments = patient.appointments ? 
            patient.appointments.filter(apt => apt.status === 'completed').length : 0;

        // Age calculation
        let age = null;
        if (patient.dateOfBirth) {
            const today = new Date();
            const birthDate = new Date(patient.dateOfBirth);
            age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
        }

        const patientDetails = {
            ...patient.toObject(),
            age,
            stats: {
                totalAppointments,
                upcomingAppointments,
                completedAppointments,
                totalMedicalRecords: patient.medicalRecords ? patient.medicalRecords.length : 0,
                totalPrescriptions: patient.prescriptions ? patient.prescriptions.length : 0
            }
        };

        res.status(200).json({ 
            success: true, 
            data: patientDetails 
        });
    } catch (error) {
        console.error('Error fetching patient details for admin:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch patient details' 
        });
    }
};

// @desc    Update patient for admin (no auth)
// @route   PUT /api/v1/patients/admin/patients/:id
// @access  Public (Admin panel)
exports.updatePatientForAdmin = async (req, res, next) => {
    try {
        let patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Update patient information
        patient = await Patient.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });

        res.status(200).json({ 
            success: true, 
            data: patient 
        });
    } catch (error) {
        console.error('Error updating patient for admin:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message || 'Failed to update patient' 
        });
    }
};

// @desc    Delete patient for admin (no auth)
// @route   DELETE /api/v1/patients/admin/patients/:id
// @access  Public (Admin panel)
exports.deletePatientForAdmin = async (req, res, next) => {
    try {
        const patient = await Patient.findById(req.params.id);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Delete associated user account as well
        if (patient.user) {
            await User.findByIdAndDelete(patient.user);
        }

        // Delete the patient
        await Patient.findByIdAndDelete(req.params.id);

        res.status(200).json({ 
            success: true, 
            message: 'Patient and associated user account deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting patient for admin:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete patient' 
        });
    }
};
