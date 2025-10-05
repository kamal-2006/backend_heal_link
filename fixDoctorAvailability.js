require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/db');
const Doctor = require('./models/Doctor');

async function fixDoctorAvailability() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Find the specific doctor with empty timeSlots
        const doctorId = "68e2a5e7dcc906bea74bbdf6";
        const doctor = await Doctor.findById(doctorId);
        
        if (!doctor) {
            console.log('❌ Doctor not found');
            return;
        }

        console.log('📋 Current doctor availability:');
        console.log('Days:', doctor.availability?.days);
        console.log('TimeSlots:', doctor.availability?.timeSlots);

        // The working hours were "Mon-Fri:10:30-11:30"
        const workingHours = "Mon-Fri:10:30-11:30";
        
        // Parse working hours correctly
        const days = [];
        if (workingHours.includes('Mon-Fri') || workingHours.includes('Monday-Friday')) {
            days.push('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday');
        }
        if (workingHours.includes('Sat')) days.push('Saturday');
        if (workingHours.includes('Sun')) days.push('Sunday');
        
        // Extract time information
        const timeSlots = [];
        const colonIndex = workingHours.indexOf(':');
        if (colonIndex !== -1) {
            const timeMatch = workingHours.substring(colonIndex + 1).trim();
            
            if (timeMatch && timeMatch.includes('-')) {
                const [startTime, endTime] = timeMatch.split('-');
                if (startTime && endTime) {
                    timeSlots.push({
                        startTime: startTime.trim(),
                        endTime: endTime.trim()
                    });
                }
            }
        }

        const updatedAvailability = {
            days,
            timeSlots
        };

        console.log('\n🔧 Updating availability to:');
        console.log('Days:', updatedAvailability.days);
        console.log('TimeSlots:', updatedAvailability.timeSlots);

        // Update the doctor
        await Doctor.findByIdAndUpdate(doctorId, {
            $set: {
                'availability.days': updatedAvailability.days,
                'availability.timeSlots': updatedAvailability.timeSlots
            }
        });

        // Verify the update
        const updatedDoctor = await Doctor.findById(doctorId);
        console.log('\n✅ Doctor availability updated successfully!');
        console.log('New Days:', updatedDoctor.availability?.days);
        console.log('New TimeSlots:', updatedDoctor.availability?.timeSlots);

        // Also fix any other doctors with empty timeSlots
        console.log('\n🔍 Checking for other doctors with empty timeSlots...');
        
        // Find doctors with null availability
        const doctorsWithNullAvailability = await Doctor.find({
            availability: null
        });
        
        console.log(`Found ${doctorsWithNullAvailability.length} doctors with null availability`);
        
        for (let doc of doctorsWithNullAvailability) {
            console.log(`Fixing doctor ${doc._id} (null availability)...`);
            
            const defaultTimeSlots = [
                { startTime: '09:00', endTime: '12:00' },
                { startTime: '14:00', endTime: '17:00' }
            ];
            
            const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
            
            await Doctor.findByIdAndUpdate(doc._id, {
                $set: {
                    availability: {
                        days: defaultDays,
                        timeSlots: defaultTimeSlots
                    }
                }
            });
            
            console.log(`✅ Fixed doctor ${doc._id}`);
        }
        
        // Find doctors with empty timeSlots array
        const doctorsWithEmptyTimeSlots = await Doctor.find({
            'availability.timeSlots': { $size: 0 }
        });

        console.log(`Found ${doctorsWithEmptyTimeSlots.length} doctors with empty timeSlots array`);

        for (let doc of doctorsWithEmptyTimeSlots) {
            if (doc._id.toString() !== doctorId) {
                console.log(`Fixing doctor ${doc._id} (empty timeSlots)...`);
                
                const defaultTimeSlots = [
                    { startTime: '09:00', endTime: '12:00' },
                    { startTime: '14:00', endTime: '17:00' }
                ];
                
                const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                
                await Doctor.findByIdAndUpdate(doc._id, {
                    $set: {
                        'availability.days': defaultDays,
                        'availability.timeSlots': defaultTimeSlots
                    }
                });
                
                console.log(`✅ Fixed doctor ${doc._id}`);
            }
        }

        console.log('\n🎉 All doctors with empty timeSlots have been fixed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

fixDoctorAvailability();