const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env vars
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const User = require('./models/User');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Create admin user
const createAdmin = async () => {
  try {
    console.log('Creating admin user...');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@heallink.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit();
    }
    
    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@heallink.com',
      phone: '+1234567899',
      role: 'admin',
      password: 'admin123' // You should change this password
    });
    
    console.log(`Admin user created successfully: ${admin.email}`);
    console.log('Login credentials:');
    console.log('Email: admin@heallink.com');
    console.log('Password: admin123');
    console.log('Please change the password after first login!');
    
    process.exit();
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdmin();