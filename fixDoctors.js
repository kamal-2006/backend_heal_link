require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

setTimeout(async () => {
  try {
    const Doctor = require('./models/Doctor');
    
    // Check all doctors without isActive filter
    const allDoctors = await Doctor.find().populate('user', 'firstName lastName');
    
    console.log(`Total doctors in database: ${allDoctors.length}\n`);
    
    allDoctors.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.user?.firstName || 'Unknown'} ${doc.user?.lastName || ''}`);
      console.log(`   Specialization: ${doc.specialization}`);
      console.log(`   isActive: ${doc.isActive}`);
      console.log('---');
    });
    
    // Update all doctors to be active
    const updateResult = await Doctor.updateMany({}, { isActive: true });
    console.log(`\nUpdated ${updateResult.modifiedCount} doctors to be active`);
    
    // Check again
    const activeDoctors = await Doctor.find({ isActive: true });
    console.log(`Now ${activeDoctors.length} doctors are active`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}, 2000);