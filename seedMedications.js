require('dotenv').config({ path: './config/config.env' });
const mongoose = require('mongoose');
require('./config/db')();

const User = require('./models/User');
const Patient = require('./models/Patient');
const Medication = require('./models/Medication');

const seedMedications = async () => {
  try {
    console.log('Starting medication seeding...');

    // Find a patient to assign medications to
    const patients = await Patient.find().populate('user');
    const doctors = await User.find({ role: 'doctor' });

    if (!patients.length) {
      console.log('No patients found. Please create a patient first.');
      return;
    }

    if (!doctors.length) {
      console.log('No doctors found. Please create a doctor first.');
      return;
    }

    const patient = patients[0];
    const doctor = doctors[0];

    // Clear existing medications for this patient
    await Medication.deleteMany({ patient: patient._id });

    // Sample medications data
    const medications = [
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        startDate: new Date('2024-01-15'),
        endDate: null,
        instructions: 'Take with or without food. Take at the same time each day.',
        status: 'active',
        reminders: {
          enabled: true,
          times: ['08:00']
        },
        notes: 'For blood pressure management'
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        startDate: new Date('2024-02-01'),
        endDate: null,
        instructions: 'Take with meals to reduce stomach upset.',
        status: 'active',
        reminders: {
          enabled: true,
          times: ['08:00', '20:00']
        },
        notes: 'For diabetes management'
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'As needed',
        startDate: new Date('2024-10-01'),
        endDate: new Date('2024-10-15'),
        instructions: 'Take with food. Do not exceed 3 times daily.',
        status: 'active',
        reminders: {
          enabled: false,
          times: []
        },
        notes: 'For pain relief as needed'
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Amoxicillin',
        dosage: '250mg',
        frequency: 'Three times daily',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-10'),
        instructions: 'Complete the full course even if you feel better.',
        status: 'completed',
        reminders: {
          enabled: false,
          times: ['08:00', '14:00', '20:00']
        },
        notes: 'Antibiotic course completed successfully'
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Vitamin D3',
        dosage: '1000 IU',
        frequency: 'Once daily',
        startDate: new Date('2024-01-01'),
        endDate: null,
        instructions: 'Take with a meal that contains fat for better absorption.',
        status: 'active',
        reminders: {
          enabled: true,
          times: ['09:00']
        },
        notes: 'Vitamin supplement for bone health'
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        startDate: new Date('2024-03-01'),
        endDate: null,
        instructions: 'Take at bedtime. Avoid grapefruit juice.',
        status: 'active',
        reminders: {
          enabled: true,
          times: ['22:00']
        },
        notes: 'For cholesterol management'
      },
      {
        patient: patient._id,
        doctor: doctor._id,
        name: 'Omeprazole',
        dosage: '20mg',
        frequency: 'Once daily before breakfast',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2024-11-01'),
        instructions: 'Take 30 minutes before breakfast.',
        status: 'active',
        reminders: {
          enabled: true,
          times: ['07:30']
        },
        notes: 'For acid reflux - 3 month course'
      }
    ];

    // Create medications
    const createdMedications = await Medication.create(medications);
    
    console.log(`✅ Successfully created ${createdMedications.length} medications for patient: ${patient.user.name}`);
    console.log('\nMedications created:');
    
    createdMedications.forEach((med, index) => {
      console.log(`${index + 1}. ${med.name} - ${med.dosage} - ${med.status}`);
    });

    console.log('\n📊 Medication Summary:');
    const activeCount = createdMedications.filter(med => med.status === 'active').length;
    const completedCount = createdMedications.filter(med => med.status === 'completed').length;
    console.log(`Active: ${activeCount}`);
    console.log(`Completed: ${completedCount}`);
    console.log(`Total: ${createdMedications.length}`);

    console.log('\n🔔 Reminders enabled for:');
    createdMedications
      .filter(med => med.reminders.enabled)
      .forEach(med => {
        console.log(`- ${med.name}: ${med.reminders.times.join(', ')}`);
      });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding medications:', error);
    process.exit(1);
  }
};

// Run the seeder
seedMedications();