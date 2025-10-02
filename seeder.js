const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

// Load env vars
const path = require('path');
dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const User = require('./models/User');
const Doctor = require('./models/Doctor');

// Connect to DB
mongoose.connect(process.env.MONGO_URI);

// Sample doctor data
const doctorsData = [
  {
    user: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@hospital.com',
      phone: '+1234567890',
      role: 'doctor',
      password: 'password123'
    },
    doctor: {
      specialization: 'General Medicine',
      experience: 10,
      qualification: 'MBBS, MD',
      about: 'Experienced general practitioner with focus on preventive care and family medicine.',
      consultationFee: 150,
      availability: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        timeSlots: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '17:00' }
        ]
      },
      hospital: {
        name: 'City General Hospital',
        address: '123 Main St, City, State 12345',
        phone: '+1234567800'
      },
      rating: 4.5,
      totalReviews: 127
    }
  },
  {
    user: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@hospital.com',
      phone: '+1234567891',
      role: 'doctor',
      password: 'password123'
    },
    doctor: {
      specialization: 'Cardiology',
      experience: 15,
      qualification: 'MBBS, MD, DM Cardiology',
      about: 'Expert cardiologist specializing in heart disease prevention and treatment.',
      consultationFee: 250,
      availability: {
        days: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        timeSlots: [
          { startTime: '10:00', endTime: '13:00' },
          { startTime: '15:00', endTime: '18:00' }
        ]
      },
      hospital: {
        name: 'Heart Care Center',
        address: '456 Medical Ave, City, State 12345',
        phone: '+1234567801'
      },
      rating: 4.8,
      totalReviews: 203
    }
  },
  {
    user: {
      firstName: 'Michael',
      lastName: 'Brown',
      email: 'michael.brown@hospital.com',
      phone: '+1234567892',
      role: 'doctor',
      password: 'password123'
    },
    doctor: {
      specialization: 'Pediatrics',
      experience: 8,
      qualification: 'MBBS, MD Pediatrics',
      about: 'Caring pediatrician dedicated to children\'s health and development.',
      consultationFee: 180,
      availability: {
        days: ['Tuesday', 'Thursday', 'Friday', 'Saturday'],
        timeSlots: [
          { startTime: '08:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '16:00' }
        ]
      },
      hospital: {
        name: 'Children\'s Medical Center',
        address: '789 Kids St, City, State 12345',
        phone: '+1234567802'
      },
      rating: 4.7,
      totalReviews: 156
    }
  },
  {
    user: {
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@hospital.com',
      phone: '+1234567893',
      role: 'doctor',
      password: 'password123'
    },
    doctor: {
      specialization: 'Dermatology',
      experience: 12,
      qualification: 'MBBS, MD Dermatology',
      about: 'Skilled dermatologist specializing in skin conditions and cosmetic procedures.',
      consultationFee: 200,
      availability: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        timeSlots: [
          { startTime: '09:30', endTime: '12:30' },
          { startTime: '14:30', endTime: '17:30' }
        ]
      },
      hospital: {
        name: 'Skin Care Clinic',
        address: '321 Beauty Blvd, City, State 12345',
        phone: '+1234567803'
      },
      rating: 4.6,
      totalReviews: 189
    }
  },
  {
    user: {
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david.wilson@hospital.com',
      phone: '+1234567894',
      role: 'doctor',
      password: 'password123'
    },
    doctor: {
      specialization: 'Orthopedics',
      experience: 18,
      qualification: 'MBBS, MS Orthopedics',
      about: 'Expert orthopedic surgeon with extensive experience in joint replacement and sports medicine.',
      consultationFee: 300,
      availability: {
        days: ['Monday', 'Wednesday', 'Friday'],
        timeSlots: [
          { startTime: '10:00', endTime: '14:00' },
          { startTime: '15:00', endTime: '17:00' }
        ]
      },
      hospital: {
        name: 'Orthopedic Specialty Hospital',
        address: '654 Bone St, City, State 12345',
        phone: '+1234567804'
      },
      rating: 4.9,
      totalReviews: 245
    }
  }
];

// Import data into DB
const importData = async () => {
  try {
    console.log('Importing sample doctors...');
    
    for (const doctorData of doctorsData) {
      // Create user first
      const user = await User.create(doctorData.user);
      console.log(`Created user: ${user.firstName} ${user.lastName}`);
      
      // Create doctor profile
      const doctor = await Doctor.create({
        user: user._id,
        ...doctorData.doctor
      });
      console.log(`Created doctor profile: ${doctor.doctorId}`);
    }
    
    console.log('Data imported successfully');
    process.exit();
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

// Delete data from DB
const deleteData = async () => {
  try {
    console.log('Deleting existing doctors...');
    
    // Delete all doctors
    await Doctor.deleteMany({});
    console.log('Doctors deleted');
    
    // Delete doctor users
    await User.deleteMany({ role: 'doctor' });
    console.log('Doctor users deleted');
    
    console.log('Data deleted successfully');
    process.exit();
  } catch (error) {
    console.error('Error deleting data:', error);
    process.exit(1);
  }
};

// Check command line arguments
if (process.argv[2] === '-i') {
  importData();
} else if (process.argv[2] === '-d') {
  deleteData();
} else {
  console.log('Usage:');
  console.log('  node seeder.js -i    Import sample doctors');
  console.log('  node seeder.js -d    Delete all doctors');
  process.exit();
}