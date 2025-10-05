require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
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

const checkAppointments = async () => {
  try {
    await connectDB();
    
    console.log('Checking appointments in database...\n');
    
    const appointments = await Appointment.find().populate({
      path: 'doctor',
      select: 'firstName lastName specialty'
    }).populate({
      path: 'patient',
      select: 'firstName lastName email phone'
    });
    
    console.log(`Found ${appointments.length} appointments:`);
    
    if (appointments.length === 0) {
      console.log('No appointments found in database.');
      
      // Let's check if we have any users that we could create test appointments with
      const patients = await User.find({ role: 'patient' });
      const doctors = await User.find({ role: 'doctor' });
      
      console.log(`\nFound ${patients.length} patients and ${doctors.length} doctors`);
      
      if (patients.length > 0 && doctors.length > 0) {
        console.log('\nCreating test appointment...');
        
        const testAppointment = await Appointment.create({
          doctor: doctors[0]._id,
          patient: patients[0]._id,
          date: new Date('2025-01-15T10:00:00'),
          reason: 'Regular checkup',
          notes: 'Patient needs routine examination',
          status: 'confirmed'
        });
        
        console.log('✅ Test appointment created:', testAppointment._id);
      }
    } else {
      appointments.forEach((appointment, index) => {
        console.log(`\n${index + 1}. Appointment ID: ${appointment._id}`);
        console.log(`   Patient: ${appointment.patient?.firstName} ${appointment.patient?.lastName}`);
        console.log(`   Doctor: ${appointment.doctor?.firstName} ${appointment.doctor?.lastName}`);
        console.log(`   Date: ${appointment.date}`);
        console.log(`   Reason: ${appointment.reason}`);
        console.log(`   Status: ${appointment.status}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAppointments();