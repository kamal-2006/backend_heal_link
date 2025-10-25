const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

const User = require('./models/User');
const Appointment = require('./models/Appointment');

async function fixAppointments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Get all doctor users
    const doctors = await User.find({ role: 'doctor' });
    console.log('Found', doctors.length, 'doctors');
    
    if (doctors.length === 0) {
      console.log('No doctors found!');
      process.exit(1);
    }
    
    // Get all appointments
    const appointments = await Appointment.find({});
    console.log('Found', appointments.length, 'appointments');
    
    let fixedCount = 0;
    
    for (const appointment of appointments) {
      // Check if doctor exists
      const doctorExists = await User.findById(appointment.doctor);
      
      if (!doctorExists) {
        console.log(`Fixing appointment ${appointment._id} with invalid doctor ID ${appointment.doctor}`);
        
        // Assign to a random doctor from available doctors
        const randomDoctor = doctors[Math.floor(Math.random() * doctors.length)];
        
        await Appointment.findByIdAndUpdate(appointment._id, { 
          doctor: randomDoctor._id 
        });
        
        console.log(`Updated to doctor: ${randomDoctor.firstName} ${randomDoctor.lastName}`);
        fixedCount++;
      } else {
        console.log(`Appointment ${appointment._id} has valid doctor: ${doctorExists.firstName} ${doctorExists.lastName}`);
      }
    }
    
    console.log(`Fixed ${fixedCount} appointments`);
    
    // Verify the fix
    console.log('\nVerifying fix...');
    const updatedAppointments = await Appointment.find({}).populate('doctor', 'firstName lastName');
    
    for (const apt of updatedAppointments.slice(0, 5)) {
      console.log(`Appointment ${apt._id}: Doctor = ${apt.doctor ? `${apt.doctor.firstName} ${apt.doctor.lastName}` : 'STILL NULL'}`);
    }
    
    mongoose.disconnect();
    console.log('Fix completed successfully!');
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

fixAppointments();