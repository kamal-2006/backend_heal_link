const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

// Import models
const User = require('./models/User');
const Appointment = require('./models/Appointment');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const createTestData = async () => {
  try {
    await connectDB();
    
    console.log('\n=== CREATING TEST DATA FOR FEEDBACK ===\n');
    
    // Find past appointments (before today) and mark some as completed
    const pastAppointments = await Appointment.find({
      date: { $lt: new Date() },
      status: 'scheduled'
    })
    .populate({
      path: 'doctor',
      select: 'firstName lastName email'
    })
    .populate({
      path: 'patient',
      select: 'firstName lastName email'
    })
    .limit(3); // Only update 3 appointments
    
    console.log(`Found ${pastAppointments.length} past scheduled appointments to mark as completed:`);
    
    for (let apt of pastAppointments) {
      console.log(`  - Marking appointment ${apt._id} as completed`);
      console.log(`    ${apt.patient?.firstName} ${apt.patient?.lastName} -> Dr. ${apt.doctor?.firstName} ${apt.doctor?.lastName}`);
      console.log(`    Date: ${apt.date}, Reason: ${apt.reason}`);
      
      await Appointment.findByIdAndUpdate(apt._id, { status: 'completed' });
    }
    
    console.log('\n✅ Test data creation complete');
    
    // Verify the changes
    const completedCount = await Appointment.countDocuments({ status: 'completed' });
    console.log(`📊 Total completed appointments in database: ${completedCount}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Test data creation error:', error);
    process.exit(1);
  }
};

createTestData();