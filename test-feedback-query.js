require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/db');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const User = require('./models/User');

async function testFeedbackQuery() {
  try {
    await connectDB();
    console.log('🔍 Testing feedback query...\n');
    
    // Find a patient ID first
    const sampleAppointment = await Appointment.findOne().populate('patient').populate('doctor');
    if (!sampleAppointment) {
      console.log('❌ No appointments found');
      return;
    }
    
    const patientId = sampleAppointment.patient._id;
    console.log('👤 Testing with patient:', sampleAppointment.patient.name, '(' + patientId + ')');
    
    // Test the exact query from the fixed controller
    console.log('\n📋 Running fixed query from controller...');
    const appointments = await Appointment.find({
      patient: patientId,
      status: 'completed',
      doctor: { $exists: true, $ne: null }
    })
    .populate('doctor', 'name email')
    .populate('patient', 'name email')
    .sort({ appointmentDate: -1 });
    
    console.log('✅ Found', appointments.length, 'completed appointments with doctors');
    
    if (appointments.length > 0) {
      console.log('\n📊 Appointment details:');
      appointments.forEach((apt, index) => {
        console.log(`  ${index + 1}. ${new Date(apt.appointmentDate).toLocaleDateString()} - ${apt.doctor ? apt.doctor.name : 'NO DOCTOR'} - Reason: ${apt.reason}`);
      });
      
      console.log('\n🔧 Testing data transformation (checking for null safety)...');
      const transformedAppointments = appointments.map(appointment => {
        const doctor = appointment.doctor;
        const patient = appointment.patient;
        
        if (!doctor) {
          console.log('⚠️  Found appointment without doctor, this should not happen with our filter');
          return null;
        }
        
        return {
          _id: appointment._id,
          appointmentDate: appointment.appointmentDate,
          reason: appointment.reason,
          status: appointment.status,
          doctor: {
            _id: doctor._id,
            name: doctor.name,
            email: doctor.email
          },
          patient: patient ? {
            _id: patient._id,
            name: patient.name,
            email: patient.email
          } : null,
          hasFeedback: appointment.hasFeedback || false
        };
      }).filter(Boolean);
      
      console.log('✅ Transformed', transformedAppointments.length, 'appointments successfully');
      console.log('🎯 No null reference errors during transformation!');
      
    } else {
      console.log('\n📋 No completed appointments found for this patient');
      
      // Let's check if there are any completed appointments at all
      const allCompleted = await Appointment.find({ status: 'completed' })
        .populate('doctor', 'name')
        .populate('patient', 'name');
        
      console.log('📊 Total completed appointments in database:', allCompleted.length);
      
      if (allCompleted.length > 0) {
        console.log('👥 Patients with completed appointments:');
        const patientsWithCompleted = [...new Set(allCompleted.map(apt => apt.patient?.name).filter(Boolean))];
        patientsWithCompleted.forEach((name, index) => {
          console.log(`  ${index + 1}. ${name}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

testFeedbackQuery();