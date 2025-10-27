/**
 * SMS Service using Twilio
 * Handles sending SMS notifications for appointments and other events
 */

const twilio = require('twilio');

class SMSService {
  constructor() {
    // Initialize Twilio client with credentials from environment variables
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // TEST MODE: Send all SMS to this number for testing
    this.testPhoneNumber = '6369026251';
    
    // Only initialize Twilio if credentials are provided
    if (this.accountSid && this.authToken && this.fromNumber) {
      this.client = twilio(this.accountSid, this.authToken);
      this.isEnabled = true;
      console.log('✅ SMS Service initialized with Twilio');
      console.log('📱 TEST MODE: All SMS will be sent to', this.testPhoneNumber);
    } else {
      this.client = null;
      this.isEnabled = false;
      console.log('⚠️ SMS Service disabled - Twilio credentials not configured');
    }
  }

  /**
   * Format phone number to E.164 format (required by Twilio)
   * @param {string} phone - Phone number to format
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming +1 for US/Canada)
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    // Return in E.164 format
    return '+' + cleaned;
  }

  /**
   * Send SMS message
   * @param {string} to - Recipient phone number (will be overridden in TEST MODE)
   * @param {string} message - SMS message content
   * @returns {Promise<object>} - Twilio message object or null
   */
  async sendSMS(to, message) {
    if (!this.isEnabled) {
      console.log('⚠️ SMS Service disabled - Message not sent');
      console.log('   To:', to);
      console.log('   Message:', message);
      return null;
    }

    try {
      // TEST MODE: Override recipient with test number
      const actualRecipient = this.testPhoneNumber;
      const formattedTo = this.formatPhoneNumber(actualRecipient);
      
      if (!formattedTo) {
        console.error('❌ Invalid phone number:', actualRecipient);
        return null;
      }

      console.log(`📱 TEST MODE: Sending SMS to ${formattedTo} (original: ${to || 'N/A'})...`);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedTo
      });

