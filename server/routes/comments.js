const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');

// @route   POST /api/posts/:id/comments
// @desc    Add comment to a post
// @access  Protected
router.post('/posts/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid post ID format.',
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text cannot be empty.',
      });
    }

    if (text.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot exceed 500 characters.',
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found.',
      });
    }

    const comment = new Comment({
      post: id,
      user: req.user.id,
      text: text.trim(),
    });

    await comment.save();

    // Link comment to post
    post.comments.push(comment._id);
    await post.save();

    await comment.populate('user', 'username profilePicture');

    return res.status(201).json({
      success: true,
      message: 'Comment added successfully.',
      comment: {
        _id: comment._id,
        post: comment.post,
        text: comment.text,
        user: comment.user,
        createdAt: comment.createdAt,
        isOwnComment: true,
      },
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error adding comment.',
    });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete own comment only
// @access  Protected
router.delete('/comments/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid comment ID format.',
      });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.',
      });
    }

    if (comment.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete your own comments.',
      });
    }

    // Remove comment reference from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id },
    });

    await Comment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting comment.',
    });
  }
});

module.exports = router;
