const Nurse = require('../models/Nurse');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Medication = require('../models/Medication');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get nurse profile
// @route   GET /api/v1/nurse/profile
// @access  Private/Nurse
exports.getNurseProfile = async (req, res, next) => {
    try {
        const nurse = await Nurse.findOne({ user: req.user.id })
            .populate({
                path: 'assignedPatients',
                populate: {
                    path: 'user',
                    select: 'firstName lastName email phone'
                }
            });

        if (!nurse) {
            return res.status(404).json({
                success: false,
                error: 'Nurse profile not found'
            });
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

        const { patient, name, dosage, frequency, startDate, endDate, instructions, status, reminders, notes } = req.body;

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
            name,
            dosage,
            frequency,
            startDate,
            endDate,
            instructions,
            status,
            reminders,
            notes
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
