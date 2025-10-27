const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config/config.env' });

const User = require('./models/User');

const createNurse = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...\n');

    // Check if nurse already exists
    const existingNurse = await User.findOne({ email: 'nurse@heallink.com' });
    if (existingNurse) {
      console.log('⚠️  Nurse already exists!');
      console.log('📧 Email:', existingNurse.email);
      console.log('👤 Name:', existingNurse.firstName, existingNurse.lastName);
      console.log('🔑 Role:', existingNurse.role);
      console.log('\n💡 Use these credentials to login:');
      console.log('   Email: nurse@heallink.com');
      console.log('   Password: nurse123');
      process.exit(0);
    }

    // Create new nurse with hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('nurse123', salt);

    // Create nurse using direct database insert to bypass pre-save hook
    await mongoose.connection.collection('users').insertOne({
      firstName: 'Nurse',
      lastName: 'User',
      email: 'nurse@heallink.com',
      password: hashedPassword,
      phone: '1111111111',
      role: 'nurse',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Nurse user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: nurse@heallink.com');
    console.log('🔒 Password: nurse123');
    console.log('🔑 Role: nurse');
    console.log('👤 Name: Nurse User');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 You can now login to the nurse dashboard!');
    console.log(`   URL: ${process.env.FRONTEND_ORIGIN}/login`);
    console.log('   Select "Nurse" role and use the credentials above.');
    
    // Verify the password works
    const testUser = await User.findOne({ email: 'nurse@heallink.com' }).select('+password');
    const isMatch = await bcrypt.compare('nurse123', testUser.password);
    console.log('\n🧪 Password verification test:', isMatch ? '✅ PASSED' : '❌ FAILED');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
};

createNurse();
