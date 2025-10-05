require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

const testAPIEndpoint = async () => {
  try {
    console.log('🔍 Testing Appointment Booking API Endpoint\n');

    const User = require('./models/User');
    const Patient = require('./models/Patient');
    const Doctor = require('./models/Doctor');

    // Get patient and doctor
    const patient = await Patient.findOne().populate('user');
    const doctor = await Doctor.findOne({ isActive: true }).populate('user');

    if (!patient || !doctor) {
      console.log('❌ Patient or doctor not found');
      return;
    }

    console.log(`👤 Patient: ${patient.user.firstName} ${patient.user.lastName}`);
    console.log(`👨‍⚕️ Doctor: Dr. ${doctor.user.firstName} ${doctor.user.lastName}`);
    console.log(`📧 Patient Email: ${patient.user.email}`);

    // Let's simulate what the frontend should send
    const appointmentData = {
      doctor: doctor._id, // Doctor document ID
      date: '2024-12-31T15:00:00',
      reason: 'API endpoint test',
      notes: 'Testing the API endpoint directly'
    };

    console.log('\n📝 Appointment data to send:');
    console.log(JSON.stringify(appointmentData, null, 2));

    // Now let's test what happens in the controller
    console.log('\n🧪 Simulating controller logic...');

    // Step 1: Get patient record for current user (this would be req.user.id)
    const patientRecord = await Patient.findOne({ user: patient.user._id });
    if (!patientRecord) {
      console.log('❌ Patient profile not found');
      return;
    }
    console.log('✅ Patient record found');

    // Step 2: Check if doctor exists
    const doctorRecord = await Doctor.findById(appointmentData.doctor).populate('user');
    if (!doctorRecord) {
      console.log('❌ Doctor not found with ID:', appointmentData.doctor);
      return;
    }
    console.log('✅ Doctor record found');

    // Step 3: Check conflicts
    const appointmentDate = new Date(appointmentData.date);
    const existingAppointment = await mongoose.model('Appointment').findOne({
      doctor: doctorRecord.user._id,
      date: appointmentDate,
      status: { $ne: 'cancelled' }
    });

    if (existingAppointment) {
      console.log('❌ Conflict found:', existingAppointment);
      return;
    }
    console.log('✅ No conflicts');

    // Step 4: Create appointment
    const Appointment = require('./models/Appointment');
    const newAppointment = await Appointment.create({
      doctor: doctorRecord.user._id,
      patient: patient.user._id, // This would be req.user.id
      date: appointmentDate,
      reason: appointmentData.reason,
      notes: appointmentData.notes || ''
    });

    console.log('✅ Appointment created:', newAppointment._id);

    // Step 5: Populate for response
    const populated = await Appointment.findById(newAppointment._id)
      .populate('doctor', 'firstName lastName email')
      .populate('patient', 'firstName lastName email');

    console.log('\n🎉 SUCCESS! API would return:');
    console.log(JSON.stringify({
      success: true,
      data: populated
    }, null, 2));

    console.log('\n💡 Troubleshooting tips:');
    console.log('1. Make sure patient is logged in with valid token');
    console.log('2. Check that frontend is sending doctor._id (Doctor document ID)');
    console.log('3. Verify date format is ISO string (YYYY-MM-DDTHH:mm:ss)');
    console.log('4. Check browser console for detailed error messages');

  } catch (error) {
    console.error('❌ Error during API test:', error);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
};

setTimeout(testAPIEndpoint, 2000);