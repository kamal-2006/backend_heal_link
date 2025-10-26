const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createNotification,
  broadcastNotification
} = require('../controllers/notifications');

const router = express.Router();

// Public routes (for now, add auth middleware later)
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', markAsRead);
router.put('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);
router.delete('/delete-all', deleteAllNotifications);
router.post('/', createNotification);
router.post('/broadcast', broadcastNotification);

module.exports = router;
