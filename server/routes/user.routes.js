const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  toggleFollowUser,
  getSuggestions,
  searchUsers,
  getSavedPosts,
} = require('../controllers/user.controller');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/search', searchUsers);
router.get('/suggestions', optionalAuth, getSuggestions);
router.get('/saved-posts', protect, getSavedPosts);
router.get('/profile/:username', optionalAuth, getUserProfile);
router.put('/:id/follow', protect, toggleFollowUser);

module.exports = router;
