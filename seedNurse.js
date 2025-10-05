const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

// Load env vars
dotenv.config({ path: './config/config.env' });

const seedNurse = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Check if nurse user already exists
    const existingNurse = await User.findOne({ email: 'nurse@heallink.com' });

    if (existingNurse) {
      console.log('Nurse user already exists');
      process.exit();
    }

    // Create nurse user
    const nurse = await User.create({
      firstName: 'Nurse',
      lastName: 'Admin',
      email: 'nurse@heallink.com',
      phone: '1234567890',
      role: 'nurse',
      password: 'nurse123'
    });

    console.log('Nurse user created successfully:', nurse.email);
    process.exit();
  } catch (error) {
    console.error('Error seeding nurse:', error);
    process.exit(1);
  }
};

seedNurse();