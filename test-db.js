const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

console.log('🔍 Testing Database Connection...');
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI:', process.env.MONGO_URI ? 'Set' : 'Not Set');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI environment variable is not defined');
      console.log('Please check your config/config.env file');
      process.exit(1);
    }
    
    console.log('🔗 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);
    
    // Test fetching doctors
    console.log('🏥 Testing Doctor collection...');
    const Doctor = require('./models/Doctor');
    const doctors = await Doctor.find({}).limit(5);
    console.log(`📋 Found ${doctors.length} doctors in database`);
    
    console.log('🎉 Database connection test successful!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if MongoDB Atlas cluster is running');
    console.log('2. Verify network access (whitelist your IP)');
    console.log('3. Check credentials in config.env');
    console.log('4. Ensure internet connection is stable');
    process.exit(1);
  }
};

connectDB();