      console.log(`✅ SMS sent successfully to ${formattedTo}`);
      console.log(`   Message SID: ${result.sid}`);
      console.log(`   Status: ${result.status}`);
      return result;
    } catch (error) {
      console.error('❌ Error sending SMS:', error.message);
      console.error('   To:', this.testPhoneNumber);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.moreInfo);
      return null;
    }
  }

  /**
   * Send appointment booked SMS notification
   * @param {object} appointment - Appointment object
   * @param {object} doctor - Doctor object
   * @param {object} patient - Patient object
   */
  async sendAppointmentBookedSMS(appointment, doctor, patient) {
    console.log('📨 Preparing appointment booked SMS...');
    console.log('   🧪 TEST MODE: All SMS sent to', this.testPhoneNumber);
    
    const appointmentDateTime = new Date(appointment.date);
    const appointmentDate = appointmentDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTime = appointmentDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // SMS to Doctor (will go to test number)
    const doctorMessage = `New appointment booked!\nPatient: ${patient.name}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n- Heal Link`;
    await this.sendSMS(doctor?.phone || 'doctor', doctorMessage);

    // SMS to Patient (will go to test number)
    const patientMessage = `Appointment confirmed!\nDoctor: Dr. ${doctor.name}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nLocation: ${appointment.location || 'Heal Link Clinic'}\n- Heal Link`;
    await this.sendSMS(patient?.phone || 'patient', patientMessage);
  }

  /**
   * Send appointment cancelled SMS notification
   * @param {object} appointment - Appointment object
   * @param {object} doctor - Doctor object
   * @param {object} patient - Patient object
   * @param {string} cancelledBy - Who cancelled the appointment
   */
  async sendAppointmentCancelledSMS(appointment, doctor, patient, cancelledBy) {
    console.log('📨 Preparing appointment cancelled SMS...');
    console.log('   🧪 TEST MODE: All SMS sent to', this.testPhoneNumber);
    
    const appointmentDateTime = new Date(appointment.date);
    const appointmentDate = appointmentDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTime = appointmentDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // SMS to Doctor (if patient cancelled)
    if (cancelledBy !== 'doctor') {
      const doctorMessage = `Appointment cancelled by patient\nPatient: ${patient.name}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nReason: ${appointment.cancellationReason || 'Not specified'}\n- Heal Link`;
      await this.sendSMS(doctor?.phone || 'doctor', doctorMessage);
    }

    // SMS to Patient (if doctor or admin cancelled)
    if (cancelledBy !== 'patient') {
      const patientMessage = `Your appointment has been cancelled\nDoctor: Dr. ${doctor.name}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nReason: ${appointment.cancellationReason || 'Please contact clinic'}\n- Heal Link`;
      await this.sendSMS(patient?.phone || 'patient', patientMessage);
    }
  }

  /**
   * Send appointment rescheduled SMS notification
   * @param {object} appointment - Appointment object
   * @param {object} doctor - Doctor object
   * @param {object} patient - Patient object
   * @param {string} oldDate - Previous appointment date
   * @param {string} newDate - New appointment date
   */
  async sendAppointmentRescheduledSMS(appointment, doctor, patient, oldDate, newDate) {
    console.log('📨 Preparing appointment rescheduled SMS...');
    console.log('   🧪 TEST MODE: All SMS sent to', this.testPhoneNumber);
    
    const oldDateTime = new Date(oldDate);
    const oldDateFormatted = oldDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const oldTimeFormatted = oldDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const newDateTime = new Date(newDate);
    const newDateFormatted = newDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const newTimeFormatted = newDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // SMS to Doctor
    const doctorMessage = `Appointment rescheduled\nPatient: ${patient.name}\nOld: ${oldDateFormatted} ${oldTimeFormatted}\nNew: ${newDateFormatted} ${newTimeFormatted}\n- Heal Link`;
    await this.sendSMS(doctor?.phone || 'doctor', doctorMessage);

    // SMS to Patient
    const patientMessage = `Your appointment has been rescheduled\nDoctor: Dr. ${doctor.name}\nOld: ${oldDateFormatted} ${oldTimeFormatted}\nNew: ${newDateFormatted} ${newTimeFormatted}\nLocation: ${appointment.location || 'Heal Link Clinic'}\n- Heal Link`;
    await this.sendSMS(patient?.phone || 'patient', patientMessage);
  }

  /**
   * Send appointment reminder SMS (24 hours before)
   * @param {object} appointment - Appointment object
   * @param {object} doctor - Doctor object
   * @param {object} patient - Patient object
   */
  async sendAppointmentReminderSMS(appointment, doctor, patient) {
    const appointmentDateTime = new Date(appointment.date);
    const appointmentDate = appointmentDateTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTime = appointmentDateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // SMS to Patient
    if (patient && patient.phone) {
      const patientMessage = `Reminder: You have an appointment tomorrow!\nDoctor: Dr. ${doctor.name}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\nLocation: ${appointment.location || 'Heal Link Clinic'}\nPlease arrive 10 minutes early.\n- Heal Link`;
      await this.sendSMS(patient.phone, patientMessage);
    }

    // SMS to Doctor
    if (doctor && doctor.phone) {
      const doctorMessage = `Reminder: Appointment tomorrow\nPatient: ${patient.name}\nDate: ${appointmentDate}\nTime: ${appointmentTime}\n- Heal Link`;
      await this.sendSMS(doctor.phone, doctorMessage);
    }
  }

  /**
   * Send custom SMS notification
   * @param {string} to - Recipient phone number
   * @param {string} title - Message title
   * @param {string} message - Message content
   */
  async sendCustomSMS(to, title, message) {
    if (!to) return null;
    
    const fullMessage = `${title}\n\n${message}\n\n- Heal Link`;
    return await this.sendSMS(to, fullMessage);
  }

  /**
   * Check if SMS service is enabled
   * @returns {boolean}
   */
  isServiceEnabled() {
    return this.isEnabled;
  }
}

// Export singleton instance
module.exports = new SMSService();
