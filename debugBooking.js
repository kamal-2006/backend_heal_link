require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

const debugAppointmentBooking = async () => {
  try {
    console.log('🔍 Debugging Appointment Booking API\n');

    const User = require('./models/User');
    const Patient = require('./models/Patient');
    const Doctor = require('./models/Doctor');
    const Appointment = require('./models/Appointment');

    // Get a patient and doctor for testing
    const patient = await Patient.findOne().populate('user');
    const doctor = await Doctor.findOne({ isActive: true }).populate('user');

    if (!patient || !doctor) {
      console.log('❌ Patient or doctor not found');
      return;
    }

    console.log(`👤 Patient: ${patient.user.firstName} ${patient.user.lastName} (ID: ${patient.user._id})`);
    console.log(`👨‍⚕️ Doctor: Dr. ${doctor.user.firstName} ${doctor.user.lastName} (ID: ${doctor._id})`);
    console.log(`👨‍⚕️ Doctor User ID: ${doctor.user._id}\n`);

    // Test the booking logic from the controller
    console.log('🧪 Testing booking logic...');

    // Simulate the frontend request data
    const requestData = {
      doctor: doctor._id, // This is what frontend sends - Doctor document ID
      date: new Date('2024-12-31T15:00:00'), // New Year's Eve at 3 PM
      reason: 'Debug test appointment',
      notes: 'Testing the booking endpoint logic'
    };

    console.log('📝 Request data:');
    console.log(`   Doctor ID: ${requestData.doctor} (Doctor document ID)`);
    console.log(`   Date: ${requestData.date}`);
    console.log(`   Reason: ${requestData.reason}`);

    // Test Step 1: Find the doctor
    console.log('\n🔍 Step 1: Finding doctor...');
    const foundDoctor = await Doctor.findById(requestData.doctor).populate('user');
    if (foundDoctor) {
      console.log(`✅ Doctor found: Dr. ${foundDoctor.user.firstName} ${foundDoctor.user.lastName}`);
      console.log(`   Doctor document ID: ${foundDoctor._id}`);
      console.log(`   Doctor user ID: ${foundDoctor.user._id}`);
    } else {
      console.log('❌ Doctor not found with ID:', requestData.doctor);
      return;
    }

    // Test Step 2: Check for existing appointments
    console.log('\n🔍 Step 2: Checking for conflicts...');
    const existingAppointment = await Appointment.findOne({
      doctor: foundDoctor.user._id, // Use the user ID from doctor
      date: requestData.date,
      status: { $ne: 'cancelled' }
    });

    if (existingAppointment) {
      console.log('❌ Conflict found:', existingAppointment);
      return;
    } else {
      console.log('✅ No conflicts found');
    }

    // Test Step 3: Create appointment
    console.log('\n🔍 Step 3: Creating appointment...');
    const appointmentData = {
      doctor: foundDoctor.user._id, // Use the user ID from doctor
      patient: patient.user._id, // Current user is the patient
      date: requestData.date,
      reason: requestData.reason,
      notes: requestData.notes || ''
    };

    console.log('📋 Appointment data for creation:');
    console.log(`   Doctor (User ID): ${appointmentData.doctor}`);
    console.log(`   Patient (User ID): ${appointmentData.patient}`);
    console.log(`   Date: ${appointmentData.date}`);

    const appointment = await Appointment.create(appointmentData);
    console.log('✅ Appointment created successfully!');
    console.log(`   Appointment ID: ${appointment._id}`);
    console.log(`   Status: ${appointment.status}`);

    // Test Step 4: Populate the appointment
    console.log('\n🔍 Step 4: Populating appointment...');
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate({
        path: 'doctor',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'patient',
        select: 'firstName lastName email'
      });

    console.log('✅ Populated appointment:');
    console.log(`   ID: ${populatedAppointment._id}`);
    console.log(`   Doctor: Dr. ${populatedAppointment.doctor.firstName} ${populatedAppointment.doctor.lastName}`);
    console.log(`   Patient: ${populatedAppointment.patient.firstName} ${populatedAppointment.patient.lastName}`);
    console.log(`   Date: ${populatedAppointment.date}`);
    console.log(`   Status: ${populatedAppointment.status}`);
    console.log(`   Reason: ${populatedAppointment.reason}`);

    console.log('\n🎉 Booking logic test SUCCESSFUL!');
    console.log('\n🔧 API Response would be:');
    console.log(JSON.stringify({
      success: true,
      data: {
        _id: populatedAppointment._id,
        doctor: {
          firstName: populatedAppointment.doctor.firstName,
          lastName: populatedAppointment.doctor.lastName,
          email: populatedAppointment.doctor.email
        },
        patient: {
          firstName: populatedAppointment.patient.firstName,
          lastName: populatedAppointment.patient.lastName,
          email: populatedAppointment.patient.email
        },
        date: populatedAppointment.date,
        reason: populatedAppointment.reason,
        status: populatedAppointment.status
      }
    }, null, 2));

  } catch (error) {
    console.error('❌ Error during booking debug:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    process.exit(0);
  }
};

setTimeout(debugAppointmentBooking, 2000);