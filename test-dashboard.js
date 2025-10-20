const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

// Import models
const User = require('./models/User');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const testDashboard = async () => {
  try {
    await connectDB();
    
    console.log('\n=== TESTING DASHBOARD FUNCTIONALITY ===\n');
    
    // Get all users
    const users = await User.find().select('firstName lastName email role');
    console.log('📊 All Users:');
    users.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
    });
    
    // Get all appointments
    const appointments = await Appointment.find()
      .populate({
        path: 'doctor',
        select: 'firstName lastName email'
      })
      .populate({
        path: 'patient',
        select: 'firstName lastName email'
      })
      .sort('-date');
    
    console.log('\n📅 All Appointments:');
    appointments.forEach(apt => {
      console.log(`  - ${apt.patient?.firstName} ${apt.patient?.lastName} -> Dr. ${apt.doctor?.firstName} ${apt.doctor?.lastName}`);
      console.log(`    Date: ${apt.date}, Status: ${apt.status}, Reason: ${apt.reason}`);
    });
    
    // Test the dashboard endpoint logic
    const patients = await User.find({ role: 'patient' });
    if (patients.length > 0) {
      const testPatient = patients[0];
      console.log(`\n🧪 Testing dashboard for patient: ${testPatient.firstName} ${testPatient.lastName}`);
      
      // Get appointments for this patient
      const patientAppointments = await Appointment.find({ patient: testPatient._id })
        .populate({
          path: 'doctor',
          select: 'firstName lastName email specialization'
        })
        .sort({ date: -1 });

      console.log(`  Found ${patientAppointments.length} appointments for this patient`);
      
      // Get upcoming appointments
      const upcomingAppointments = patientAppointments.filter(apt => 
        (apt.status === 'scheduled' || apt.status === 'confirmed') && 
        new Date(apt.date) > new Date()
      );
      
      console.log(`  Upcoming appointments: ${upcomingAppointments.length}`);
      upcomingAppointments.forEach(apt => {
        console.log(`    - ${apt.date} with Dr. ${apt.doctor?.firstName} ${apt.doctor?.lastName} (${apt.status})`);
      });
      
      // Get completed appointments
      const completedAppointments = patientAppointments.filter(apt => apt.status === 'completed');
      console.log(`  Completed appointments: ${completedAppointments.length}`);
      completedAppointments.forEach(apt => {
        console.log(`    - ${apt.date} with Dr. ${apt.doctor?.firstName} ${apt.doctor?.lastName}`);
      });
    }
    
    console.log('\n✅ Dashboard test complete');
    process.exit(0);
    
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
};

testDashboard();