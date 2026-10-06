const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @desc    Get user profile by username with posts
// @route   GET /api/users/profile/:username
// @access  Public / Optional Auth
exports.getUserProfile = async (req, res) => {
  try {
    const rawUsername = req.params.username || '';
    const username = rawUsername.replace(/^@/, '').trim().toLowerCase();
    const user = await User.findOne({ username })
      .select('-password')
      .populate('followers', 'name username avatar bio')
      .populate('following', 'name username avatar bio');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    // Get all posts by this user
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name username avatar');

    const currentUserId = req.user ? req.user._id.toString() : null;
    const currentUserFollowingIds = req.user
      ? (req.user.following || []).map((id) => id.toString())
      : [];

    const isFollowing = currentUserId
      ? user.followers.some((f) => f._id.toString() === currentUserId)
      : false;
    const isSelf = currentUserId === user._id.toString();

    // Enrich followers list
    const enrichedFollowers = user.followers.map((f) => {
      const fObj = f.toObject ? f.toObject() : (f._doc || f);
      const fId = (fObj._id || f._id).toString();
      return {
        _id: fId,
        name: fObj.name,
        username: fObj.username,
        avatar: fObj.avatar,
        bio: fObj.bio,
        isFollowing: !!(currentUserId && currentUserFollowingIds.includes(fId)),
        isSelf: !!(currentUserId && currentUserId === fId),
      };
    });

    // Enrich following list
    const enrichedFollowing = user.following.map((f) => {
      const fObj = f.toObject ? f.toObject() : (f._doc || f);
      const fId = (fObj._id || f._id).toString();
      return {
        _id: fId,
        name: fObj.name,
        username: fObj.username,
        avatar: fObj.avatar,
        bio: fObj.bio,
        isFollowing: !!(currentUserId && currentUserFollowingIds.includes(fId)),
        isSelf: !!(currentUserId && currentUserId === fId),
      };
    });

    // Format posts
    const formattedPosts = posts.map((post) => {
      const p = post.toObject();
      p.isLiked = currentUserId
        ? post.likes.some((id) => id.toString() === currentUserId)
        : false;
      return p;
    });

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        location: user.location,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: posts.length,
        isFollowing,
        isSelf,
        followers: enrichedFollowers,
        following: enrichedFollowing,
      },
      posts: formattedPosts,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Toggle follow/unfollow user
// @route   PUT /api/users/:id/follow
// @access  Private
exports.toggleFollowUser = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId.toString() === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself',
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === targetUserId.toString()
    );

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUserId.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUserId.toString()
      );

      await currentUser.save();
      await targetUser.save();

      // Remove follow notification
      await Notification.findOneAndDelete({
        recipient: targetUserId,
        sender: currentUserId,
        type: 'follow',
      });

      return res.status(200).json({
        success: true,
        isFollowing: false,
        followersCount: targetUser.followers.length,
        message: `Unfollowed @${targetUser.username}`,
      });
    } else {
      // Follow
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);

      await currentUser.save();
      await targetUser.save();

      // Create follow notification
      await Notification.create({
        recipient: targetUserId,
        sender: currentUserId,
        type: 'follow',
        text: 'started following you',
      });

      return res.status(200).json({
        success: true,
        isFollowing: true,
        followersCount: targetUser.followers.length,
        message: `Now following @${targetUser.username}`,
      });
    }
  } catch (error) {
    console.error('Follow toggle error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get suggested users to follow
// @route   GET /api/users/suggestions
// @access  Public / Optional Auth
exports.getSuggestions = async (req, res) => {
  try {
    let excludeIds = [];
    if (req.user) {
      excludeIds = [req.user._id, ...req.user.following];
    }

    const suggestions = await User.find({ _id: { $nin: excludeIds } })
      .select('name username avatar bio followers')
      .limit(6);

    const formatted = suggestions.map((user) => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      followersCount: user.followers.length,
    }));

    res.status(200).json({
      success: true,
      suggestions: formatted,
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Search users by name or username
// @route   GET /api/users/search
// @access  Public
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json({ success: true, users: [] });
    }

    const queryRegex = new RegExp(q.trim(), 'i');
    const users = await User.find({
      $or: [{ username: queryRegex }, { name: queryRegex }],
    })
      .select('name username avatar bio followers')
      .limit(10);

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get user's saved posts
// @route   GET /api/users/saved-posts
// @access  Private
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: {
        path: 'user',
        select: 'name username avatar',
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Filter out any nulls if referenced posts were deleted
    const validPosts = (user.savedPosts || []).filter((p) => p !== null);

    res.status(200).json({
      success: true,
      posts: validPosts,
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get all accounts (for quick account switcher & discovery)
// @route   GET /api/users/accounts
// @access  Public
exports.getAllAccounts = async (req, res) => {
  try {
    const users = await User.find({})
      .select('name username avatar bio followers following')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      accounts: users.map((u) => ({
        _id: u._id,
        name: u.name,
        username: u.username,
        avatar: u.avatar,
        bio: u.bio,
        followersCount: (u.followers || []).length,
        followingCount: (u.following || []).length,
      })),
    });
  } catch (error) {
    console.error('Get all accounts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
