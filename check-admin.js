const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config/config.env' });

const User = require('./models/User');

const checkAndFixAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...\n');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@heallink.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('💡 Run: node create-admin.js to create one.');
      process.exit(1);
    }

    console.log('📋 Current Admin Info:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Name:', admin.firstName, admin.lastName);
    console.log('📧 Email:', admin.email);
    console.log('🔑 Role:', admin.role);
    console.log('📱 Phone:', admin.phone);
    console.log('✅ Active:', admin.isActive);
    console.log('🔒 Password Hash Exists:', !!admin.password);
    console.log('🔒 Password Length:', admin.password ? admin.password.length : 0);
    
    // Test if password "admin123" matches
    console.log('\n🔍 Testing password "admin123"...');
    const testPassword = 'admin123';
    
    try {
      const isMatch = await admin.matchPassword(testPassword);
      console.log('✅ Password Test Result:', isMatch ? 'MATCH ✓' : 'NO MATCH ✗');
      
      if (!isMatch) {
        console.log('\n⚠️  Password does not match! Resetting password...');
        
        // Generate new hash
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testPassword, salt);
        
        // Update admin password
        admin.password = hashedPassword;
        await admin.save();
        
        console.log('✅ Password reset successfully!');
        
        // Test again
        const adminUpdated = await User.findOne({ email: 'admin@heallink.com' }).select('+password');
        const isMatchAfter = await adminUpdated.matchPassword(testPassword);
        console.log('🔍 Re-testing password: ', isMatchAfter ? 'MATCH ✓' : 'NO MATCH ✗');
      }
    } catch (error) {
      console.log('❌ Error testing password:', error.message);
      console.log('\n⚠️  Resetting password anyway...');
      
      // Generate new hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testPassword, salt);
      
      // Update admin password directly
      await User.updateOne(
        { email: 'admin@heallink.com' },
        { $set: { password: hashedPassword } }
      );
      
      console.log('✅ Password reset successfully!');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Admin credentials are ready:');
    console.log('   📧 Email: admin@heallink.com');
    console.log('   🔒 Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkAndFixAdmin();
