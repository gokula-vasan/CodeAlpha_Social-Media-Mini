const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  toggleLike,
  addComment,
  deleteComment,
  toggleSavePost,
  getTrendingTags,
} = require('../controllers/post.controller');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/trending-tags', getTrendingTags);

router.route('/')
  .get(optionalAuth, getPosts)
  .post(protect, upload.single('media'), createPost);

router.route('/:id')
  .get(optionalAuth, getPostById)
  .delete(protect, deletePost);

router.put('/:id/like', protect, toggleLike);
router.post('/:id/comment', protect, addComment);
router.delete('/:id/comment/:commentId', protect, deleteComment);
router.put('/:id/save', protect, toggleSavePost);

module.exports = router;
