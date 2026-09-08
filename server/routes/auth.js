const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const createToken = (userId, username) => {
  const secret = process.env.JWT_SECRET || 'supersecret_minisocial_jwt_secret_key_2026_!#';
  return jwt.sign({ id: userId, username }, secret, { expiresIn: '7d' });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, bio, profilePicture } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.',
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long.',
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check existing username or email
    const existingUser = await User.findOne({
      $or: [{ email: trimmedEmail }, { username: trimmedUsername }],
    });

    if (existingUser) {
      if (existingUser.email.toLowerCase() === trimmedEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose another.',
      });
    }

    // Create user
    const newUser = new User({
      username: trimmedUsername,
      email: trimmedEmail,
      password,
      bio: bio ? bio.trim() : '',
      profilePicture: profilePicture && profilePicture.trim() ? profilePicture.trim() : undefined,
    });

    await newUser.save();

    const token = createToken(newUser._id, newUser.username);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        bio: newUser.bio,
        profilePicture: newUser.profilePicture,
        followersCount: newUser.followers.length,
        followingCount: newUser.following.length,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during signup.',
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find user (we need password field for comparison)
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = createToken(user._id, user.username);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully!',
      token,
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
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Server error during login.',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged in user info
// @access  Protected
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

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
        followers: user.followers,
        following: user.following,
      },
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user details.',
    });
  }
});

module.exports = router;
