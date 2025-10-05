require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const User = require('./models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

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

        console.log(`Updating availability for doctor: ${doctor.user || doctor._id}`);
        console.log(`Found ${appointments.length} appointments`);

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

        console.log('Generated timeSlots:', timeSlots);

        // Update doctor availability
        await Doctor.findByIdAndUpdate(doctorId, {
            $set: {
                'availability.timeSlots': timeSlots
            }
        });

        console.log(`✅ Updated availability for doctor ${doctor._id}`);
    } catch (error) {
        console.error('Error updating doctor availability:', error);
    }
};

const syncAppointmentsToAvailability = async () => {
  try {
    await connectDB();
    
    console.log('Syncing all appointments to doctor availability...\n');
    
    // Get all appointments
    const appointments = await Appointment.find().populate('doctor');
    console.log(`Found ${appointments.length} appointments`);
    
    // Get unique doctor IDs
    const doctorUserIds = [...new Set(appointments.map(app => app.doctor?.toString()).filter(Boolean))];
    console.log(`Found ${doctorUserIds.length} unique doctor user IDs`);
    
    // For each doctor, find their doctor profile and update availability
    for (const doctorUserId of doctorUserIds) {
      const doctorProfile = await Doctor.findOne({ user: doctorUserId });
      
      if (doctorProfile) {
        console.log(`\nProcessing doctor profile: ${doctorProfile._id}`);
        await updateDoctorAvailability(doctorUserId);
      } else {
        console.log(`⚠️ No doctor profile found for user ID: ${doctorUserId}`);
      }
    }
    
    console.log('\n✅ Sync completed!');
    
    // Display final state
    const updatedDoctors = await Doctor.find({ 'availability.timeSlots': { $exists: true, $ne: [] } });
    console.log(`\n📊 ${updatedDoctors.length} doctors now have availability timeSlots:`);
    
    for (const doctor of updatedDoctors) {
      console.log(`\nDoctor ID: ${doctor._id}`);
      console.log(`TimeSlots: ${doctor.availability.timeSlots.length} slots`);
      doctor.availability.timeSlots.forEach((slot, index) => {
        console.log(`  ${index + 1}. ${slot.date} ${slot.startTime}-${slot.endTime} (Appointment: ${slot.appointmentId})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

syncAppointmentsToAvailability();