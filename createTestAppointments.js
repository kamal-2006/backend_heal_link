require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

const createTestAppointments = async () => {
  try {
    console.log('🧪 Creating Test Appointments for Current Date\n');

    const User = require('./models/User');
    const Patient = require('./models/Patient');
    const Doctor = require('./models/Doctor');
    const Appointment = require('./models/Appointment');

    // Get patient and doctor
    const patient = await Patient.findOne().populate('user');
    const doctor = await Doctor.findOne({ isActive: true }).populate('user');

    if (!patient || !doctor) {
      console.log('❌ Patient or doctor not found');
      return;
    }

    // Create upcoming appointments with current/future dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(14, 30, 0, 0);

    const appointments = [
      {
        doctor: doctor.user._id,
        patient: patient.user._id,
        date: tomorrow,
        reason: 'Regular checkup',
        notes: 'Annual health checkup'
      },
      {
        doctor: doctor.user._id,
        patient: patient.user._id,
        date: nextWeek,
        reason: 'Follow-up visit',
        notes: 'Follow-up after treatment'
      }
    ];

    // Clear existing test appointments
    await Appointment.deleteMany({ 
      patient: patient.user._id,
      reason: { $regex: /Regular checkup|Follow-up visit/i }
    });

    console.log('📅 Creating appointments:');
    for (let aptData of appointments) {
      const appointment = await Appointment.create(aptData);
      console.log(`✅ Created: ${aptData.reason} - ${aptData.date.toLocaleDateString()} at ${aptData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }

    // Verify upcoming appointments
    const upcomingAppointments = await Appointment.find({ 
      patient: patient.user._id,
      date: { $gte: today },
      status: { $ne: 'cancelled' }
    })
    .populate('doctor', 'firstName lastName')
    .sort({ date: 1 });

    console.log(`\n📋 Patient now has ${upcomingAppointments.length} upcoming appointments:`);
    upcomingAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. Dr. ${apt.doctor.firstName} ${apt.doctor.lastName} - ${apt.date.toLocaleDateString()} at ${apt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${apt.status})`);
    });

    console.log('\n🎉 Test appointments created successfully!');
    console.log('These should now appear on the patient dashboard and appointments page.');

  } catch (error) {
    console.error('❌ Error creating test appointments:', error);
  } finally {
    process.exit(0);
  }
};

setTimeout(createTestAppointments, 2000);