const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['admin', 'doctor', 'patient', 'nurse'],
    index: true
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: [
      'appointment_booked',
      'appointment_rescheduled',
      'appointment_cancelled',
      'appointment_reminder',
      'feedback_submitted',
      'profile_updated',
      'profile_approved',
      'patient_registered',
      'prescription_reminder',
      'emergency_alert',
      'account_status_changed',
      'system_announcement'
    ],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  actionUrl: {
    type: String,
    trim: true
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Virtual for age of notification
NotificationSchema.virtual('age').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
});

// Method to mark as read
NotificationSchema.methods.markAsRead = async function() {
  this.read = true;
  return await this.save();
};

// Static method to create notification
NotificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = await this.create(notificationData);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Static method to get unread count
NotificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({ user: userId, read: false });
};

// Static method to mark all as read for a user
NotificationSchema.statics.markAllAsRead = async function(userId) {
  return await this.updateMany(
    { user: userId, read: false },
    { read: true }
  );
};

module.exports = mongoose.model('Notification', NotificationSchema);
