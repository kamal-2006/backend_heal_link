const Nurse = require('../models/Nurse');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment');
const Medication = require('../models/Medication');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get nurse profile
// @route   GET /api/v1/nurse/profile
// @access  Private/Nurse
exports.getNurseProfile = async (req, res, next) => {
    try {
        let nurse = await Nurse.findOne({ user: req.user.id })
            .populate({
                path: 'user',
                select: 'firstName lastName email phone profilePicture'
            })
            .populate({
                path: 'assignedPatients',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email phone profilePicture'
                }
            });

        // If no nurse profile exists, create a basic one with default values
        if (!nurse) {
            console.log('Creating new nurse profile for user:', req.user.id);
            nurse = new Nurse({
                user: req.user.id,
                licenseNumber: 'TEMP-' + Math.floor(10000 + Math.random() * 90000), // Temporary license until updated
                department: 'General',
                shift: 'Morning',
                qualification: 'Not Provided',
                experience: 0,
                specialization: 'Not Provided',
                assignedPatients: [],
                isActive: true
            });
            
            try {
                await nurse.save();
                // Populate the user data after saving
                nurse = await Nurse.findById(nurse._id)
                    .populate({
                        path: 'user',
                        select: 'firstName lastName email phone profilePicture'
                    })
                    .populate({
                        path: 'assignedPatients',
                        populate: {
                            path: 'user',
                            select: 'firstName lastName email phone profilePicture'
                        }
                    });
            } catch (saveError) {
                console.error('Error creating nurse profile:', saveError);
                return res.status(500).json({
                    success: false,
                    error: `Failed to create nurse profile: ${saveError.message}`
                });
            }
        }

        res.status(200).json({
            success: true,
            data: nurse
        });
    } catch (error) {
        console.error('Get nurse profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Update nurse profile
// @route   PUT /api/v1/nurse/profile
// @access  Private/Nurse
exports.updateNurseProfile = async (req, res, next) => {
    try {
        const {
            firstName,
            lastName,
            email,
            phone,
            licenseNumber,
            department,
            shift,
            qualification,
            experience,
            specialization
        } = req.body;

        // First update user information
        const userUpdateData = {};
        if (firstName) userUpdateData.firstName = firstName;
        if (lastName) userUpdateData.lastName = lastName;
        if (email) userUpdateData.email = email;
        if (phone) userUpdateData.phone = phone;
        if (req.file) {
            // Store the file path for profile picture
            userUpdateData.profilePicture = `/uploads/profile-photos/${req.file.filename}`;
        }

        if (Object.keys(userUpdateData).length > 0) {
            await User.findByIdAndUpdate(req.user.id, userUpdateData);
        }

        // Then update nurse-specific information
        const nurseUpdateData = {};
        if (licenseNumber !== undefined) nurseUpdateData.licenseNumber = licenseNumber;
        if (department) nurseUpdateData.department = department;
        if (shift) nurseUpdateData.shift = shift;
        if (qualification !== undefined) nurseUpdateData.qualification = qualification;
        if (experience !== undefined) nurseUpdateData.experience = parseInt(experience) || 0;
        if (specialization !== undefined) nurseUpdateData.specialization = specialization;

        let nurse = await Nurse.findOne({ user: req.user.id });
        
        if (!nurse) {
            // Create new nurse profile if doesn't exist
            nurse = new Nurse({
                user: req.user.id,
                licenseNumber: licenseNumber || '',
                department: department || 'General',
                shift: shift || 'Morning',
                qualification: qualification || '',
                experience: parseInt(experience) || 0,
                specialization: specialization || '',
                assignedPatients: [],
                isActive: true
            });
            await nurse.save();
        } else {
            // Update existing nurse profile
            if (Object.keys(nurseUpdateData).length > 0) {
                await nurse.updateOne(nurseUpdateData);
            }
        }

        // Fetch updated nurse profile with populated data
        const updatedNurse = await Nurse.findOne({ user: req.user.id })
            .populate({
                path: 'user',
                select: 'firstName lastName email phone profilePicture'
            })
            .populate({
                path: 'assignedPatients',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email phone profilePicture'
                }
            });

        res.status(200).json({
            success: true,
            data: updatedNurse
        });
    } catch (error) {
        console.error('Update nurse profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get patients assigned to nurse
// @route   GET /api/v1/nurse/patients
// @access  Private/Nurse
exports.getAssignedPatients = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        const patients = await Patient.find({
            _id: { $in: nurse.assignedPatients }
        }).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });

        res.status(200).json({
            success: true,
            count: patients.length,
            data: patients
        });
    } catch (error) {
        console.error('Get assigned patients error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get single patient details (if assigned)
// @route   GET /api/v1/nurse/patients/:id
// @access  Private/Nurse
exports.getPatientDetails = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        // Check if patient is assigned to this nurse
        if (!nurse.assignedPatients.includes(req.params.id)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to access this patient\'s information'
            });
        }

        const patient = await Patient.findById(req.params.id)
            .populate({
                path: 'user',
                select: 'firstName lastName email phone'
            });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        res.status(200).json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error('Get patient details error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Upload medical report for assigned patient
// @route   POST /api/v1/nurse/reports
// @access  Private/Nurse
exports.uploadPatientReport = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        const { patient, title, recordType, description, notes } = req.body;

        // Check if patient is assigned to this nurse
        if (!nurse.assignedPatients.includes(patient)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to upload reports for this patient'
            });
        }

        // Check if patient exists
        const patientExists = await Patient.findById(patient);
        if (!patientExists) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Get file URL if file was uploaded
        let fileUrl = null;
        if (req.file) {
            fileUrl = `/uploads/medical-reports/${req.file.filename}`;
        }

        // Create medical record with nurse as doctor (or you can add a nurse field to MedicalRecord)
        const medicalRecord = await MedicalRecord.create({
            patient,
            doctor: req.user.id, // Using nurse's user ID
            title,
            recordType,
            description,
            fileUrl,
            notes
        });

        const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
            .populate({
                path: 'patient',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email'
                }
            })
            .populate({
                path: 'doctor',
                select: 'firstName lastName'
            });

        // Send notification to patient
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                recipient: patientExists.user,
                type: 'report',
                title: 'New Medical Report Uploaded',
                message: `A new ${recordType} report "${title}" has been uploaded to your records.`,
                relatedData: {
                    recordId: medicalRecord._id,
                    patientId: patient
                }
            });
        } catch (notifError) {
            console.error('Error creating notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            success: true,
            data: populatedRecord
        });
    } catch (error) {
        console.error('Upload patient report error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get medical records for assigned patient
// @route   GET /api/v1/nurse/patients/:id/reports
// @access  Private/Nurse
exports.getPatientReports = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        // Check if patient is assigned to this nurse
        if (!nurse.assignedPatients.includes(req.params.id)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to access this patient\'s reports'
            });
        }

        const reports = await MedicalRecord.find({ patient: req.params.id })
            .populate({
                path: 'doctor',
                select: 'firstName lastName'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        console.error('Get patient reports error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Add medication for assigned patient
// @route   POST /api/v1/nurse/medications
// @access  Private/Nurse
exports.addPatientMedication = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        const { patient, medicationName, dosage, frequency, duration, startDate, endDate, instructions, prescribedBy, status, reminders, notes } = req.body;

        // Check if patient is assigned to this nurse
        if (!nurse.assignedPatients.includes(patient)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to add medications for this patient'
            });
        }

        // Check if patient exists
        const patientExists = await Patient.findById(patient);
        if (!patientExists) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Create medication with nurse as doctor
        const medication = await Medication.create({
            patient,
            doctor: req.user.id, // Using nurse's user ID
            name: medicationName, // Map medicationName to name
            dosage,
            frequency,
            startDate,
            endDate,
            instructions,
            status: status || 'active',
            reminders,
            notes: notes || `Duration: ${duration || 'Not specified'}. Prescribed by: ${prescribedBy || 'Nurse'}`
        });

        const populatedMedication = await Medication.findById(medication._id)
            .populate({
                path: 'patient',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email'
                }
            })
            .populate({
                path: 'doctor',
                select: 'firstName lastName'
            });

        // Send notification to patient
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                recipient: patientExists.user,
                type: 'medication',
                title: 'New Medication Added',
                message: `A new medication "${medicationName}" (${dosage}) has been prescribed for you. Frequency: ${frequency}`,
                relatedData: {
                    medicationId: medication._id,
                    patientId: patient
                }
            });
        } catch (notifError) {
            console.error('Error creating notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            success: true,
            data: populatedMedication
        });
    } catch (error) {
        console.error('Add patient medication error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get medications for assigned patient
// @route   GET /api/v1/nurse/patients/:id/medications
// @access  Private/Nurse
exports.getPatientMedications = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        // Check if patient is assigned to this nurse
        if (!nurse.assignedPatients.includes(req.params.id)) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to access this patient\'s medications'
            });
        }

        const medications = await Medication.find({ patient: req.params.id })
            .populate({
                path: 'doctor',
                select: 'firstName lastName'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: medications.length,
            data: medications
        });
    } catch (error) {
        console.error('Get patient medications error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get all medications with filters
// @route   GET /api/v1/nurse/medications
// @access  Private/Nurse
exports.getAllMedications = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        // Build query
        let query = {};
        
        // Filter by patient if specified
        if (req.query.patient) {
            // Check if patient is assigned to this nurse
            if (!nurse.assignedPatients.includes(req.query.patient)) {
                return res.status(403).json({
                    success: false,
                    error: 'You are not authorized to access this patient\'s medications'
                });
            }
            query.patient = req.query.patient;
        } else {
            // Only show medications for assigned patients
            query.patient = { $in: nurse.assignedPatients };
        }

        // Filter by status if specified
        if (req.query.status) {
            query.status = req.query.status;
        }

        const medications = await Medication.find(query)
            .populate({
                path: 'patient',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email'
                }
            })
            .populate({
                path: 'doctor',
                select: 'firstName lastName'
            })
            .sort('-createdAt');

        res.status(200).json({
            success: true,
            count: medications.length,
            data: medications
        });
    } catch (error) {
        console.error('Get all medications error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Update medication status (active/completed/cancelled)
// @route   PUT /api/v1/nurse/medications/:id
// @access  Private/Nurse
exports.updateMedicationStatus = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        let medication = await Medication.findById(req.params.id);

        if (!medication) {
            return res.status(404).json({
                success: false,
                error: 'Medication not found'
            });
        }

        // Check if patient is assigned to this nurse
        if (!nurse.assignedPatients.includes(medication.patient.toString())) {
            return res.status(403).json({
                success: false,
                error: 'You are not authorized to update this medication'
            });
        }

        // Only allow updating specific fields
        const allowedUpdates = ['status', 'notes', 'reminders'];
        const updates = {};
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        medication = await Medication.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        ).populate({
            path: 'patient',
            populate: {
                path: 'user',
                select: 'firstName lastName email'
            }
        }).populate({
            path: 'doctor',
            select: 'firstName lastName'
        });

        res.status(200).json({
            success: true,
            data: medication
        });
    } catch (error) {
        console.error('Update medication status error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get nurse dashboard stats
// @route   GET /api/v1/nurse/dashboard
// @access  Private/Nurse
exports.getNurseDashboard = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
        }

        // Get assigned patients count
        const totalPatients = nurse.assignedPatients.length;

        // Today time window
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);

        // Appointments booked today for assigned patients (scheduled or confirmed)
        const appointmentsBooked = await Appointment.countDocuments({
            patient: { $in: nurse.assignedPatients.map(p => p.user ? p.user : p) },
            date: { $gte: startOfToday, $lte: endOfToday },
            status: { $in: ['scheduled', 'confirmed'] }
        });

        // Patients visited today (completed appointments)
        const patientsVisited = await Appointment.countDocuments({
            patient: { $in: nurse.assignedPatients.map(p => p.user ? p.user : p) },
            date: { $gte: startOfToday, $lte: endOfToday },
            status: 'completed'
        });

        // Upcoming appointments for assigned patients (next 10)
        const upcomingAppointments = await Appointment.find({
            patient: { $in: nurse.assignedPatients.map(p => p.user ? p.user : p) },
            date: { $gte: new Date() },
            status: { $in: ['scheduled', 'confirmed'] }
        })
        .sort({ date: 1 })
        .limit(10)
        .populate({
            path: 'patient',
            select: 'firstName lastName email'
        })
        .populate({
            path: 'doctor',
            select: 'firstName lastName email'
        });

        // Get recent reports uploaded
        const recentReports = await MedicalRecord.find({
            doctor: req.user.id,
            patient: { $in: nurse.assignedPatients }
        })
        .populate({
            path: 'patient',
            populate: {
                path: 'user',
                select: 'firstName lastName'
            }
        })
        .sort('-createdAt')
        .limit(5);

        // Get active medications for assigned patients
        const activeMedications = await Medication.countDocuments({
            patient: { $in: nurse.assignedPatients },
            status: 'active'
        });

        res.status(200).json({
            success: true,
            data: {
                totalPatients,
                appointmentsBooked,
                patientsVisited,
                upcomingAppointments,
                activeMedications,
                recentReports,
                nurseInfo: {
                    department: nurse.department,
                    shift: nurse.shift
                }
            }
        });
    } catch (error) {
        console.error('Get nurse dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get appointments for assigned patients (with filters)
// @route   GET /api/v1/nurse/appointments
// @access  Private/Nurse
exports.getAssignedAppointments = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id });

        if (!nurse) {
            return res.status(404).json({ success: false, error: 'Nurse profile not found' });
        }

        const { status, startDate, endDate, upcoming } = req.query;

        const filter = {
            patient: { $in: nurse.assignedPatients.map(p => p.user ? p.user : p) }
        };

        if (status && status !== 'all') {
            filter.status = status;
        }

        // Date range filtering
        if (startDate || endDate) {
            filter.date = {};
            if (startDate) filter.date.$gte = new Date(startDate);
            if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Upcoming flag overrides to future scheduled/confirmed
        if (upcoming === 'true') {
            filter.date = { ...(filter.date || {}), $gte: new Date() };
            filter.status = { $in: ['scheduled', 'confirmed'] };
        }

        const appointments = await Appointment.find(filter)
            .sort({ date: 1 })
            .populate({ path: 'patient', select: 'firstName lastName email' })
            .populate({ path: 'doctor', select: 'firstName lastName email' });

        res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        console.error('Get assigned appointments error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get nurse dashboard data
// @route   GET /api/v1/nurse/dashboard-data
// @access  Private/Nurse
exports.getNurseDashboard = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all appointments for today
        const todayAppointments = await Appointment.find({
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // Count booked appointments (all appointments today)
        const appointmentsBooked = todayAppointments.length;

        // Count unique patients who have visited (completed or scheduled appointments today)
        const patientIds = [...new Set(todayAppointments.map(apt => apt.patient.toString()))];
        const patientsVisited = patientIds.length;

        // Get upcoming appointments (future appointments, sorted by date)
        const upcomingAppointments = await Appointment.find({
            date: { $gte: new Date() },
            status: { $in: ['scheduled', 'confirmed'] }
        })
        .sort({ date: 1 })
        .limit(10)
        .populate({
            path: 'patient',
            select: 'firstName lastName email phone profilePicture'
        })
        .populate({
            path: 'doctor',
            select: 'firstName lastName email profilePicture'
        });

        // Get total patients count
        const totalPatients = await Patient.countDocuments();

        // Get pending medical records count
        const pendingReports = await MedicalRecord.countDocuments({
            status: 'new'
        });

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    appointmentsBooked,
                    patientsVisited,
                    totalPatients,
                    pendingReports
                },
                upcomingAppointments,
                todayAppointments: todayAppointments.length
            }
        });
    } catch (error) {
        console.error('Get nurse dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get all appointments for nurse with detailed info
// @route   GET /api/v1/nurse/appointments/all
// @access  Private/Nurse
exports.getAllAppointments = async (req, res, next) => {
    try {
        const { status, date, search } = req.query;
        
        let filter = {};
        
        // Filter by status if provided
        if (status) {
            filter.status = status;
        }
        
        // Filter by date if provided
        if (date) {
            const searchDate = new Date(date);
            const nextDay = new Date(searchDate);
            nextDay.setDate(nextDay.getDate() + 1);
            filter.date = {
                $gte: searchDate,
                $lt: nextDay
            };
        }

        const appointments = await Appointment.find(filter)
            .sort({ date: -1 })
            .populate({
                path: 'patient',
                select: 'firstName lastName email phone profilePicture'
            })
            .populate({
                path: 'doctor',
                select: 'firstName lastName email profilePicture'
            });

        // Search functionality if search term provided
        let filteredAppointments = appointments;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredAppointments = appointments.filter(apt => {
                const patientName = `${apt.patient?.firstName || ''} ${apt.patient?.lastName || ''}`.toLowerCase();
                const doctorName = `${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''}`.toLowerCase();
                const reason = (apt.reason || '').toLowerCase();
                
                return patientName.includes(searchLower) || 
                       doctorName.includes(searchLower) || 
                       reason.includes(searchLower);
            });
        }

        res.status(200).json({
            success: true,
            count: filteredAppointments.length,
            data: filteredAppointments
        });
    } catch (error) {
        console.error('Get all appointments error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get all patients for nurse
// @route   GET /api/v1/nurse/patients/all
// @access  Private/Nurse
exports.getAllPatients = async (req, res, next) => {
    try {
        const { search } = req.query;
        
        // Get all patients with user information
        const patients = await Patient.find()
            .populate({
                path: 'user',
                select: 'firstName lastName email phone profilePicture'
            })
            .sort({ createdAt: -1 });

        // Search functionality if search term provided
        let filteredPatients = patients;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredPatients = patients.filter(patient => {
                const fullName = `${patient.user?.firstName || ''} ${patient.user?.lastName || ''}`.toLowerCase();
                const email = (patient.user?.email || '').toLowerCase();
                const patientId = (patient.patientId || '').toLowerCase();
                
                return fullName.includes(searchLower) || 
                       email.includes(searchLower) || 
                       patientId.includes(searchLower);
            });
        }

        res.status(200).json({
            success: true,
            count: filteredPatients.length,
            data: filteredPatients
        });
    } catch (error) {
        console.error('Get all patients error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Add medical report for consultant
// @route   POST /api/v1/nurse/reports
// @access  Private/Nurse
exports.addMedicalReport = async (req, res, next) => {
    try {
        const { patient, doctor, title, recordType, description, notes, fileUrl } = req.body;

        // Validate required fields
        if (!patient || !doctor || !title || !recordType) {
            return res.status(400).json({
                success: false,
                error: 'Please provide patient, doctor, title, and recordType'
            });
        }

        // Verify patient exists
        const patientExists = await Patient.findById(patient);
        if (!patientExists) {
            return res.status(404).json({
                success: false,
                error: 'Patient not found'
            });
        }

        // Verify doctor exists (doctor is a User ID)
        const User = require('../models/User');
        const doctorExists = await User.findOne({ _id: doctor, role: 'doctor' });
        if (!doctorExists) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Create medical record
        const medicalRecord = await MedicalRecord.create({
            patient,
            doctor,
            title,
            recordType,
            description: description || '',
            notes: notes || '',
            fileUrl: fileUrl || '',
            status: 'new',
            date: new Date()
        });

        // Populate the created record
        const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
            .populate({
                path: 'patient',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email'
                }
            })
            .populate({
                path: 'doctor',
                select: 'firstName lastName email'
            });

        // Send notification to patient
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                recipient: patientExists.user,
                type: 'report',
                title: 'New Medical Report Added',
                message: `A new ${recordType} report "${title}" has been added to your medical records.`,
                relatedData: {
                    recordId: medicalRecord._id,
                    patientId: patient
                }
            });
        } catch (notifError) {
            console.error('Error creating notification:', notifError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            success: true,
            data: populatedRecord
        });
    } catch (error) {
        console.error('Add medical report error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get medical reports
// @route   GET /api/v1/nurse/reports
// @access  Private/Nurse
exports.getMedicalReports = async (req, res, next) => {
    try {
        const { patient, status, recordType } = req.query;
        
        let filter = {};
        
        if (patient) filter.patient = patient;
        if (status) filter.status = status;
        if (recordType) filter.recordType = recordType;

        const reports = await MedicalRecord.find(filter)
            .sort({ createdAt: -1 })
            .populate({
                path: 'patient',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email'
                }
            })
            .populate({
                path: 'doctor',
                select: 'firstName lastName email'
            });

        res.status(200).json({
            success: true,
            count: reports.length,
            data: reports
        });
    } catch (error) {
        console.error('Get medical reports error:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};
