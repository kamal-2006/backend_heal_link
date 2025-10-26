const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all notifications for a user
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const { userId, role } = req.query;
  
  if (!userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  const query = { user: userId };
  if (role) {
    query.role = role;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const unreadCount = await Notification.getUnreadCount(userId);

  res.status(200).json({
    success: true,
    count: notifications.length,
    unreadCount,
    data: notifications
  });
});

// @desc    Get unread notifications count
// @route   GET /api/v1/notifications/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const { userId } = req.query;
  
  if (!userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  const unreadCount = await Notification.getUnreadCount(userId);

  res.status(200).json({
    success: true,
    unreadCount
  });
});

// @desc    Mark notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }

  await notification.markAsRead();

  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read for a user
// @route   PUT /api/v1/notifications/mark-all-read
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  
  if (!userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  const result = await Notification.markAllAsRead(userId);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount
  });
});

// @desc    Delete notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404));
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Notification deleted',
    data: {}
  });
});

// @desc    Delete all notifications for a user
// @route   DELETE /api/v1/notifications/delete-all
// @access  Private
exports.deleteAllNotifications = asyncHandler(async (req, res, next) => {
  const { userId } = req.body;
  
  if (!userId) {
    return next(new ErrorResponse('User ID is required', 400));
  }

  const result = await Notification.deleteMany({ user: userId });

  res.status(200).json({
    success: true,
    message: 'All notifications deleted',
    deletedCount: result.deletedCount
  });
});

// @desc    Create notification (admin/system use)
// @route   POST /api/v1/notifications
// @access  Private/Admin
exports.createNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.create(req.body);

  res.status(201).json({
    success: true,
    data: notification
  });
});

// @desc    Create broadcast notification (to all users or specific role)
// @route   POST /api/v1/notifications/broadcast
// @access  Private/Admin
exports.broadcastNotification = asyncHandler(async (req, res, next) => {
  const { title, message, role, type, priority, data } = req.body;
  
  if (!title || !message) {
    return next(new ErrorResponse('Title and message are required', 400));
  }

  // Get all users of specified role or all users
  const User = require('../models/User');
  const query = role ? { role } : {};
  const users = await User.find(query).select('_id role');

  // Create notification for each user
  const notifications = users.map(user => ({
    user: user._id,
    role: user.role,
    type: type || 'system_announcement',
    title,
    message,
    priority: priority || 'medium',
    data: data || {}
  }));

  const createdNotifications = await Notification.insertMany(notifications);

  res.status(201).json({
    success: true,
    message: `Broadcast notification sent to ${createdNotifications.length} users`,
    count: createdNotifications.length
  });
});
