const path = require('path');
const fs = require('fs');
const Story = require('../models/Story');

// Helper to remove uploaded media file if stored locally
const removeMediaFile = (mediaUrl) => {
  if (!mediaUrl || !mediaUrl.startsWith('/uploads/')) return;
  try {
    const filePath = path.join(__dirname, '../../public', mediaUrl);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting story file ${filePath}:`, err.message);
      });
    }
  } catch (err) {
    console.error('removeMediaFile error:', err.message);
  }
};

// @desc    Proactively cleanup stories older than 24 hours
// Deletes both the database records and any uploaded media files from disk
const cleanupExpiredStories = async () => {
  try {
    const now = new Date();
    const expiredStories = await Story.find({ expiresAt: { $lte: now } });

    if (expiredStories.length > 0) {
      for (const story of expiredStories) {
        removeMediaFile(story.mediaUrl);
      }
      const deleteResult = await Story.deleteMany({ expiresAt: { $lte: now } });
      console.log(`🧹 Auto-cleaned ${deleteResult.deletedCount} expired stories (>24h old)`);
    }
  } catch (error) {
    console.error('Story auto-cleanup error:', error.message);
  }
};

// @desc    Get active stories (grouped by user)
// @route   GET /api/stories
// @access  Public / Optional Auth
exports.getStories = async (req, res) => {
  try {
    // 1. Proactively purge any expired stories (>24h old)
    await cleanupExpiredStories();

    // 2. Fetch only active unexpired stories (within 24 hours)
    const now = new Date();
    const stories = await Story.find({
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: 1 })
      .populate('user', 'name username avatar');

    // Group stories by user and calculate time remaining
    const userStoriesMap = {};
    stories.forEach((story) => {
      if (!story.user) return;
      const userId = story.user._id.toString();

      const timeRemainingMs = Math.max(0, new Date(story.expiresAt).getTime() - now.getTime());
      const hoursRemaining = Math.max(1, Math.ceil(timeRemainingMs / (1000 * 60 * 60)));

      const storyObj = {
        _id: story._id,
        user: story.user,
        mediaUrl: story.mediaUrl,
        caption: story.caption,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        timeRemainingHours: hoursRemaining,
        timeRemainingFormatted: `${hoursRemaining}h left`,
      };

      if (!userStoriesMap[userId]) {
        userStoriesMap[userId] = {
          user: story.user,
          stories: [],
        };
      }
      userStoriesMap[userId].stories.push(storyObj);
    });

    const groupedStories = Object.values(userStoriesMap);

    res.status(200).json({
      success: true,
      data: groupedStories,
    });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Create a new story (automatically expires in 24 hours)
// @route   POST /api/stories
// @access  Private
exports.createStory = async (req, res) => {
  try {
    const { caption } = req.body;
    let mediaUrl = req.body.mediaUrl;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide media for the story',
      });
    }

    // Story expires exactly 24 hours from creation time
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await Story.create({
      user: req.user._id,
      mediaUrl,
      caption: caption || '',
      expiresAt,
    });

    const populated = await Story.findById(story._id).populate(
      'user',
      'name username avatar'
    );

    res.status(201).json({
      success: true,
      message: 'Story added successfully! It will disappear after 24 hours.',
      story: {
        ...populated.toObject(),
        timeRemainingHours: 24,
        timeRemainingFormatted: '24h left',
      },
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete story manually before 24 hours
// @route   DELETE /api/stories/:id
// @access  Private
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found or already expired',
      });
    }

    // Check ownership: strictly only the user who posted the story can delete it
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this story. Only the user who posted it can delete it.',
      });
    }

    // Remove file if local upload
    removeMediaFile(story.mediaUrl);

    await Story.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// Export cleanup function for server background scheduler
exports.cleanupExpiredStories = cleanupExpiredStories;
