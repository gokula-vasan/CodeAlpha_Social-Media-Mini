const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper to extract hashtags from text
const extractHashtags = (text) => {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_]+/g);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { caption, location, filter, tags } = req.body;
    let mediaUrl = req.body.mediaUrl;

    if (req.file) {
      mediaUrl = `/uploads/${req.file.filename}`;
    }

    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image for the post (upload or image URL)',
      });
    }

    // Auto extract tags from caption if not explicitly provided
    let postTags = [];
    if (tags) {
      postTags = Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim());
    } else if (caption) {
      postTags = extractHashtags(caption);
    }

    const post = await Post.create({
      user: req.user._id,
      caption: caption || '',
      mediaUrl,
      filter: filter || 'normal',
      location: location || '',
      tags: postTags,
    });

    const populatedPost = await Post.findById(post._id).populate(
      'user',
      'name username avatar'
    );

    res.status(201).json({
      success: true,
      message: 'Post created successfully!',
      post: populatedPost,
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while creating post',
    });
  }
};

// @desc    Get feed posts (For You / Following / By Tag)
// @route   GET /api/posts
// @access  Public / Optional Auth
exports.getPosts = async (req, res) => {
  try {
    const { feedType = 'foryou', tag, search, page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = {};

    if (tag) {
      const cleanTag = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`;
      query.tags = cleanTag;
    }

    if (search) {
      query.$or = [
        { caption: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    if (feedType === 'following' && req.user) {
      // Posts from users the current user follows + their own posts
      const followingList = [...req.user.following, req.user._id];
      query.user = { $in: followingList };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'name username avatar')
      .populate('comments.user', 'name username avatar');

    const totalPosts = await Post.countDocuments(query);

    // Format posts with isLiked and isSaved if user is authenticated
    const currentUserId = req.user ? req.user._id.toString() : null;
    const userSavedPosts = req.user ? req.user.savedPosts.map((id) => id.toString()) : [];

    const formattedPosts = posts.map((post) => {
      const p = post.toObject();
      p.isLiked = currentUserId
        ? post.likes.some((id) => id.toString() === currentUserId)
        : false;
      p.isSaved = currentUserId
        ? userSavedPosts.includes(post._id.toString())
        : false;
      return p;
    });

    res.status(200).json({
      success: true,
      count: formattedPosts.length,
      total: totalPosts,
      page: parseInt(page),
      pages: Math.ceil(totalPosts / parseInt(limit)),
      posts: formattedPosts,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while fetching posts',
    });
  }
};

// @desc    Get single post by ID
// @route   GET /api/posts/:id
// @access  Public / Optional Auth
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username avatar')
      .populate('comments.user', 'name username avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const currentUserId = req.user ? req.user._id.toString() : null;
    const userSavedPosts = req.user ? req.user.savedPosts.map((id) => id.toString()) : [];

    const postObj = post.toObject();
    postObj.isLiked = currentUserId
      ? post.likes.some((id) => id.toString() === currentUserId)
      : false;
    postObj.isSaved = currentUserId
      ? userSavedPosts.includes(post._id.toString())
      : false;

    res.status(200).json({
      success: true,
      post: postObj,
    });
  } catch (error) {
    console.error('Get post by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Verify ownership
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post',
      });
    }

    await post.deleteOne();

    // Clean up notifications for this post
    await Notification.deleteMany({ post: post._id });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
      deletedPostId: post._id,
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while deleting post',
    });
  }
};

// @desc    Toggle like on post
// @route   PUT /api/posts/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const currentUserId = req.user._id;
    const isLiked = post.likes.some(
      (id) => id.toString() === currentUserId.toString()
    );

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter(
        (id) => id.toString() !== currentUserId.toString()
      );
      await post.save();

      // Remove like notification
      await Notification.findOneAndDelete({
        recipient: post.user,
        sender: currentUserId,
        type: 'like',
        post: post._id,
      });

      return res.status(200).json({
        success: true,
        isLiked: false,
        likeCount: post.likes.length,
        message: 'Post unliked',
      });
    } else {
      // Like
      post.likes.push(currentUserId);
      await post.save();

      // Create notification if liking someone else's post
      if (post.user.toString() !== currentUserId.toString()) {
        await Notification.create({
          recipient: post.user,
          sender: currentUserId,
          type: 'like',
          post: post._id,
          text: 'liked your post',
        });
      }

      return res.status(200).json({
        success: true,
        isLiked: true,
        likeCount: post.likes.length,
        message: 'Post liked',
      });
    }
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while liking post',
    });
  }
};

// @desc    Add comment to post
// @route   POST /api/posts/:id/comment
// @access  Private
exports.addComment = async (req, res) => {
  try {
    const { text, replyTo } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot be empty',
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const isPostOwner = post.user.toString() === req.user._id.toString();
    let targetComment = null;
    let replyToUsername = '';

    // If replyTo is provided, find target comment
    if (replyTo) {
      targetComment = post.comments.id(replyTo);
      if (targetComment) {
        const User = require('../models/User');
        const targetUser = await User.findById(targetComment.user);
        if (targetUser) {
          replyToUsername = targetUser.username;
        }
      }
    }

    // If not found via replyTo ID, check if text starts with @mention of someone who commented
    if (!targetComment) {
      const mentionMatch = text.trim().match(/^@([a-zA-Z0-9_.]+)/);
      if (mentionMatch) {
        const mentionedUsername = mentionMatch[1].toLowerCase();
        const User = require('../models/User');
        const mentionedUser = await User.findOne({ username: mentionedUsername });
        if (mentionedUser) {
          targetComment = post.comments.find(
            (c) => c.user.toString() === mentionedUser._id.toString()
          );
          if (targetComment) {
            replyToUsername = mentionedUser.username;
          }
        }
      }
    }

    // RULE: Account owner can ONLY reply to comments, not put top-level comment on own post.
    if (isPostOwner) {
      if (!targetComment && !replyTo) {
        return res.status(400).json({
          success: false,
          message: 'As the post owner, you can only reply to comments from other users.',
        });
      }
    }

    const newComment = {
      user: req.user._id,
      text: text.trim(),
      replyTo: targetComment ? targetComment._id : (replyTo || null),
      replyToUsername: replyToUsername || '',
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    // Populate the newly added comment's user
    const updatedPost = await Post.findById(post._id).populate(
      'comments.user',
      'name username avatar'
    );

    const addedComment = updatedPost.comments[updatedPost.comments.length - 1];

    // Notification handling
    if (!isPostOwner) {
      await Notification.create({
        recipient: post.user,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        text: `commented on your post: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
      });
    } else if (targetComment && targetComment.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        recipient: targetComment.user,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        text: `replied to your comment: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`,
      });
    }

    res.status(201).json({
      success: true,
      message: isPostOwner ? 'Reply posted' : 'Comment added',
      comment: addedComment,
      commentCount: updatedPost.comments.length,
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while adding comment',
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/posts/:id/comment/:commentId
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Must be author of comment or author of post
    const isCommentAuthor = comment.user.toString() === req.user._id.toString();
    const isPostAuthor = post.user.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment',
      });
    }

    post.comments.pull(req.params.commentId);
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted',
      commentCount: post.comments.length,
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Toggle save/bookmark post
// @route   PUT /api/posts/:id/save
// @access  Private
exports.toggleSavePost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const postId = req.params.id;

    const isSaved = user.savedPosts.some(
      (id) => id.toString() === postId.toString()
    );

    if (isSaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );
      await user.save();
      return res.status(200).json({
        success: true,
        isSaved: false,
        message: 'Post removed from saved',
      });
    } else {
      user.savedPosts.push(postId);
      await user.save();
      return res.status(200).json({
        success: true,
        isSaved: true,
        message: 'Post saved to collection',
      });
    }
  } catch (error) {
    console.error('Toggle save post error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get real trending tags computed from actual posts in database
// @route   GET /api/posts/trending-tags
// @access  Public
exports.getTrendingTags = async (req, res) => {
  try {
    const trending = await Post.aggregate([
      { $unwind: '$tags' },
      {
        $group: {
          _id: { $toLower: '$tags' },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.status(200).json({
      success: true,
      tags: trending.map((t) => ({
        tag: t._id.startsWith('#') ? t._id.slice(1) : t._id,
        count: t.count,
      })),
    });
  } catch (error) {
    console.error('Get trending tags error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

