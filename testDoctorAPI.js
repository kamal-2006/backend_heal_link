require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

const testDoctorAvailability = async () => {
  try {
    console.log('Testing doctor availability API logic...\n');

    const User = require('./models/User');
    const Doctor = require('./models/Doctor');
    
    // Test parameters
    const testParams = {
      specialization: 'General Medicine',
      date: '2024-12-30', // Monday
      time: '10:00'
    };
    
    console.log('Test Parameters:', testParams);
    console.log('---');
    
    // Step 1: Find doctors by specialization
    let query = { isActive: true };
    if (testParams.specialization && testParams.specialization !== 'all') {
      query.specialization = testParams.specialization;
    }
    
    console.log('Query:', query);
    
    const doctors = await Doctor.find(query).populate({
      path: 'user',
      select: 'firstName lastName email phone'
    });
    
    console.log(`\nStep 1 - Found ${doctors.length} doctors with specialization "${testParams.specialization}"`);
    
    if (doctors.length === 0) {
      console.log('❌ No doctors found with this specialization');
      return;
    }
    
    // Step 2: Filter by day availability
    let availableDoctors = doctors;
    
    if (testParams.date) {
      const requestedDate = new Date(testParams.date);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][requestedDate.getDay()];
      
      console.log(`\nStep 2 - Requested date: ${testParams.date} (${dayOfWeek})`);
      
      availableDoctors = doctors.filter(doctor => {
        const isAvailable = doctor.availability && 
                           doctor.availability.days && 
                           doctor.availability.days.includes(dayOfWeek);
        
        console.log(`Doctor ${doctor.user?.firstName || 'Unknown'}: Available on ${dayOfWeek}? ${isAvailable}`);
        if (doctor.availability?.days) {
          console.log(`  - Available days: ${doctor.availability.days.join(', ')}`);
        }
        
        return isAvailable;
      });
      
      console.log(`\nAfter day filter: ${availableDoctors.length} doctors available`);
    }
    
    // Step 3: Filter by time slots
    if (testParams.time && availableDoctors.length > 0) {
      console.log(`\nStep 3 - Requested time: ${testParams.time}`);
      
      availableDoctors = availableDoctors.filter(doctor => {
        if (!doctor.availability || !doctor.availability.timeSlots || doctor.availability.timeSlots.length === 0) {
          console.log(`Doctor ${doctor.user?.firstName || 'Unknown'}: No time slots defined`);
          return false;
        }
        
        console.log(`Doctor ${doctor.user?.firstName || 'Unknown'} time slots:`);
        doctor.availability.timeSlots.forEach((slot, index) => {
          console.log(`  ${index + 1}. ${slot.startTime} - ${slot.endTime}`);
        });
        
        // Check if the requested time falls within any of the doctor's time slots
        const isTimeAvailable = doctor.availability.timeSlots.some(slot => {
          const timeInRange = testParams.time >= slot.startTime && testParams.time <= slot.endTime;
          console.log(`  Time ${testParams.time} in range ${slot.startTime}-${slot.endTime}? ${timeInRange}`);
          return timeInRange;
        });
        
        console.log(`  Overall time available: ${isTimeAvailable}\n`);
        return isTimeAvailable;
      });
      
      console.log(`After time filter: ${availableDoctors.length} doctors available`);
    }
    
    console.log('\n=== FINAL RESULT ===');
    console.log(`Available doctors: ${availableDoctors.length}`);
    
    if (availableDoctors.length > 0) {
      console.log('\n✅ Available doctors:');
      availableDoctors.forEach((doctor, index) => {
        console.log(`${index + 1}. Dr. ${doctor.user?.firstName} ${doctor.user?.lastName} - ${doctor.specialization}`);
      });
    } else {
      console.log('❌ No doctors available for the given criteria');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
};

setTimeout(testDoctorAvailability, 2000);