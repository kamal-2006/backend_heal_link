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

const testLogin = async () => {
  try {
    await connectDB();
    
    console.log('Testing doctor login with default password...\n');
    
    // Find a doctor user
    const doctorUser = await User.findOne({ role: 'doctor' }).select('+password +isDefaultPassword');
    
    if (!doctorUser) {
      console.log('No doctor users found');
      process.exit(0);
    }
    
    console.log(`Testing login for doctor: ${doctorUser.firstName} ${doctorUser.lastName}`);
    console.log(`Email: ${doctorUser.email}`);
    console.log(`Has default password: ${doctorUser.isDefaultPassword}`);
    
    // Test the default password
    const defaultPassword = 'Doctor@123';
    const isMatch = await doctorUser.matchPassword(defaultPassword);
    
    console.log(`\nPassword test:`);
    console.log(`Default password (${defaultPassword}): ${isMatch ? '✅ WORKS' : '❌ FAILED'}`);
    
    if (isMatch) {
      console.log('\n🎉 Success! Doctor can login with default password.');
      console.log('📧 Doctor should be prompted to change password on first login.');
    } else {
      console.log('\n❌ Default password test failed.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testLogin();