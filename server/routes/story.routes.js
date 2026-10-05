const express = require('express');
const router = express.Router();
const { getStories, createStory } = require('../controllers/story.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.route('/')
  .get(optionalAuth, getStories)
  .post(protect, upload.single('media'), createStory);

module.exports = router;
