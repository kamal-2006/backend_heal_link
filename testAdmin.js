const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const User = require('./models/User');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Test admin login
const testAdminLogin = async () => {
  try {
    console.log('Testing admin user...');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@heallink.com' }).select('+password');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log('✅ Admin user found:');
    console.log('  - Email:', adminUser.email);
    console.log('  - Role:', adminUser.role);
    console.log('  - Name:', adminUser.firstName, adminUser.lastName);
    
    // Test password
    const testPassword = 'admin123';
    const isMatch = await adminUser.matchPassword(testPassword);
    
    if (isMatch) {
      console.log('✅ Password match successful');
    } else {
      console.log('❌ Password does not match');
    }
    
    // Test JWT token generation
    const token = adminUser.getSignedJwtToken();
    console.log('✅ JWT token generated:', token.substring(0, 20) + '...');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing admin:', error);
    process.exit(1);
  }
};

testAdminLogin();