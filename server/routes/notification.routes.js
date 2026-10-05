const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationsRead,
} = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.put('/mark-read', protect, markNotificationsRead);

module.exports = router;
