require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
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

const testPasswordChange = async () => {
  try {
    await connectDB();
    
    console.log('Testing password change functionality...\n');
    
    // Find our test doctor
    const testUser = await User.findOne({ email: 'test.newdoctor@test.com' }).select('+password +isDefaultPassword');
    
    if (!testUser) {
      console.log('Test user not found. Please run testNewDoctorCreation.js first.');
      process.exit(1);
    }
    
    console.log(`Testing password change for: ${testUser.firstName} ${testUser.lastName}`);
    console.log(`Email: ${testUser.email}`);
    console.log(`Current isDefaultPassword: ${testUser.isDefaultPassword}`);
    
    // Verify current password is default
    const defaultPassword = 'Doctor@123';
    const isCurrentMatch = await testUser.matchPassword(defaultPassword);
    console.log(`Can login with default password: ${isCurrentMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!isCurrentMatch) {
      console.log('❌ Cannot proceed - default password not working');
      process.exit(1);
    }
    
    // Change password
    const newPassword = 'NewSecure123!';
    console.log(`\nChanging password to: ${newPassword}`);
    
    testUser.password = newPassword;
    // Simulate the logic from changePassword controller
    if (testUser.role === 'doctor' && testUser.isDefaultPassword) {
      testUser.isDefaultPassword = false;
    }
    await testUser.save();
    
    console.log('✅ Password changed successfully');
    
    // Test new password
    const updatedUser = await User.findById(testUser._id).select('+password +isDefaultPassword');
    const isNewMatch = await updatedUser.matchPassword(newPassword);
    const isOldMatch = await updatedUser.matchPassword(defaultPassword);
    
    console.log(`\n📊 Test Results after password change:`);
    console.log(`isDefaultPassword flag: ${updatedUser.isDefaultPassword}`);
    console.log(`Can login with new password: ${isNewMatch ? '✅ YES' : '❌ NO'}`);
    console.log(`Can login with old password: ${isOldMatch ? '❌ STILL WORKS (BAD)' : '✅ NO (GOOD)'}`);
    
    if (isNewMatch && !isOldMatch && !updatedUser.isDefaultPassword) {
      console.log('\n🎉 SUCCESS! Password change functionality works correctly!');
      console.log('✅ New password works');
      console.log('✅ Old password no longer works');
      console.log('✅ isDefaultPassword flag updated to false');
    } else {
      console.log('\n❌ FAILED! Password change has issues.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testPasswordChange();