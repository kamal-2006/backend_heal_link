require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/db');
const Doctor = require('./models/Doctor');
const User = require('./models/User');

async function verifyDoctorAvailability() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Get all doctors and check their availability
        const doctors = await Doctor.find().populate('user', 'firstName lastName email');
        
        console.log(`\n📊 DOCTOR AVAILABILITY VERIFICATION`);
        console.log('=' .repeat(50));
        console.log(`Total doctors: ${doctors.length}\n`);

        let doctorsWithIssues = 0;

        for (let doctor of doctors) {
            const hasAvailability = doctor.availability && doctor.availability.timeSlots && doctor.availability.timeSlots.length > 0;
            const status = hasAvailability ? '✅' : '❌';
            
            if (!hasAvailability) doctorsWithIssues++;

            console.log(`${status} Dr. ${doctor.user.firstName} ${doctor.user.lastName}`);
            console.log(`   📧 Email: ${doctor.user.email}`);
            console.log(`   🏥 Specialization: ${doctor.specialization}`);
            console.log(`   📅 Days: ${doctor.availability?.days?.join(', ') || 'None'}`);
            console.log(`   ⏰ TimeSlots: ${doctor.availability?.timeSlots?.length || 0} slots`);
            
            if (doctor.availability?.timeSlots?.length > 0) {
                doctor.availability.timeSlots.forEach((slot, index) => {
                    console.log(`      ${index + 1}. ${slot.startTime} - ${slot.endTime}`);
                });
            }
            console.log('');
        }

        console.log('=' .repeat(50));
        if (doctorsWithIssues === 0) {
            console.log('🎉 ALL DOCTORS HAVE PROPER AVAILABILITY CONFIGURED!');
        } else {
            console.log(`⚠️  ${doctorsWithIssues} doctors still have availability issues`);
        }

        // Test the specific doctor that was mentioned
        const specificDoctor = await Doctor.findById("68e2a5e7dcc906bea74bbdf6");
        if (specificDoctor) {
            console.log('\n🎯 SPECIFIC DOCTOR CHECK:');
            console.log(`Doctor ID: ${specificDoctor._id}`);
            console.log(`TimeSlots: ${specificDoctor.availability?.timeSlots?.length || 0}`);
            console.log('TimeSlots details:', JSON.stringify(specificDoctor.availability?.timeSlots, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

verifyDoctorAvailability();