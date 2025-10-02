const Doctor = require('../models/Doctor');
const User = require('../models/User');

// @desc    Get all doctors
// @route   GET /api/v1/doctors
// @access  Public
exports.getDoctors = async (req, res, next) => {
    try {
        const doctors = await Doctor.find({ isActive: true }).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        
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
        });
        
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
        const { date, specialization, time } = req.query;
        
        let query = { isActive: true };
        
        if (specialization && specialization !== 'all') {
            query.specialization = specialization;
        }
        
        const doctors = await Doctor.find(query).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        
        // Filter doctors based on their availability
        let availableDoctors = doctors;
        
        if (date) {
            const requestedDate = new Date(date);
            const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()];
            
            // Filter doctors by day availability
            availableDoctors = doctors.filter(doctor => 
                doctor.availability && 
                doctor.availability.days && 
                doctor.availability.days.includes(dayOfWeek)
            );
            
            // If time is provided, further filter by time slots
            if (time) {
                availableDoctors = availableDoctors.filter(doctor => {
                    if (!doctor.availability || !doctor.availability.timeSlots || doctor.availability.timeSlots.length === 0) {
                        return false;
                    }
                    
                    // Check if the requested time falls within any of the doctor's time slots
                    return doctor.availability.timeSlots.some(slot => {
                        return time >= slot.startTime && time <= slot.endTime;
                    });
                });
            }
        }
        
        res.status(200).json({ 
            success: true, 
            count: availableDoctors.length, 
            data: availableDoctors 
        });
    } catch (error) {
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
        const { userId, specialization, experience, qualification, about, consultationFee, availability, hospital } = req.body;
        
        // Check if user exists and has doctor role
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        if (user.role !== 'doctor') {
            return res.status(400).json({
                success: false,
                error: 'User must have doctor role'
            });
        }
        
        // Check if doctor profile already exists
        const existingDoctor = await Doctor.findOne({ user: userId });
        if (existingDoctor) {
            return res.status(400).json({
                success: false,
                error: 'Doctor profile already exists for this user'
            });
        }
        
        const doctor = await Doctor.create({
            user: userId,
            specialization,
            experience,
            qualification,
            about,
            consultationFee,
            availability,
            hospital
        });
        
        await doctor.populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        
        res.status(201).json({
            success: true,
            data: doctor
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
        
        // Make sure user is doctor owner or admin
        if (doctor.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to update this doctor profile'
            });
        }
        
        doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        }).populate({
            path: 'user',
            select: 'firstName lastName email phone'
        });
        
        res.status(200).json({
            success: true,
            data: doctor
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
        
        await doctor.deleteOne();
        
        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
};