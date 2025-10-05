require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/db');
const Appointment = require('./models/Appointment');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

async function testAppointmentCRUD() {
    try {
        await connectDB();
        console.log('✅ Connected to database');

        // Find a doctor and patient for testing
        const doctor = await Doctor.findOne();
        const patient = await Patient.findOne();

        if (!doctor || !patient) {
            console.log('❌ Need at least one doctor and one patient in database');
            return;
        }

        console.log(`\n📋 Testing with Doctor: ${doctor.name} (${doctor._id})`);
        console.log(`👤 Testing with Patient: ${patient.name} (${patient._id})`);

        // Check doctor's initial availability
        console.log('\n🔍 Doctor\'s initial availability timeSlots:', doctor.availability.timeSlots.length);

        // Create a test appointment
        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + 1); // Tomorrow
        appointmentDate.setHours(10, 0, 0, 0); // 10 AM

        const testAppointment = await Appointment.create({
            patient: patient._id,
            doctor: doctor._id,
            date: appointmentDate,
            reason: 'Test appointment for CRUD verification',
            status: 'pending',
            notes: 'Testing appointment with availability integration'
        });

        console.log('\n✅ Created test appointment:', testAppointment._id);
        console.log('📅 Appointment Date:', appointmentDate.toISOString());
        console.log('📝 Reason:', testAppointment.reason);

        // Verify doctor's availability was updated
        const updatedDoctor = await Doctor.findById(doctor._id);
        console.log('\n🔍 Doctor\'s updated availability timeSlots:', updatedDoctor.availability.timeSlots.length);
        
        // Find the specific timeSlot for our appointment
        const appointmentSlot = updatedDoctor.availability.timeSlots.find(slot => 
            slot.appointmentId && slot.appointmentId.toString() === testAppointment._id.toString()
        );
        
        if (appointmentSlot) {
            console.log('✅ Found appointment in doctor\'s timeSlots:');
            console.log(`   📅 Date: ${appointmentSlot.date}`);
            console.log(`   ⏰ Time: ${appointmentSlot.startTime} - ${appointmentSlot.endTime}`);
            console.log(`   🆔 Appointment ID: ${appointmentSlot.appointmentId}`);
        } else {
            console.log('❌ Appointment not found in doctor\'s timeSlots');
        }

        // Update the appointment
        const updatedAppointment = await Appointment.findByIdAndUpdate(
            testAppointment._id,
            { 
                status: 'confirmed',
                notes: 'Updated test appointment - confirmed'
            },
            { new: true }
        );

        console.log('\n✅ Updated appointment status to:', updatedAppointment.status);

        // Delete the test appointment
        await Appointment.findByIdAndDelete(testAppointment._id);
        console.log('\n✅ Deleted test appointment');

        // Verify doctor's availability was cleaned up
        const finalDoctor = await Doctor.findById(doctor._id);
        const remainingSlot = finalDoctor.availability.timeSlots.find(slot => 
            slot.appointmentId && slot.appointmentId.toString() === testAppointment._id.toString()
        );
        
        if (!remainingSlot) {
            console.log('✅ Appointment slot properly removed from doctor\'s availability');
        } else {
            console.log('❌ Appointment slot still exists in doctor\'s availability');
        }

        console.log('\n🎉 CRUD test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        process.exit(0);
    }
}

testAppointmentCRUD();