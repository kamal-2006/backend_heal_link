require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

setTimeout(async () => {
  try {
    const User = require('./models/User');
    const Doctor = require('./models/Doctor');
    const doctors = await Doctor.find().populate('user', 'name');
    
    console.log('Available Doctors:');
    console.log('Total doctors:', doctors.length);
    
    doctors.forEach((doc, index) => {
      console.log(`\n${index + 1}. Name: ${doc.user ? doc.user.name : 'No User Linked'}`);
      console.log(`   User ID: ${doc.user ? doc.user._id : 'null'}`);
      console.log(`   Specialization: ${doc.specialization}`);
      console.log(`   Available Days: ${doc.availability.days.join(', ')}`);
      console.log(`   Time Slots: ${doc.availability.timeSlots.join(', ')}`);
      console.log(`   Fee: $${doc.consultationFee}`);
    });
    
    // Also check what specializations we have
    const specializations = [...new Set(doctors.map(d => d.specialization))];
    console.log('\nAvailable Specializations:');
    specializations.forEach(spec => console.log(`- ${spec}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}, 2000);