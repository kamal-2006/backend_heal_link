/**
 * Check SMS Configuration and User Phone Numbers
 */

const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

async function checkSMSSetup() {
  console.log('\n🔍 SMS Configuration Check\n');
  console.log('='.repeat(70));

  try {
    // Check Twilio credentials
    console.log('\n1️⃣ Checking Twilio Credentials:');
    console.log('   TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('   TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('   TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || '❌ Missing');

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.log('\n❌ Twilio not configured! SMS will not work.');
      console.log('   Add credentials to config/config.env\n');
      return;
    }

    // Connect to MongoDB
    console.log('\n2️⃣ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./models/User');
    const Patient = require('./models/Patient');
    const Doctor = require('./models/Doctor');

    // Check recent patients
    console.log('\n3️⃣ Checking Recent Patients:');
    const patients = await Patient.find()
      .populate('user', 'firstName lastName email phone')
      .limit(5)
      .sort({ createdAt: -1 });

    if (patients.length === 0) {
      console.log('   ⚠️ No patients found');
    } else {
      patients.forEach((patient, idx) => {
        const user = patient.user;
        console.log(`\n   Patient ${idx + 1}:`);
        console.log(`   - Name: ${user?.firstName} ${user?.lastName}`);
        console.log(`   - Email: ${user?.email}`);
        console.log(`   - Phone: ${user?.phone || '❌ NOT SET'}`);
        
        if (!user?.phone) {
          console.log(`   - ID: ${user?._id}`);
          console.log(`   - Fix: db.users.updateOne({_id: ObjectId("${user?._id}")}, {$set: {phone: "+11234567890"}})`);
        }
      });
    }

    // Check recent doctors
    console.log('\n4️⃣ Checking Recent Doctors:');
    const doctors = await Doctor.find()
      .populate('user', 'firstName lastName email phone')
      .limit(5)
      .sort({ createdAt: -1 });

    if (doctors.length === 0) {
      console.log('   ⚠️ No doctors found');
    } else {
      doctors.forEach((doctor, idx) => {
        const user = doctor.user;
        console.log(`\n   Doctor ${idx + 1}:`);
        console.log(`   - Name: Dr. ${user?.firstName} ${user?.lastName}`);
        console.log(`   - Email: ${user?.email}`);
        console.log(`   - Phone: ${user?.phone || '❌ NOT SET'}`);
        
        if (!user?.phone) {
          console.log(`   - ID: ${user?._id}`);
          console.log(`   - Fix: db.users.updateOne({_id: ObjectId("${user?._id}")}, {$set: {phone: "+11234567890"}})`);
        }
      });
    }

    // Summary
    console.log('\n5️⃣ Summary:');
    const patientsWithPhone = patients.filter(p => p.user?.phone).length;
    const doctorsWithPhone = doctors.filter(d => d.user?.phone).length;
    
    console.log(`   - Patients with phone: ${patientsWithPhone}/${patients.length}`);
    console.log(`   - Doctors with phone: ${doctorsWithPhone}/${doctors.length}`);

    if (patientsWithPhone === 0 || doctorsWithPhone === 0) {
      console.log('\n⚠️  WARNING: Users need phone numbers for SMS!');
      console.log('\n   Quick Fix Commands:');
      console.log('   mongo');
      console.log('   use heal_link');
      console.log('   db.users.updateMany({role: "patient"}, {$set: {phone: "+11234567890"}})');
      console.log('   db.users.updateMany({role: "doctor"}, {$set: {phone: "+10987654321"}})');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Check Complete!');
    
    if (process.env.TWILIO_ACCOUNT_SID && patientsWithPhone > 0 && doctorsWithPhone > 0) {
      console.log('\n🎉 SMS should work! Try booking an appointment and check backend logs.');
    } else {
      console.log('\n⚠️  SMS will NOT work until:');
      if (!process.env.TWILIO_ACCOUNT_SID) console.log('   - Twilio credentials are configured');
      if (patientsWithPhone === 0) console.log('   - Patients have phone numbers');
      if (doctorsWithPhone === 0) console.log('   - Doctors have phone numbers');
    }
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkSMSSetup();
