const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Helper to optionally extract user ID
const getOptionalUserId = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || 'supersecret_minisocial_jwt_secret_key_2026_!#';
      const decoded = jwt.verify(token, secret);
      return decoded.id;
    } catch {
      return null;
    }
  }
  return null;
};

// @route   POST /api/posts
// @desc    Create a new post
// @access  Protected
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { content, image } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Post content cannot be empty.',
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Post content exceeds 1000 characters limit.',
      });
    }

    const post = new Post({
      user: req.user.id,
      content: content.trim(),
      image: image && image.trim() ? image.trim() : '',
    });

    await post.save();
    await post.populate('user', 'username profilePicture');

    return res.status(201).json({
      success: true,
      message: 'Post created successfully.',
      post: {
        ...post.toObject(),
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        isOwnPost: true,
      },
    });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating post.',
    });
  }
});

// @route   GET /api/posts
// @desc    Get all posts (feed), sorted newest first
// @access  Public (auth-aware)
router.get('/', async (req, res) => {
  try {
    const currentUserId = getOptionalUserId(req);

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'username profilePicture' },
      });

    const formattedPosts = posts.map((post) => {
      const isLiked = currentUserId
        ? post.likes.some((likeId) => likeId.toString() === currentUserId)
        : false;
      const isOwnPost = currentUserId
        ? post.user && post.user._id.toString() === currentUserId
        : false;

      return {
        _id: post._id,
        user: post.user,
        content: post.content,
        image: post.image,
        likes: post.likes,
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
        comments: post.comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        isLiked,
        isOwnPost,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedPosts.length,
      posts: formattedPosts,
    });
  } catch (error) {
    console.error('Get feed error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching posts.',
    });
  }
});

// @route   GET /api/posts/:id
// @desc    Get single post with populated comments
// @access  Public (auth-aware)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format.',
      });
    }

    const post = await Post.findById(id)
      .populate('user', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'username profilePicture' },
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const currentUserId = getOptionalUserId(req);
    const isLiked = currentUserId
      ? post.likes.some((likeId) => likeId.toString() === currentUserId)
      : false;
    const isOwnPost = currentUserId
      ? post.user && post.user._id.toString() === currentUserId
      : false;

    return res.status(200).json({
      success: true,
      post: {
        _id: post._id,
        user: post.user,
        content: post.content,
        image: post.image,
        likes: post.likes,
        likesCount: post.likes.length,
        commentsCount: post.comments.length,
        comments: post.comments,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        isLiked,
        isOwnPost,
      },
    });
  } catch (error) {
    console.error('Get single post error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching post.',
    });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete own post only
// @access  Protected
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format.',
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    // Ensure only author can delete
    if (post.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete your own posts.',
      });
    }

    // Cascade delete comments belonging to this post
    await Comment.deleteMany({ post: id });
    await Post.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Post and associated comments deleted successfully.',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting post.',
    });
  }
});

// @route   POST /api/posts/:id/like
// @desc    Toggle like on a post
// @access  Protected
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format.',
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const hasLiked = post.likes.some((likeId) => likeId.toString() === userId);

    if (hasLiked) {
      // Unlike
      post.likes = post.likes.filter((likeId) => likeId.toString() !== userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();

    return res.status(200).json({
      success: true,
      message: hasLiked ? 'Post unliked.' : 'Post liked.',
      isLiked: !hasLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    console.error('Like toggle error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error toggling like.',
    });
  }
});

module.exports = router;
