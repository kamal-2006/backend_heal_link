const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');
const Feedback = require('./models/Feedback');
const Appointment = require('./models/Appointment'); // Assuming Feedback links to Appointment

dotenv.config({ path: path.join(__dirname, 'config', 'config.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

const generateFeedbackData = async () => {
    await connectDB();

    try {
        const targetDoctorUser = await User.findById('68f0d0757d3f543b450c37d5');
        if (!targetDoctorUser || targetDoctorUser.role !== 'doctor') {
            console.error('Target user not found or is not a doctor with the provided ID.');
            process.exit(1);
        }
        if (!targetDoctorUser) {
            console.error('Target doctor not found. Please ensure a doctor with kishorekumaar@gmail.com exists.');
            process.exit(1);
        }

        const targetDoctor = await Doctor.findOne({ user: targetDoctorUser._id });
        if (!targetDoctor) {
            console.error('Doctor profile not found for the target user.');
            process.exit(1);
        }

        // Find patients mapped to this doctor
        const patients = await Patient.find({ primaryDoctor: targetDoctorUser._id }).populate('user');
        if (patients.length === 0) {
            console.error('No patients found mapped to this doctor. Please ensure patients are assigned.');
            process.exit(1);
        }

        const feedbackEntries = [];
        const comments = [
            "Excellent care and very attentive. Highly recommend!",
            "Dr. was very professional and explained everything clearly.",
            "Felt a bit rushed, but overall good experience.",
            "Very satisfied with the consultation. Great doctor!",
            "The doctor listened to all my concerns and provided helpful advice."
        ];
        const appointmentTypes = ["check-up", "follow-up", "emergency", "consultation"];

        for (let i = 0; i < 5; i++) {
            const randomPatient = patients[Math.floor(Math.random() * patients.length)];
            const randomRating = Math.floor(Math.random() * 5) + 1; // 1-5 stars
            const randomComment = comments[Math.floor(Math.random() * comments.length)];
            const randomAppointmentType = appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)];
            
            // Find a random appointment for the patient and doctor
            let appointment = await Appointment.findOne({
                patient: randomPatient._id,
                doctor: targetDoctor._id,
                status: 'completed' // Only completed appointments can have feedback
            });

            if (!appointment) {
                // Create a dummy completed appointment if none found
                appointment = await Appointment.create({
                    patient: randomPatient.user._id,
                    doctor: targetDoctor._id,
                    date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Up to 60 days ago
                    reason: 'Routine check-up (synthetic)',
                    status: 'completed'
                });
            }

            feedbackEntries.push({
                doctor: targetDoctorUser._id,
                patient: randomPatient._id,
                appointment: appointment._id, // Link to the found or created appointment
                rating: randomRating,
                comment: randomComment,
                createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Last 30 days
                appointmentType: randomAppointmentType.toLowerCase(), // Ensure lowercase
                read: false
            });
        }

        await Feedback.insertMany(feedbackEntries);
        console.log(`Successfully added ${feedbackEntries.length} feedback entries.`);
        process.exit(0);

    } catch (error) {
        console.error(`Error generating feedback data: ${error.message}`);
        process.exit(1);
    }
};

generateFeedbackData();
