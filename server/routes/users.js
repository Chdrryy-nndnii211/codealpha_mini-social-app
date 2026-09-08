const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Helper to optionally extract user ID from token without failing if unauthenticated
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

// @route   GET /api/users/:id
// @desc    Get user profile with posts and follower/following counts
// @access  Public (with optional auth awareness)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Fetch user posts
    const posts = await Post.find({ user: id })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'user', select: 'username profilePicture' },
      });

    const currentUserId = getOptionalUserId(req);
    const isFollowing = currentUserId
      ? user.followers.some((followerId) => followerId.toString() === currentUserId)
      : false;
    const isOwnProfile = currentUserId ? currentUserId === id : false;

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: posts.length,
        isFollowing,
        isOwnProfile,
      },
      posts,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile.',
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update bio, profilePicture (only own profile)
// @access  Protected
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { bio, profilePicture } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    // Check authorization: only update own profile
    if (req.user.id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only update your own profile.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (typeof bio === 'string') {
      if (bio.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 200 characters.',
        });
      }
      user.bio = bio.trim();
    }

    if (typeof profilePicture === 'string' && profilePicture.trim()) {
      user.profilePicture = profilePicture.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePicture: user.profilePicture,
        followersCount: user.followers.length,
        followingCount: user.following.length,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating profile.',
    });
  }
});

// @route   POST /api/users/:id/follow
// @desc    Follow/Unfollow user toggle
// @access  Protected
router.post('/:id/follow', authMiddleware, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user.id.toString();

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    if (currentUserId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself.',
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const isAlreadyFollowing = targetUser.followers.some(
      (followerId) => followerId.toString() === currentUserId
    );

    if (isAlreadyFollowing) {
      // Unfollow
      targetUser.followers = targetUser.followers.filter(
        (followerId) => followerId.toString() !== currentUserId
      );
      currentUser.following = currentUser.following.filter(
        (followingId) => followingId.toString() !== targetUserId
      );
      await targetUser.save();
      await currentUser.save();

      return res.status(200).json({
        success: true,
        message: `Unfollowed ${targetUser.username}.`,
        isFollowing: false,
        followersCount: targetUser.followers.length,
      });
    } else {
      // Follow
      targetUser.followers.push(currentUserId);
      currentUser.following.push(targetUserId);
      await targetUser.save();
      await currentUser.save();

      return res.status(200).json({
        success: true,
        message: `Now following ${targetUser.username}!`,
        isFollowing: true,
        followersCount: targetUser.followers.length,
      });
    }
  } catch (error) {
    console.error('Follow/unfollow error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during follow/unfollow toggle.',
    });
  }
});

// @route   GET /api/users/:id/followers
// @desc    Get list of followers for a user
// @access  Public
router.get('/:id/followers', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    const user = await User.findById(id).populate('followers', 'username bio profilePicture');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      followers: user.followers,
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching followers.',
    });
  }
});

// @route   GET /api/users/:id/following
// @desc    Get list of users being followed by a user
// @access  Public
router.get('/:id/following', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    const user = await User.findById(id).populate('following', 'username bio profilePicture');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      following: user.following,
    });
  } catch (error) {
    console.error('Get following error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching following list.',
    });
  }
});

module.exports = router;
