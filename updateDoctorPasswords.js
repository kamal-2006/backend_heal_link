require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

const updateExistingDoctors = async () => {
  try {
    await connectDB();
    
    console.log('Starting to update existing doctors with default password...\n');
    
    // Find all doctors
    const doctors = await Doctor.find().populate('user');
    console.log(`Found ${doctors.length} doctors in the database`);
    
    if (doctors.length === 0) {
      console.log('No doctors found in database.');
      process.exit(0);
    }
    
    const defaultPassword = 'Doctor@123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
    
    let updatedCount = 0;
    
    for (const doctor of doctors) {
      if (doctor.user) {
        console.log(`Updating doctor: ${doctor.user.firstName} ${doctor.user.lastName} (${doctor.user.email})`);
        
        // Update the user with default password
        await User.findByIdAndUpdate(doctor.user._id, {
          password: hashedPassword,
          isDefaultPassword: true
        });
        
        updatedCount++;
        console.log(`✓ Updated doctor ${doctor.user.email}`);
      } else {
        console.log(`⚠ Doctor ${doctor._id} has no associated user`);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} doctors with default password`);
    console.log(`Default password: ${defaultPassword}`);
    console.log(`All doctors can now login with this password and should change it on first login.`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating doctors:', error);
    process.exit(1);
  }
};

// Run the update
updateExistingDoctors();