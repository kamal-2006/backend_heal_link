require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const testNewDoctorCreation = async () => {
  try {
    await connectDB();
    
    console.log('Testing new doctor creation with default password...\n');
    
    const testDoctorData = {
      firstName: 'Test',
      lastName: 'NewDoctor',
      specialization: 'Dermatology',
      gender: 'Female',
      experience: 6,
      phone: '+1234567896',
      email: 'test.newdoctor@test.com',
      workingHours: 'Mon-Fri: 9AM-5PM',
      address: '789 New Hospital'
    };
    
    // Check if email already exists (cleanup if needed)
    const existingUser = await User.findOne({ email: testDoctorData.email });
    if (existingUser) {
      console.log('Cleaning up existing test user...');
      await Doctor.deleteOne({ user: existingUser._id });
      await User.deleteOne({ email: testDoctorData.email });
    }
    
    console.log('Creating new doctor...');
    
    // Create a new user for the doctor with default password
    const defaultPassword = 'Doctor@123';
    const user = await User.create({
      firstName: testDoctorData.firstName,
      lastName: testDoctorData.lastName,
      email: testDoctorData.email,
      phone: testDoctorData.phone,
      role: 'doctor',
      password: defaultPassword,
      isDefaultPassword: true
    });
    
    console.log(`✅ Created user: ${user.firstName} ${user.lastName}`);
    
    // Create doctor profile
    const doctor = await Doctor.create({
      user: user._id,
      specialization: testDoctorData.specialization,
      experience: parseInt(testDoctorData.experience),
      qualification: null,
      about: null,
      consultationFee: null,
      availability: null,
      hospital: null,
      rating: 0,
      totalReviews: 0,
      isActive: true
    });
    
    console.log(`✅ Created doctor profile: ${doctor._id}`);
    
    // Test login with default password
    const testUser = await User.findById(user._id).select('+password +isDefaultPassword');
    const isMatch = await testUser.matchPassword(defaultPassword);
    
    console.log(`\n📊 Test Results:`);
    console.log(`Email: ${testUser.email}`);
    console.log(`Has default password flag: ${testUser.isDefaultPassword}`);
    console.log(`Can login with default password: ${isMatch ? '✅ YES' : '❌ NO'}`);
    
    if (isMatch && testUser.isDefaultPassword) {
      console.log('\n🎉 SUCCESS! New doctor created with default password correctly!');
    } else {
      console.log('\n❌ FAILED! Something went wrong with default password setup.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

testNewDoctorCreation();