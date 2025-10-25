const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const Feedback = require('./models/Feedback');
const User = require('./models/User');
require('dotenv').config({ path: './config/config.env' });

const testFeedbackEndpoints = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check for completed appointments
    const completedAppointments = await Appointment.find({ status: 'completed' })
      .populate('doctor', 'firstName lastName')
      .populate('patient', 'firstName lastName');
    
    console.log(`Found ${completedAppointments.length} completed appointments:`);
    completedAppointments.forEach(apt => {
      console.log(`- ID: ${apt._id}, Doctor: ${apt.doctor?.firstName} ${apt.doctor?.lastName}, Patient: ${apt.patient?.firstName} ${apt.patient?.lastName}, Date: ${apt.date}`);
    });

    // Check for existing feedback
    const existingFeedback = await Feedback.find()
      .populate('doctor', 'firstName lastName')
      .populate('patient', 'firstName lastName')
      .populate('appointment', 'date');
    
    console.log(`\nFound ${existingFeedback.length} existing feedback entries:`);
    existingFeedback.forEach(fb => {
      console.log(`- ID: ${fb._id}, Rating: ${fb.rating}, Doctor: ${fb.doctor?.firstName} ${fb.doctor?.lastName}, Patient: ${fb.patient?.firstName} ${fb.patient?.lastName}`);
    });

    // Find appointments that need feedback (completed but no feedback)
    const appointmentsNeedingFeedback = [];
    for (let appointment of completedAppointments) {
      const hasExistingFeedback = await Feedback.findOne({ appointment: appointment._id });
      if (!hasExistingFeedback) {
        appointmentsNeedingFeedback.push(appointment);
      }
    }

    console.log(`\nFound ${appointmentsNeedingFeedback.length} appointments needing feedback:`);
    appointmentsNeedingFeedback.forEach(apt => {
      console.log(`- ID: ${apt._id}, Doctor: ${apt.doctor?.firstName} ${apt.doctor?.lastName}, Patient: ${apt.patient?.firstName} ${apt.patient?.lastName}, Date: ${apt.date}`);
    });

    // Get patient users
    const patients = await User.find({ role: 'patient' });
    console.log(`\nFound ${patients.length} patient users:`);
    patients.forEach(patient => {
      console.log(`- ID: ${patient._id}, Name: ${patient.firstName} ${patient.lastName}, Email: ${patient.email}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

testFeedbackEndpoints();