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

// Helper function to update doctor's availability with appointment times
const updateDoctorAvailability = async (doctorId, appointmentDate, appointmentId = null, action = 'add') => {
  try {
    console.log(`Updating doctor availability: ${doctorId}, date: ${appointmentDate}, action: ${action}`);
    
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      console.log('Doctor not found');
      return;
    }

    const date = new Date(appointmentDate);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
    const timeSlot = {
      startTime: date.toTimeString().slice(0, 5), // HH:MM format
      endTime: new Date(date.getTime() + 30 * 60000).toTimeString().slice(0, 5), // +30 minutes
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      appointmentId: appointmentId
    };

    // Initialize availability if it doesn't exist
    if (!doctor.availability) {
      doctor.availability = {
        days: [],
        timeSlots: []
      };
    }

    // Add day if not already present
    if (!doctor.availability.days.includes(dayOfWeek)) {
      doctor.availability.days.push(dayOfWeek);
    }

    if (action === 'add') {
      // Add appointment time slot
      doctor.availability.timeSlots.push(timeSlot);
      console.log(`Added appointment slot: ${timeSlot.startTime}-${timeSlot.endTime} on ${timeSlot.date}`);
    } else if (action === 'remove') {
      // Remove appointment time slot
      const appointmentDateStr = date.toISOString().split('T')[0];
      const appointmentTime = date.toTimeString().slice(0, 5);
      
      doctor.availability.timeSlots = doctor.availability.timeSlots.filter(slot => {
        return !(slot.date === appointmentDateStr && slot.startTime === appointmentTime);
      });
      console.log(`Removed appointment slot: ${appointmentTime} on ${appointmentDateStr}`);
    }

    await doctor.save();
    console.log('Doctor availability updated successfully');
  } catch (error) {
    console.error('Error updating doctor availability:', error);
  }
};

const testAvailabilityUpdate = async () => {
  try {
    await connectDB();
    
    console.log('Testing doctor availability update functionality...\n');
    
    // Get all appointments
    const appointments = await Appointment.find().populate('doctor patient');
    console.log(`Found ${appointments.length} appointments to process\n`);
    
    if (appointments.length === 0) {
      console.log('No appointments found to test with');
      process.exit(0);
    }
    
    // Test updating availability for each appointment
    for (const appointment of appointments) {
      if (appointment.doctor) {
        console.log(`\nProcessing appointment ${appointment._id}:`);
        console.log(`- Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`);
        console.log(`- Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`);
        console.log(`- Date: ${appointment.date}`);
        console.log(`- Status: ${appointment.status}`);
        
        await updateDoctorAvailability(appointment.doctor._id, appointment.date, appointment._id, 'add');
      }
    }
    
    console.log('\n✅ All appointments processed!');
    
    // Show updated doctor availability
    const doctorsWithAppointments = await Doctor.find({
      'availability.timeSlots.0': { $exists: true }
    }).populate('user');
    
    console.log(`\n📊 Doctors with updated availability: ${doctorsWithAppointments.length}`);
    
    doctorsWithAppointments.forEach((doctor, index) => {
      console.log(`\n${index + 1}. Dr. ${doctor.user?.firstName} ${doctor.user?.lastName}`);
      console.log(`   Specialization: ${doctor.specialization}`);
      console.log(`   Available days: ${doctor.availability.days?.join(', ') || 'None'}`);
      console.log(`   Time slots (${doctor.availability.timeSlots?.length || 0}):`);
      
      doctor.availability.timeSlots?.forEach((slot, slotIndex) => {
        const isBooked = slot.appointmentId ? 'Yes' : 'No';
        console.log(`     ${slotIndex + 1}. ${slot.startTime}-${slot.endTime} on ${slot.date || 'No date'} (Booked: ${isBooked})`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testAvailabilityUpdate();