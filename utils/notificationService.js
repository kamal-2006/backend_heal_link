const Notification = require('../models/Notification');
const smsService = require('./smsService');

/**
 * Notification utility to create and send notifications
 * This will be used throughout the application controllers
 */

class NotificationService {
  /**
   * Enrich a minimal user-like object with name and phone from the User model if missing
   * @param {Object} userLike - Object that may contain _id, name, phone
   * @returns {Promise<{_id:any,name:string,phone:string|null}>}
   */
  static async enrichUserInfo(userLike) {
    try {
      if (!userLike || !userLike._id) return null;
      const hasName = typeof userLike.name === 'string' && userLike.name.trim().length > 0;
      const hasPhone = typeof userLike.phone === 'string' && userLike.phone.trim().length > 0;
      if (hasName && hasPhone) return userLike;

      const User = require('../models/User');
      const u = await User.findById(userLike._id).select('firstName lastName phone');
      if (!u) return userLike;
      return {
        _id: userLike._id,
        name: hasName ? userLike.name : `${u.firstName || ''} ${u.lastName || ''}`.trim(),
        phone: hasPhone ? userLike.phone : (u.phone || null),
      };
    } catch (e) {
      console.error('Error enriching user info:', e);
      return userLike;
    }
  }
  /**
   * Create a notification
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Notification>}
   */
  static async createNotification(notificationData) {
    try {
      const notification = await Notification.create(notificationData);
      
      // Emit socket event if io is available
      if (global.io) {
        const socketId = global.userSockets?.[notification.user.toString()];
        if (socketId) {
          global.io.to(socketId).emit('notification', notification);
        }
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send appointment booked notification
   */
  static async sendAppointmentBookedNotification(appointment, doctor, patient) {
    // Ensure we have names and phone numbers for SMS
    const doctorInfo = await this.enrichUserInfo(doctor);
    const patientInfo = await this.enrichUserInfo(patient);
    const notifications = [];

    // Notification to doctor
    if (doctor && doctor._id) {
      notifications.push({
        user: doctor._id,
        role: 'doctor',
        type: 'appointment_booked',
        title: 'New Appointment Booked',
        message: `New appointment booked by ${(patientInfo?.name || patient?.name || 'patient')} on ${new Date(appointment.date).toLocaleDateString()}`,
        data: {
          appointmentId: appointment._id,
          patientId: patient._id,
          patientName: patientInfo?.name || patient?.name,
          date: appointment.date,
          time: appointment.time
        },
        priority: 'high',
        actionUrl: `/doctor/appointments/${appointment._id}`
      });
    }

    // Notification to patient
    if (patient && patient._id) {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'appointment_booked',
        title: 'Appointment Confirmed',
        message: `Your appointment with Dr. ${(doctorInfo?.name || doctor?.name || 'Doctor')} is confirmed for ${new Date(appointment.date).toLocaleDateString()}`,
        data: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          doctorName: doctorInfo?.name || doctor?.name,
          date: appointment.date,
          time: appointment.time
        },
        priority: 'high',
        actionUrl: `/patient/appointments/${appointment._id}`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'appointment_booked',
          title: 'New Appointment Created',
          message: `${(patientInfo?.name || patient?.name)} booked appointment with Dr. ${(doctorInfo?.name || doctor?.name)} on ${new Date(appointment.date).toLocaleDateString()}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patientInfo?.name || patient?.name,
            doctorId: doctor._id,
            doctorName: doctorInfo?.name || doctor?.name,
            date: appointment.date,
            time: appointment.time
          },
          priority: 'low',
          actionUrl: `/admin/appointments/${appointment._id}`
        });
      }

      // Notify all nurses
      const nurses = await User.find({ role: 'nurse' }).select('_id');
      for (const nurse of nurses) {
        notifications.push({
          user: nurse._id,
          role: 'nurse',
          type: 'appointment_booked',
          title: 'New Appointment Scheduled',
          message: `${(patientInfo?.name || patient?.name)} booked appointment with Dr. ${(doctorInfo?.name || doctor?.name)} on ${new Date(appointment.date).toLocaleDateString()}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patientInfo?.name || patient?.name,
            doctorId: doctor._id,
            doctorName: doctorInfo?.name || doctor?.name,
            date: appointment.date,
            time: appointment.time
          },
          priority: 'low',
          actionUrl: `/nurse/appointments/${appointment._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins/nurses:', error);
    }

    // Send SMS notifications
    try {
      console.log('📱 Attempting to send appointment booked SMS...');
      console.log('   Doctor info:', { id: doctorInfo?._id, name: doctorInfo?.name, phone: doctorInfo?.phone });
      console.log('   Patient info:', { id: patientInfo?._id, name: patientInfo?.name, phone: patientInfo?.phone });
      await smsService.sendAppointmentBookedSMS(appointment, doctorInfo || doctor, patientInfo || patient);
    } catch (error) {
      console.error('❌ Error sending SMS notifications:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send appointment rescheduled notification
   */
  static async sendAppointmentRescheduledNotification(appointment, doctor, patient, oldDate, newDate) {
    const doctorInfo = await this.enrichUserInfo(doctor);
    const patientInfo = await this.enrichUserInfo(patient);
    const notifications = [];

    // Notification to doctor
    if (doctor && doctor._id) {
      notifications.push({
        user: doctor._id,
        role: 'doctor',
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled',
  message: `Appointment with ${(patientInfo?.name || patient?.name)} has been rescheduled to ${new Date(newDate).toLocaleDateString()}`,
        data: {
          appointmentId: appointment._id,
          patientId: patient._id,
          patientName: patientInfo?.name || patient?.name,
          oldDate,
          newDate,
          time: appointment.time
        },
        priority: 'medium',
        actionUrl: `/doctor/appointments/${appointment._id}`
      });
    }

    // Notification to patient
    if (patient && patient._id) {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'appointment_rescheduled',
        title: 'Appointment Rescheduled',
  message: `Your appointment with Dr. ${(doctorInfo?.name || doctor?.name)} has been rescheduled to ${new Date(newDate).toLocaleDateString()}`,
        data: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          doctorName: doctorInfo?.name || doctor?.name,
          oldDate,
          newDate,
          time: appointment.time
        },
        priority: 'medium',
        actionUrl: `/patient/appointments/${appointment._id}`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'appointment_rescheduled',
          title: 'Appointment Rescheduled',
          message: `Appointment between ${(patientInfo?.name || patient?.name)} and Dr. ${(doctorInfo?.name || doctor?.name)} rescheduled to ${new Date(newDate).toLocaleDateString()}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patientInfo?.name || patient?.name,
            doctorId: doctor._id,
            doctorName: doctorInfo?.name || doctor?.name,
            oldDate,
            newDate,
            time: appointment.time
          },
          priority: 'low',
          actionUrl: `/admin/appointments/${appointment._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }

    // Notification to all nurses
    try {
      const User = require('../models/User');
      const nurses = await User.find({ role: 'nurse' }).select('_id');
      for (const nurse of nurses) {
        notifications.push({
          user: nurse._id,
          role: 'nurse',
          type: 'appointment_rescheduled',
          title: 'Appointment Rescheduled',
          message: `Appointment for ${(patientInfo?.name || patient?.name)} with Dr. ${(doctorInfo?.name || doctor?.name)} rescheduled to ${new Date(newDate).toLocaleDateString()}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patientInfo?.name || patient?.name,
            doctorId: doctor._id,
            doctorName: doctorInfo?.name || doctor?.name,
            oldDate,
            newDate,
            time: appointment.time
          },
          priority: 'medium',
          actionUrl: `/nurse/appointments`
        });
      }
    } catch (error) {
      console.error('Error notifying nurses:', error);
    }

    // Send SMS notifications
    try {
      console.log('📱 Attempting to send appointment rescheduled SMS...');
      console.log('   Doctor info:', { id: doctorInfo?._id, name: doctorInfo?.name, phone: doctorInfo?.phone });
      console.log('   Patient info:', { id: patientInfo?._id, name: patientInfo?.name, phone: patientInfo?.phone });
      await smsService.sendAppointmentRescheduledSMS(appointment, doctorInfo || doctor, patientInfo || patient, oldDate, newDate);
    } catch (error) {
      console.error('❌ Error sending SMS notifications:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send appointment cancelled notification
   */
  static async sendAppointmentCancelledNotification(appointment, doctor, patient, cancelledBy) {
    const doctorInfo = await this.enrichUserInfo(doctor);
    const patientInfo = await this.enrichUserInfo(patient);
    const notifications = [];

    // Notification to doctor
    if (doctor && doctor._id && cancelledBy !== 'doctor') {
      notifications.push({
        user: doctor._id,
        role: 'doctor',
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
  message: `Appointment with ${(patientInfo?.name || patient?.name)} on ${new Date(appointment.date).toLocaleDateString()} has been cancelled`,
        data: {
          appointmentId: appointment._id,
          patientId: patient._id,
          patientName: patientInfo?.name || patient?.name,
          date: appointment.date,
          cancelledBy
        },
        priority: 'medium',
        actionUrl: `/doctor/appointments`
      });
    }

    // Notification to patient
    if (patient && patient._id && cancelledBy !== 'patient') {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
  message: `Your appointment with Dr. ${(doctorInfo?.name || doctor?.name)} on ${new Date(appointment.date).toLocaleDateString()} has been cancelled`,
        data: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          doctorName: doctorInfo?.name || doctor?.name,
          date: appointment.date,
          cancelledBy
        },
        priority: 'medium',
        actionUrl: `/patient/appointments`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          message: `Appointment between ${(patientInfo?.name || patient?.name)} and Dr. ${(doctorInfo?.name || doctor?.name)} cancelled by ${cancelledBy}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patientInfo?.name || patient?.name,
            doctorId: doctor._id,
            doctorName: doctorInfo?.name || doctor?.name,
            date: appointment.date,
            cancelledBy
          },
          priority: 'low',
          actionUrl: `/admin/appointments`
        });
      }

      // Notify all nurses
      const nurses = await User.find({ role: 'nurse' }).select('_id');
      for (const nurse of nurses) {
        notifications.push({
          user: nurse._id,
          role: 'nurse',
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          message: `Appointment for ${(patientInfo?.name || patient?.name)} with Dr. ${(doctorInfo?.name || doctor?.name)} has been cancelled`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patientInfo?.name || patient?.name,
            doctorId: doctor._id,
            doctorName: doctorInfo?.name || doctor?.name,
            date: appointment.date,
            cancelledBy
          },
          priority: 'medium',
          actionUrl: `/nurse/appointments`
        });
      }
    } catch (error) {
      console.error('Error notifying admins/nurses:', error);
    }

    // Send SMS notifications
    try {
      console.log('📱 Attempting to send appointment cancelled SMS...');
      console.log('   Doctor info:', { id: doctorInfo?._id, name: doctorInfo?.name, phone: doctorInfo?.phone });
      console.log('   Patient info:', { id: patientInfo?._id, name: patientInfo?.name, phone: patientInfo?.phone });
      console.log('   Cancelled by:', cancelledBy);
      await smsService.sendAppointmentCancelledSMS(appointment, doctorInfo || doctor, patientInfo || patient, cancelledBy);
    } catch (error) {
      console.error('❌ Error sending SMS notifications:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send appointment reminder notification
   */
  static async sendAppointmentReminderNotification(appointment, doctor, patient) {
    const doctorInfo = await this.enrichUserInfo(doctor);
    const patientInfo = await this.enrichUserInfo(patient);
    const notifications = [];

    // Notification to doctor
    if (doctor && doctor._id) {
      notifications.push({
        user: doctor._id,
        role: 'doctor',
        type: 'appointment_reminder',
        title: 'Appointment Reminder',
  message: `Upcoming appointment with ${(patientInfo?.name || patient?.name)} in 1 hour`,
        data: {
          appointmentId: appointment._id,
          patientId: patient._id,
          patientName: patientInfo?.name || patient?.name,
          date: appointment.date,
          time: appointment.time
        },
        priority: 'high',
        actionUrl: `/doctor/appointments/${appointment._id}`
      });
    }

    // Notification to patient
    if (patient && patient._id) {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'appointment_reminder',
        title: 'Appointment Reminder',
  message: `Your appointment with Dr. ${(doctorInfo?.name || doctor?.name)} is in 1 hour`,
        data: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          doctorName: doctorInfo?.name || doctor?.name,
          date: appointment.date,
          time: appointment.time
        },
        priority: 'high',
        actionUrl: `/patient/appointments/${appointment._id}`
      });
    }

    // Send SMS reminder notifications
    try {
      await smsService.sendAppointmentReminderSMS(appointment, doctorInfo || doctor, patientInfo || patient);
    } catch (error) {
      console.error('Error sending SMS reminder:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send feedback submitted notification
   */
  static async sendFeedbackSubmittedNotification(feedback, doctor, patient) {
    const notifications = [];

    // Notification to doctor
    if (doctor && doctor._id) {
      notifications.push({
        user: doctor._id,
        role: 'doctor',
        type: 'feedback_submitted',
        title: 'New Feedback Received',
        message: `${patient.name} left ${feedback.rating}-star feedback`,
        data: {
          feedbackId: feedback._id,
          patientId: patient._id,
          patientName: patient.name,
          rating: feedback.rating
        },
        priority: 'medium',
        actionUrl: `/doctor/feedback/${feedback._id}`
      });
    }

    // Notification to admin
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      notifications.push({
        user: admin._id,
        role: 'admin',
        type: 'feedback_submitted',
        title: 'New Feedback Submitted',
        message: `${patient.name} submitted feedback for Dr. ${doctor.name}`,
        data: {
          feedbackId: feedback._id,
          doctorId: doctor._id,
          patientId: patient._id,
          rating: feedback.rating
        },
        priority: 'low',
        actionUrl: `/admin/feedback/${feedback._id}`
      });
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send profile approved notification
   */
  static async sendProfileApprovedNotification(userId, role, profileType) {
    return await this.createNotification({
      user: userId,
      role,
      type: 'profile_approved',
      title: 'Profile Approved',
      message: `Your ${profileType} profile has been approved and is now active`,
      data: { profileType },
      priority: 'high',
      actionUrl: `/${role}/profile`
    });
  }

  /**
   * Send patient registered notification
   */
  static async sendPatientRegisteredNotification(patient) {
    const notifications = [];

    // Welcome notification to patient
    notifications.push({
      user: patient._id,
      role: 'patient',
      type: 'patient_registered',
      title: 'Welcome to Heal Link!',
      message: 'Your account has been successfully created. Start booking appointments now!',
      data: { patientId: patient._id },
      priority: 'medium',
      actionUrl: '/patient/dashboard'
    });

    // Notification to admin
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      notifications.push({
        user: admin._id,
        role: 'admin',
        type: 'patient_registered',
        title: 'New Patient Registered',
        message: `${patient.name} has registered on the platform`,
        data: { patientId: patient._id, patientName: patient.name },
        priority: 'low',
        actionUrl: `/admin/patients/${patient._id}`
      });
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send account status changed notification
   */
  static async sendAccountStatusChangedNotification(userId, role, status, reason) {
    return await this.createNotification({
      user: userId,
      role,
      type: 'account_status_changed',
      title: `Account ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your account has been ${status}${reason ? ': ' + reason : ''}`,
      data: { status, reason },
      priority: 'urgent',
      actionUrl: `/${role}/profile`
    });
  }

  /**
   * Send system announcement
   */
  static async sendSystemAnnouncement(title, message, targetRole = null, priority = 'medium') {
    const User = require('../models/User');
    const query = targetRole ? { role: targetRole } : {};
    const users = await User.find(query).select('_id role');

    const notifications = users.map(user => ({
      user: user._id,
      role: user.role,
      type: 'system_announcement',
      title,
      message,
      priority,
      data: {}
    }));

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send doctor swap notification to patient
   */
  static async sendDoctorSwapNotification(patient, oldDoctor, newDoctor, appointment) {
    const notifications = [];

    // Notification to patient
    if (patient && patient._id) {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'doctor_swapped',
        title: 'Doctor Assignment Changed',
        message: `Your doctor has been changed from Dr. ${oldDoctor.name} to Dr. ${newDoctor.name}`,
        data: {
          appointmentId: appointment._id,
          oldDoctorId: oldDoctor._id,
          oldDoctorName: oldDoctor.name,
          newDoctorId: newDoctor._id,
          newDoctorName: newDoctor.name,
          date: appointment.date
        },
        priority: 'high',
        actionUrl: `/patient/appointments/${appointment._id}`
      });
    }

    // Notification to new doctor
    if (newDoctor && newDoctor._id) {
      notifications.push({
        user: newDoctor._id,
        role: 'doctor',
        type: 'appointment_assigned',
        title: 'New Appointment Assigned',
        message: `Appointment with ${patient.name} has been assigned to you`,
        data: {
          appointmentId: appointment._id,
          patientId: patient._id,
          patientName: patient.name,
          date: appointment.date
        },
        priority: 'medium',
        actionUrl: `/doctor/appointments/${appointment._id}`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'doctor_swapped',
          title: 'Doctor Swap Completed',
          message: `Dr. ${oldDoctor.name} swapped with Dr. ${newDoctor.name} for ${patient.name}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patient.name,
            oldDoctorId: oldDoctor._id,
            oldDoctorName: oldDoctor.name,
            newDoctorId: newDoctor._id,
            newDoctorName: newDoctor.name,
            date: appointment.date
          },
          priority: 'low',
          actionUrl: `/admin/appointments/${appointment._id}`
        });
      }

      // Notify all nurses
      const nurses = await User.find({ role: 'nurse' }).select('_id');
      for (const nurse of nurses) {
        notifications.push({
          user: nurse._id,
          role: 'nurse',
          type: 'doctor_swapped',
          title: 'Doctor Assignment Changed',
          message: `Dr. ${oldDoctor.name} swapped with Dr. ${newDoctor.name} for ${patient.name}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patient.name,
            oldDoctorId: oldDoctor._id,
            oldDoctorName: oldDoctor.name,
            newDoctorId: newDoctor._id,
            newDoctorName: newDoctor.name,
            date: appointment.date
          },
          priority: 'medium',
          actionUrl: `/nurse/appointments/${appointment._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins/nurses:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send medical record uploaded notification
   */
  static async sendMedicalRecordUploadedNotification(medicalRecord, patient, doctor) {
    const notifications = [];

    // Notification to patient
    if (patient && patient._id) {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'medical_record_uploaded',
        title: 'New Medical Report Available',
        message: `Dr. ${doctor.name} has uploaded a new medical report: ${medicalRecord.recordType}`,
        data: {
          recordId: medicalRecord._id,
          recordType: medicalRecord.recordType,
          doctorId: doctor._id,
          doctorName: doctor.name,
          date: medicalRecord.date
        },
        priority: 'high',
        actionUrl: `/patient/reports/${medicalRecord._id}`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'medical_record_uploaded',
          title: 'New Medical Report Uploaded',
          message: `Dr. ${doctor.name} uploaded ${medicalRecord.recordType} for ${patient.name}`,
          data: {
            recordId: medicalRecord._id,
            recordType: medicalRecord.recordType,
            patientId: patient._id,
            patientName: patient.name,
            doctorId: doctor._id,
            doctorName: doctor.name,
            date: medicalRecord.date
          },
          priority: 'low',
          actionUrl: `/admin/patients/${patient._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send medication added notification
   */
  static async sendMedicationAddedNotification(medication, patient, doctor) {
    const notifications = [];

    // Notification to patient
    if (patient && patient._id) {
      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'medication_added',
        title: 'New Medication Prescribed',
        message: `Dr. ${doctor.name} has prescribed ${medication.name} for you`,
        data: {
          medicationId: medication._id,
          medicationName: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          doctorId: doctor._id,
          doctorName: doctor.name,
          startDate: medication.startDate,
          endDate: medication.endDate
        },
        priority: 'high',
        actionUrl: `/patient/medications/${medication._id}`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'medication_added',
          title: 'New Medication Prescribed',
          message: `Dr. ${doctor.name} prescribed ${medication.name} for ${patient.name}`,
          data: {
            medicationId: medication._id,
            medicationName: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            patientId: patient._id,
            patientName: patient.name,
            doctorId: doctor._id,
            doctorName: doctor.name,
            startDate: medication.startDate,
            endDate: medication.endDate
          },
          priority: 'low',
          actionUrl: `/admin/patients/${patient._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send medication updated notification
   */
  static async sendMedicationUpdatedNotification(medication, patient, doctor, updateType = 'modified') {
    const notifications = [];

    // Notification to patient
    if (patient && patient._id) {
      const titleMap = {
        modified: 'Medication Updated',
        stopped: 'Medication Stopped',
        dosage_changed: 'Medication Dosage Changed'
      };

      const messageMap = {
        modified: `Dr. ${doctor.name} has updated your medication: ${medication.name}`,
        stopped: `Dr. ${doctor.name} has stopped your medication: ${medication.name}`,
        dosage_changed: `Dr. ${doctor.name} has changed the dosage of ${medication.name}`
      };

      notifications.push({
        user: patient._id,
        role: 'patient',
        type: 'medication_updated',
        title: titleMap[updateType] || 'Medication Updated',
        message: messageMap[updateType] || `Dr. ${doctor.name} has updated your medication: ${medication.name}`,
        data: {
          medicationId: medication._id,
          medicationName: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          doctorId: doctor._id,
          doctorName: doctor.name,
          updateType,
          status: medication.status
        },
        priority: updateType === 'stopped' ? 'high' : 'medium',
        actionUrl: `/patient/medications/${medication._id}`
      });
    }

    // Notification to all admins
    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      
      const titleMap = {
        modified: 'Medication Updated',
        stopped: 'Medication Stopped',
        dosage_changed: 'Medication Dosage Changed'
      };

      const messageMap = {
        modified: `Dr. ${doctor.name} updated medication ${medication.name} for ${patient.name}`,
        stopped: `Dr. ${doctor.name} stopped medication ${medication.name} for ${patient.name}`,
        dosage_changed: `Dr. ${doctor.name} changed dosage of ${medication.name} for ${patient.name}`
      };

      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'medication_updated',
          title: titleMap[updateType] || 'Medication Updated',
          message: messageMap[updateType] || `Dr. ${doctor.name} updated medication ${medication.name} for ${patient.name}`,
          data: {
            medicationId: medication._id,
            medicationName: medication.name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            patientId: patient._id,
            patientName: patient.name,
            doctorId: doctor._id,
            doctorName: doctor.name,
            updateType,
            status: medication.status
          },
          priority: updateType === 'stopped' ? 'medium' : 'low',
          actionUrl: `/admin/patients/${patient._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send feedback request notification
   */
  static async sendFeedbackRequestNotification(appointment, patient, doctor) {
    // Notification to patient
    if (patient && patient._id) {
      return await this.createNotification({
        user: patient._id,
        role: 'patient',
        type: 'feedback_requested',
        title: 'Please Share Your Feedback',
        message: `How was your appointment with Dr. ${doctor.name}? Please share your experience.`,
        data: {
          appointmentId: appointment._id,
          doctorId: doctor._id,
          doctorName: doctor.name,
          appointmentDate: appointment.date
        },
        priority: 'medium',
        actionUrl: `/patient/feedback?appointmentId=${appointment._id}`
      });
    }
  }

  /**
   * Send doctor profile update notification to admins
   */
  static async sendDoctorProfileUpdateNotification(doctor, updateType = 'profile_updated') {
    const notifications = [];

    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      
      const titleMap = {
        profile_updated: 'Doctor Profile Updated',
        profile_created: 'New Doctor Registration',
        status_changed: 'Doctor Status Changed'
      };

      const messageMap = {
        profile_updated: `Dr. ${doctor.name} updated their profile`,
        profile_created: `Dr. ${doctor.name} has registered on the platform`,
        status_changed: `Dr. ${doctor.name} status changed to ${doctor.status || 'active'}`
      };

      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'doctor_profile_updated',
          title: titleMap[updateType] || 'Doctor Profile Update',
          message: messageMap[updateType] || `Dr. ${doctor.name} updated their profile`,
          data: {
            doctorId: doctor._id,
            doctorName: doctor.name,
            updateType,
            status: doctor.status
          },
          priority: updateType === 'profile_created' ? 'medium' : 'low',
          actionUrl: `/admin/doctors/${doctor._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send nurse profile update notification to admins
   */
  static async sendNurseProfileUpdateNotification(nurse, updateType = 'profile_updated') {
    const notifications = [];

    try {
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin' }).select('_id');
      
      const titleMap = {
        profile_updated: 'Nurse Profile Updated',
        profile_created: 'New Nurse Registration',
        status_changed: 'Nurse Status Changed'
      };

      const messageMap = {
        profile_updated: `${nurse.name} updated their profile`,
        profile_created: `${nurse.name} has registered as a nurse`,
        status_changed: `${nurse.name} status changed to ${nurse.status || 'active'}`
      };

      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'nurse_profile_updated',
          title: titleMap[updateType] || 'Nurse Profile Update',
          message: messageMap[updateType] || `${nurse.name} updated their profile`,
          data: {
            nurseId: nurse._id,
            nurseName: nurse.name,
            updateType,
            status: nurse.status
          },
          priority: updateType === 'profile_created' ? 'medium' : 'low',
          actionUrl: `/admin/nurses/${nurse._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send emergency alert notification (to admins and relevant medical staff)
   */
  static async sendEmergencyAlertNotification(patient, message, severity = 'high') {
    const notifications = [];

    try {
      const User = require('../models/User');
      
      // Notify all admins
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        notifications.push({
          user: admin._id,
          role: 'admin',
          type: 'emergency_alert',
          title: '🚨 Emergency Alert',
          message: `Emergency for ${patient.name}: ${message}`,
          data: {
            patientId: patient._id,
            patientName: patient.name,
            severity,
            alertMessage: message
          },
          priority: 'urgent',
          actionUrl: `/admin/patients/${patient._id}`
        });
      }
      
      // Optionally notify patient's assigned doctors
      if (patient.assignedDoctor) {
        notifications.push({
          user: patient.assignedDoctor,
          role: 'doctor',
          type: 'emergency_alert',
          title: '🚨 Emergency Alert',
          message: `Emergency for your patient ${patient.name}: ${message}`,
          data: {
            patientId: patient._id,
            patientName: patient.name,
            severity,
            alertMessage: message
          },
          priority: 'urgent',
          actionUrl: `/doctor/patients/${patient._id}`
        });
      }
    } catch (error) {
      console.error('Error sending emergency alert:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send medication reminder notification to patient
   */
  static async sendMedicationReminderNotification(medication, patient) {
    return await this.createNotification({
      user: patient._id,
      role: 'patient',
      type: 'medication_reminder',
      title: '💊 Medication Reminder',
      message: `Time to take your medication: ${medication.name} (${medication.dosage})`,
      data: {
        medicationId: medication._id,
        medicationName: medication.name,
        dosage: medication.dosage,
        frequency: medication.frequency,
        timeToTake: new Date().toISOString()
      },
      priority: 'high',
      actionUrl: `/patient/medications/${medication._id}`
    });
  }

  /**
   * Send nurse notification for appointment events
   */
  static async sendNurseAppointmentNotification(appointment, doctor, patient, eventType) {
    const notifications = [];

    try {
      const User = require('../models/User');
      const nurses = await User.find({ role: 'nurse' }).select('_id');
      
      const titleMap = {
        appointment_booked: 'New Appointment Scheduled',
        appointment_cancelled: 'Appointment Cancelled',
        appointment_rescheduled: 'Appointment Rescheduled',
        doctor_swap: 'Doctor Assignment Changed'
      };

      const messageMap = {
        appointment_booked: `${patient.name} has booked an appointment with Dr. ${doctor.name} on ${new Date(appointment.date).toLocaleDateString()}`,
        appointment_cancelled: `Appointment for ${patient.name} with Dr. ${doctor.name} has been cancelled`,
        appointment_rescheduled: `Appointment for ${patient.name} with Dr. ${doctor.name} has been rescheduled`,
        doctor_swap: `Doctor swap occurred for ${patient.name}'s appointment`
      };

      for (const nurse of nurses) {
        notifications.push({
          user: nurse._id,
          role: 'nurse',
          type: eventType,
          title: titleMap[eventType] || 'Appointment Update',
          message: messageMap[eventType] || `Appointment update for ${patient.name}`,
          data: {
            appointmentId: appointment._id,
            patientId: patient._id,
            patientName: patient.name,
            doctorId: doctor._id,
            doctorName: doctor.name,
            date: appointment.date
          },
          priority: eventType === 'appointment_cancelled' ? 'medium' : 'low',
          actionUrl: `/nurse/appointments/${appointment._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying nurses:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }

  /**
   * Send nurse notification for task assignment
   */
  static async sendNurseTaskAssignedNotification(task, nurse, assignedBy) {
    return await this.createNotification({
      user: nurse._id,
      role: 'nurse',
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${assignedBy.name} assigned you a new task: ${task.title}`,
      data: {
        taskId: task._id,
        taskTitle: task.title,
        taskDescription: task.description,
        assignedById: assignedBy._id,
        assignedByName: assignedBy.name,
        dueDate: task.dueDate
      },
      priority: task.priority || 'medium',
      actionUrl: `/nurse/tasks/${task._id}`
    });
  }

  /**
   * Send nurse notification for report upload
   */
  static async sendNurseReportNotification(report, patient, doctor) {
    const notifications = [];

    try {
      const User = require('../models/User');
      const nurses = await User.find({ role: 'nurse' }).select('_id');
      
      for (const nurse of nurses) {
        notifications.push({
          user: nurse._id,
          role: 'nurse',
          type: 'report_uploaded',
          title: 'New Medical Report',
          message: `Dr. ${doctor.name} uploaded ${report.recordType} for ${patient.name}`,
          data: {
            reportId: report._id,
            reportType: report.recordType,
            patientId: patient._id,
            patientName: patient.name,
            doctorId: doctor._id,
            doctorName: doctor.name,
            uploadDate: report.date
          },
          priority: 'low',
          actionUrl: `/nurse/reports/${report._id}`
        });
      }
    } catch (error) {
      console.error('Error notifying nurses:', error);
    }

    return await Promise.all(notifications.map(n => this.createNotification(n)));
  }
}

module.exports = NotificationService;
