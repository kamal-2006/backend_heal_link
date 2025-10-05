require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/db');
const User = require('./models/User');
const Doctor = require('./models/Doctor');

async function checkEmailExists() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Check if the email exists
        const email = 'kamal@gmail.com';
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            console.log(`\n❌ Email "${email}" already exists!`);
            console.log('User details:');
            console.log(`   Name: ${existingUser.firstName} ${existingUser.lastName}`);
            console.log(`   Role: ${existingUser.role}`);
            console.log(`   ID: ${existingUser._id}`);
            
            // Check if this user is also a doctor
            const doctorProfile = await Doctor.findOne({ user: existingUser._id });
            if (doctorProfile) {
                console.log(`   Has Doctor Profile: Yes (${doctorProfile.specialization})`);
            } else {
                console.log(`   Has Doctor Profile: No`);
            }
            
            console.log('\n💡 Solutions:');
            console.log('   1. Use a different email address (e.g., kamalesh.k@gmail.com)');
            console.log('   2. Or delete the existing user if it\'s a duplicate');
            
        } else {
            console.log(`\n✅ Email "${email}" is available for use!`);
        }

        // Show suggestions for alternative emails
        console.log('\n📧 Suggested alternative emails:');
        const alternatives = [
            'kamalesh.k@gmail.com',
            'kamalesh2024@gmail.com', 
            'dr.kamalesh@gmail.com',
            'kamalesh.doctor@gmail.com',
            'k.kamalesh@gmail.com'
        ];
        
        for (let altEmail of alternatives) {
            const exists = await User.findOne({ email: altEmail });
            console.log(`   ${exists ? '❌' : '✅'} ${altEmail} ${exists ? '(taken)' : '(available)'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkEmailExists();