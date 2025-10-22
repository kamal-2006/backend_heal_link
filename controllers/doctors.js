const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');

// @desc    Get all doctors
// @route   GET /api/v1/doctors
// @access  Public
exports.getDoctors = async (req, res, next) => {
    try {
        const doctors = await Doctor.find({ isActive: true })
        .populate({
            path: 'user',
            select: 'firstName lastName email phone'
        })
        .select('specialization user rating consultationFee');
        
        res.status(200).json({ 
            success: true, 
            count: doctors.length, 
            data: doctors 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// @desc    Get doctors by specialization
// @route   GET /api/v1/doctors/specialization/:specialization
// @access  Public
exports.getDoctorsBySpecialization = async (req, res, next) => {
    try {
        const doctors = await Doctor.find({ 
            specialization: req.params.specialization,
            isActive: true 
        }).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        })
        .select('specialization user rating consultationFee');
        
        res.status(200).json({ 
            success: true, 
            count: doctors.length, 
            data: doctors 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// @desc    Get single doctor
// @route   GET /api/v1/doctors/:id
// @access  Public
exports.getDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.findById(req.params.id).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        res.status(200).json({ success: true, data: doctor });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Get available doctors for appointments
// @route   GET /api/v1/doctors/available
// @access  Public
exports.getAvailableDoctors = async (req, res, next) => {
    try {
                const { date, startTime, endTime, specialization, appointmentId } = req.query;
        
                if (!date) {
                    return res.status(400).json({
                        success: false,
                        error: "Please provide a date to check for availability."
                    });
                }
        
                // Build doctor filter query
                let doctorFilterQuery = { isActive: true };
        
                // Filter by specialization if provided
                if (specialization) {
                    doctorFilterQuery.specialization = specialization;
                }
        
                // Find doctors matching the criteria first
                const matchingDoctors = await Doctor.find(doctorFilterQuery).populate({
                    path: 'user',
                    select: 'firstName lastName email phone'
                });
        
                // If no startTime or endTime is specified, return all doctors with the specialization
                if (!startTime || !endTime) {
                    return res.status(200).json({
                        success: true,
                        count: matchingDoctors.length,
                        data: matchingDoctors
                    });
                }
        
                // Create the start and end datetimes for conflict checking
                const requestedStartDateTime = new Date(`${date}T${startTime}:00`);
                const requestedEndDateTime = new Date(`${date}T${endTime}:00`);
        
                const conflictQuery = {
                    date: {
                        $gte: requestedStartDateTime,
                        $lt: requestedEndDateTime
                    },
                    status: { $ne: 'cancelled' }
                };
        
                if (appointmentId) {
                    conflictQuery._id = { $ne: appointmentId };
                }
        
                // Find all appointments that conflict with the requested time range
                const conflictingAppointments = await Appointment.find(conflictQuery).select('doctor date');
        
                // conflictingAppointments.doctor contains User IDs (as per Appointment model)
                const conflictingUserIds = conflictingAppointments.map(a => a.doctor.toString());
        
                // Find all doctors, then filter out those with conflicts
                const allDoctors = await Doctor.find({ isActive: true })
                .populate({
                    path: 'user',
                    select: 'firstName lastName email phone'
                })
                .select('specialization user rating consultationFee');
        
                const availableDoctors = allDoctors.filter(doctor => !conflictingUserIds.includes(doctor.user._id.toString()));
        res.status(200).json({ 
            success: true, 
            count: availableDoctors.length, 
            data: availableDoctors 
        });
    } catch (error) {
        console.error('Get available doctors error:', error);
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
};

// @desc    Create new doctor profile
// @route   POST /api/v1/doctors
// @access  Private (Admin only)
exports.createDoctor = async (req, res, next) => {
    try {
        const { 
            firstName, 
            lastName, 
            specialization, 
            gender,
            experience, 
            phone,
            email,
            workingHours,
            address
        } = req.body;
        
        // Validate required fields
        if (!firstName || !lastName || !specialization || !gender || !experience || !phone || !email) {
            return res.status(400).json({
                success: false,
                error: 'Please provide all required fields: firstName, lastName, specialization, gender, experience, phone, email'
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists'
            });
        }
        
        // Create a new user for the doctor with default password
        const defaultPassword = 'Doctor@123';
        const user = await User.create({
            firstName,
            lastName,
            email,
            phone,
            role: 'doctor',
            password: defaultPassword,
            isDefaultPassword: true
        });
        
        // Parse working hours into availability format
        let availabilityData = null;
        if (workingHours) {
            // Parse working hours format (e.g., "Mon-Fri:10:30-11:30")
            const days = [];
            
            // Extract day information
            if (workingHours.includes('Mon-Fri') || workingHours.includes('Monday-Friday')) {
                days.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');
            }
            if (workingHours.includes('Sat')) days.push('Saturday');
            if (workingHours.includes('Sun')) days.push('Sunday');
            
            // Extract time information - split by the first colon to handle time format with colons
            const timeSlots = [];
            const colonIndex = workingHours.indexOf(':');
            if (colonIndex !== -1) {
                const timeMatch = workingHours.substring(colonIndex + 1).trim();
                
                if (timeMatch && timeMatch.includes('-')) {
                    const [startTime, endTime] = timeMatch.split('-');
                    if (startTime && endTime) {
                        timeSlots.push({
                            startTime: startTime.trim(),
                            endTime: endTime.trim()
                        });
                    }
                }
            }
            
            availabilityData = {
                days,
                timeSlots
            };
        }
        
        // Create hospital data if address is provided
        let hospitalData = null;
        if (address) {
            hospitalData = {
                name: null,
                address: address,
                phone: phone
            };
        }

        // Create doctor with null values for unused fields
        const doctor = await Doctor.create({
            user: user._id,
            specialization,
            experience: parseInt(experience),
            qualification: null,
            about: null,
            consultationFee: null,
            availability: availabilityData,
            hospital: hospitalData,
            rating: 0,
            totalReviews: 0,
            isActive: true
        });
        
        // Populate user data
        await doctor.populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        
        res.status(201).json({
            success: true,
            data: doctor,
            message: 'Doctor created successfully',
            defaultPassword: 'Doctor@123',
            note: 'Please share the default password with the doctor. They should change it on first login.'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Update doctor profile
// @route   PUT /api/v1/doctors/:id
// @access  Private (Doctor owner or Admin)
exports.updateDoctor = async (req, res, next) => {
    try {
        let doctor = await Doctor.findById(req.params.id);
        
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }
        
        // Update doctor information
        const updateData = {};
        
        // Fields that can be updated in the Doctor model
        if (req.body.specialization) updateData.specialization = req.body.specialization;
        if (req.body.experience) updateData.experience = req.body.experience;
        if (req.body.address) updateData['hospital.address'] = req.body.address;
        if (req.body.hasOwnProperty('isActive')) updateData.isActive = req.body.isActive;
        
        // Handle availability updates
        if (req.body.availabilityDays || req.body.timeSlots) {
            updateData.availability = {
                days: req.body.availabilityDays || doctor.availability?.days || [],
                timeSlots: req.body.timeSlots || doctor.availability?.timeSlots || []
            };
        }
        
        // Update doctor record
        doctor = await Doctor.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true
        });
        
        // Update user information if provided
        if (req.body.firstName || req.body.lastName || req.body.phone) {
            const userUpdateData = {};
            if (req.body.firstName) userUpdateData.firstName = req.body.firstName;
            if (req.body.lastName) userUpdateData.lastName = req.body.lastName;
            if (req.body.phone) userUpdateData.phone = req.body.phone;
            
            await User.findByIdAndUpdate(doctor.user, userUpdateData, {
                new: true,
                runValidators: true
            });
        }
        
        // Get updated doctor with populated user data
        const updatedDoctor = await Doctor.findById(req.params.id).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        
        res.status(200).json({
            success: true,
            data: updatedDoctor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Delete doctor
// @route   DELETE /api/v1/doctors/:id
// @access  Private (Admin only)
exports.deleteDoctor = async (req, res, next) => {
    try {
        const doctor = await Doctor.findById(req.params.id);
        
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }
        
        // Also delete the associated user account
        await User.findByIdAndDelete(doctor.user);
        
        // Delete the doctor record
        await doctor.deleteOne();
        
        res.status(200).json({
            success: true,
            data: {},
            message: 'Doctor and associated user account deleted successfully'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Get doctor profile
// @route   GET /api/v1/doctors/me
// @access  Private (Doctor owner)
exports.getDoctorProfile = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id }).populate({
            path: 'user',
            select: 'firstName lastName email phone profilePicture'
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        res.status(200).json({ success: true, data: doctor });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Update doctor profile
// @route   PUT /api/v1/doctors/me
// @access  Private (Doctor owner)
exports.updateDoctorProfile = async (req, res, next) => {
    try {
        let doctor = await Doctor.findOne({ user: req.user.id });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        // Update doctor information
        const doctorUpdateData = {};
        if (req.body.specialization) doctorUpdateData.specialization = req.body.specialization;
        if (req.body.experience) doctorUpdateData.experience = req.body.experience;
        if (req.body.qualification) doctorUpdateData.qualification = req.body.qualification;
        if (req.body.about) doctorUpdateData.about = req.body.about;
        if (req.body.gender) doctorUpdateData.gender = req.body.gender;
        if (req.body.availability && typeof req.body.availability === 'string') {
            doctorUpdateData.availability = JSON.parse(req.body.availability);
        }

        doctor = await Doctor.findByIdAndUpdate(doctor._id, doctorUpdateData, {
            new: true,
            runValidators: true
        });

        // Update user information if provided
        const userUpdateData = {};
        if (req.body.firstName) userUpdateData.firstName = req.body.firstName;
        if (req.body.lastName) userUpdateData.lastName = req.body.lastName;
        if (req.body.mobileNumber) userUpdateData.phone = req.body.mobileNumber;
        if (req.file) userUpdateData.profilePicture = req.file.path;

        if (Object.keys(userUpdateData).length > 0) {
            await User.findByIdAndUpdate(req.user.id, userUpdateData, {
                new: true,
                runValidators: true
            });
        }

        const updatedDoctor = await Doctor.findById(doctor._id).populate({
            path: 'user',
            select: 'firstName lastName email phone profilePicture'
        });

        res.status(200).json({
            success: true,
            data: updatedDoctor
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};

exports.getDoctorDashboardData = async (req, res, next) => {
    try {
        const doctor = await Doctor.findOne({ user: req.user.id });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: 'Doctor not found'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [appointmentsToday, totalPatients, pendingReviews, upcomingAppointments] = await Promise.all([
            Appointment.find({
                doctor: doctor._id,
                date: {
                    $gte: today,
                    $lt: tomorrow
                }
            }).countDocuments(),
            Appointment.distinct('patient', { doctor: doctor._id }),
            // Assuming you have a Review model
            // Review.find({ doctor: doctor._id, status: 'pending' }).countDocuments(),
            Appointment.find({
                doctor: doctor._id,
                date: { $gte: new Date() },
                status: { $in: ['confirmed', 'pending'] }
            }).populate('patient', 'firstName lastName').limit(4)
        ]);

        res.status(200).json({
            success: true,
            data: {
                appointmentsToday,
                totalPatients: totalPatients.length,
                pendingReviews: 0, // placeholder
                upcomingAppointments
            }
        });

    } catch (error) {
        console.error('Error fetching doctor dashboard data:', error);
        res.status(500).json({
            success: false,
            error: 'Server Error'
        });
    }
};

// @desc    Get all patients for a specific doctor
// @route   GET /api/v1/doctors/patients
// @access  Private (Doctor only)
exports.getPatientsByDoctor = async (req, res, next) => {
    try {
        // Find all appointments for the current doctor
        const appointments = await Appointment.find({ doctor: req.user.id }).sort({ date: -1 });

        // Get a unique list of patient IDs from the appointments
        const patientUserIds = [...new Set(appointments.map(appointment => appointment.patient.toString()))];

        // Find all patients with the collected IDs
        const patients = await Patient.find({ user: { $in: patientUserIds } })
            .populate({
                path: 'user',
                select: 'firstName lastName email phone profilePicture'
            })
            .populate('medicalRecords')
            .populate('medications');

        // Create a map of patients for easy lookup
        const patientMap = new Map(patients.map(p => [p.user._id.toString(), p.toObject()]));

        // Add last and next appointment to each patient
        for (const appointment of appointments) {
            const patientId = appointment.patient.toString();
            if (patientMap.has(patientId)) {
                const patient = patientMap.get(patientId);
                if (!patient.lastAppointment && appointment.date < new Date()) {
                    patient.lastAppointment = appointment.date;
                }
                if (!patient.nextAppointment && appointment.date >= new Date()) {
                    patient.nextAppointment = appointment.date;
                }
            }
        }

        const patientsWithDetails = Array.from(patientMap.values());

        res.status(200).json({ 
            success: true, 
            count: patientsWithDetails.length, 
            data: patientsWithDetails 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
};