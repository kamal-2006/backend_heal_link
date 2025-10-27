const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config/config.env' });

const User = require('./models/User');

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@heallink.com' });
    if (existingAdmin) {
      console.log('⚠️  Admin already exists!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('👤 Name:', existingAdmin.firstName, existingAdmin.lastName);
      console.log('🔑 Role:', existingAdmin.role);
      console.log('\n💡 Use these credentials to login:');
      console.log('   Email: admin@heallink.com');
      console.log('   Password: admin123');
      process.exit(0);
    }

    // Create new admin with hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@heallink.com',
      password: hashedPassword,
      phone: '0000000000',
      role: 'admin',
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: admin@heallink.com');
    console.log('🔒 Password: admin123');
    console.log('🔑 Role:', admin.role);
    console.log('👤 Name:', admin.firstName, admin.lastName);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 You can now login to the admin dashboard!');
    console.log(`   URL: ${process.env.FRONTEND_ORIGIN}/login`);
    console.log('   Select "Admin" role and use the credentials above.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

createAdmin();
