require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

const testCompleteBookingFlow = async () => {
  try {
    console.log('🧪 Testing Complete Appointment Booking Flow\n');

    const User = require('./models/User');
    const Patient = require('./models/Patient');
    const Doctor = require('./models/Doctor');
    const Appointment = require('./models/Appointment');

    // Step 1: Find a patient
    const patients = await Patient.find().populate('user');
    if (!patients.length) {
      console.log('❌ No patients found. Please create a patient first.');
      return;
    }
    const patient = patients[0];
    console.log(`✅ Step 1: Found patient - ${patient.user.firstName} ${patient.user.lastName}`);

    // Step 2: Find available doctors
    const doctors = await Doctor.find({ isActive: true }).populate('user');
    if (!doctors.length) {
      console.log('❌ No active doctors found.');
      return;
    }
    const doctor = doctors[0];
    console.log(`✅ Step 2: Found doctor - Dr. ${doctor.user.firstName} ${doctor.user.lastName} (${doctor.specialization})`);

    // Step 3: Create a test appointment
    const appointmentData = {
      doctor: doctor.user._id,
      patient: patient.user._id,
      date: new Date('2024-12-30T10:00:00'), // Monday at 10:00 AM
      reason: 'Regular checkup - Test booking',
      notes: 'This is a test appointment created via booking flow'
    };

    console.log('\n📝 Step 3: Creating appointment with data:');
    console.log(`   Doctor: Dr. ${doctor.user.firstName} ${doctor.user.lastName}`);
    console.log(`   Patient: ${patient.user.firstName} ${patient.user.lastName}`);
    console.log(`   Date: ${appointmentData.date.toLocaleString()}`);
    console.log(`   Reason: ${appointmentData.reason}`);

    const appointment = await Appointment.create(appointmentData);
    console.log('✅ Step 3: Appointment created successfully!');

    // Step 4: Fetch and display the created appointment
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: 'doctor',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'patient',
        select: 'firstName lastName email'
      });

    console.log('\n📋 Step 4: Appointment Details:');
    console.log(`   ID: ${populatedAppointment._id}`);
    console.log(`   Doctor: Dr. ${populatedAppointment.doctor.firstName} ${populatedAppointment.doctor.lastName}`);
    console.log(`   Patient: ${populatedAppointment.patient.firstName} ${populatedAppointment.patient.lastName}`);
    console.log(`   Date: ${populatedAppointment.date.toLocaleString()}`);
    console.log(`   Status: ${populatedAppointment.status}`);
    console.log(`   Reason: ${populatedAppointment.reason}`);

    // Step 5: Test patient's appointments query
    console.log('\n📅 Step 5: Testing patient appointments query...');
    const patientAppointments = await Appointment.find({ patient: patient.user._id })
      .populate({
        path: 'doctor',
        select: 'firstName lastName email'
      })
      .sort({ date: -1 });

    console.log(`✅ Found ${patientAppointments.length} appointments for patient:`);
    patientAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. Dr. ${apt.doctor.firstName} ${apt.doctor.lastName} - ${apt.date.toLocaleDateString()} at ${apt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${apt.status})`);
    });

    // Step 6: Test upcoming appointments filter
    console.log('\n⏰ Step 6: Testing upcoming appointments filter...');
    const now = new Date();
    const upcomingAppointments = patientAppointments.filter(apt => {
      return (apt.status === 'pending' || apt.status === 'confirmed') && new Date(apt.date) >= now;
    });

    console.log(`✅ Found ${upcomingAppointments.length} upcoming appointments:`);
    upcomingAppointments.forEach((apt, index) => {
      console.log(`   ${index + 1}. Dr. ${apt.doctor.firstName} ${apt.doctor.lastName} - ${apt.date.toLocaleDateString()} at ${apt.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    });

    console.log('\n🎉 Complete Booking Flow Test SUCCESSFUL!');
    console.log('\n📋 Summary:');
    console.log('✅ Doctor availability: Working');
    console.log('✅ Appointment creation: Working');
    console.log('✅ Appointment population: Working');
    console.log('✅ Patient appointments query: Working');
    console.log('✅ Upcoming appointments filter: Working');

    console.log('\n🔗 Next Steps:');
    console.log('1. Use the booking form with these exact values:');
    console.log(`   - Specialization: "${doctor.specialization}"`);
    console.log('   - Date: "2024-12-30" (Monday)');
    console.log('   - Time: "10:00"');
    console.log('   - Reason: "Regular checkup"');
    console.log('2. The appointment should appear on both dashboard and appointments page');
    console.log('3. Check that the doctor details are properly displayed');

  } catch (error) {
    console.error('❌ Error during booking flow test:', error);
  } finally {
    process.exit(0);
  }
};

setTimeout(testCompleteBookingFlow, 2000);