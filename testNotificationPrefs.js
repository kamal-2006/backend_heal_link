const mongoose = require('mongoose');
require('dotenv').config({ path: './config/config.env' });

const Patient = require('./models/Patient');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testNotificationPreferences = async () => {
  try {
    console.log('Testing Notification Preferences...\n');

    // Find a patient user
    const patientUser = await User.findOne({ role: 'patient' });
    if (!patientUser) {
      console.log('No patient user found');
      return;
    }

    console.log(`Testing with patient: ${patientUser.firstName} ${patientUser.lastName}`);

    // Find or create patient profile
    let patient = await Patient.findOne({ user: patientUser._id });
    if (!patient) {
      console.log('Creating patient profile...');
      patient = await Patient.create({
        user: patientUser._id,
        settings: {
          notificationPreferences: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: true,
            appointmentReminders: true,
            testResults: true
          }
        }
      });
    }

    // Display current notification preferences
    console.log('\nCurrent notification preferences:');
    console.log('Email Notifications:', patient.settings?.notificationPreferences?.emailNotifications ?? 'Default (true)');
    console.log('SMS Notifications:', patient.settings?.notificationPreferences?.smsNotifications ?? 'Default (false)');
    console.log('Push Notifications:', patient.settings?.notificationPreferences?.pushNotifications ?? 'Default (true)');
    console.log('Appointment Reminders:', patient.settings?.notificationPreferences?.appointmentReminders ?? 'Default (true)');
    console.log('Test Results:', patient.settings?.notificationPreferences?.testResults ?? 'Default (true)');

    // Test updating notification preferences
    console.log('\nUpdating notification preferences...');
    const updatedPatient = await Patient.findOneAndUpdate(
      { user: patientUser._id },
      {
        $set: {
          'settings.notificationPreferences.emailNotifications': false,
          'settings.notificationPreferences.smsNotifications': true,
          'settings.notificationPreferences.pushNotifications': false
        }
      },
      { new: true, runValidators: true }
    );

    console.log('\nUpdated notification preferences:');
    console.log('Email Notifications:', updatedPatient.settings.notificationPreferences.emailNotifications);
    console.log('SMS Notifications:', updatedPatient.settings.notificationPreferences.smsNotifications);
    console.log('Push Notifications:', updatedPatient.settings.notificationPreferences.pushNotifications);
    console.log('Appointment Reminders:', updatedPatient.settings.notificationPreferences.appointmentReminders);
    console.log('Test Results:', updatedPatient.settings.notificationPreferences.testResults);

    console.log('\n✅ Notification preferences test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing notification preferences:', error);
  } finally {
    mongoose.connection.close();
  }
};

testNotificationPreferences();