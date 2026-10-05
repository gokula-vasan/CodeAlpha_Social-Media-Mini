const Story = require('../models/Story');

// @desc    Get active stories (grouped by user)
// @route   GET /api/stories
// @access  Public / Optional Auth
exports.getStories = async (req, res) => {
  try {
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: 1 })
      .populate('user', 'name username avatar');

    // Group stories by user
    const userStoriesMap = {};
    stories.forEach((story) => {
      if (!story.user) return;
      const userId = story.user._id.toString();
      if (!userStoriesMap[userId]) {
        userStoriesMap[userId] = {
          user: story.user,
          stories: [],
        };
      }
      userStoriesMap[userId].stories.push(story);
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

// @desc    Create a new story
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

    const story = await Story.create({
      user: req.user._id,
      mediaUrl,
      caption: caption || '',
    });

    const populated = await Story.findById(story._id).populate(
      'user',
      'name username avatar'
    );

    res.status(201).json({
      success: true,
      message: 'Story added successfully!',
      story: populated,
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
