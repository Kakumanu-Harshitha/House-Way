const express = require('express');
const router = express.Router();

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  createPasswordChangeTotp,
  verifyPasswordChangeTotp,
} = require('../controllers/authController');

const {
  mockLogin,
  mockGetProfile,
} = require('../controllers/mockAuthController');

const {
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validatePasswordChange,
} = require('../middleware/validation');

const { authenticate, isOwner } = require('../middleware/auth');
const { uploadSingle, getFileUrl } = require('../middleware/upload');

/**
 * ============================
 *  USER REGISTRATION & LOGIN
 * ============================
 */

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (handles role & subRole)
 * @access  Public for clients/guests, owner approval needed for employees
 */
router.post('/register', (req, res, next) => {
  // Default role if not provided
  if (!req.body.role) req.body.role = 'guest';

  // Employees must have a subRole
  if (req.body.role === 'employee' && !req.body.subRole) {
    return res.status(400).json({
      success: false,
      message: 'SubRole is required for employees',
    });
  }

  // Employees need admin approval
  if (req.body.role === 'employee') {
    req.body.approvedByAdmin = false;
  }

  next();
}, validateRegistration, register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user (email + password only)
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/login-mock
 * @desc    Mock login for testing without MongoDB
 * @access  Public
 */
router.post('/login-mock', validateLogin, mockLogin);

/**
 * ============================
 *  PROFILE & PASSWORD ROUTES
 * ============================
 */

/**
 * @route   GET /api/auth/profile
 * @desc    Get logged-in user's profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   GET /api/auth/profile-mock
 * @desc    Mock profile (for testing)
 * @access  Private
 */
router.get('/profile-mock', authenticate, mockGetProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, validateProfileUpdate, updateProfile);

router.put('/change-password', authenticate, changePassword);

router.get('/password-change/totp-qr', authenticate, createPasswordChangeTotp);

router.post('/password-change/verify-totp', authenticate, verifyPasswordChangeTotp);

/**
 * ============================
 *  OWNER / ADMIN REGISTRATION ROUTES
 * ============================
 */

/**
 * @route   POST /api/auth/register-employee
 * @desc    Owner registers a new employee directly (auto-approved)
 * @access  Private (Owner only)
 */
router.post('/register-employee', authenticate, isOwner, (req, res, next) => {
  req.body.role = 'employee';
  req.body.approvedByAdmin = true;
  next();
}, validateRegistration, register);

/**
 * @route   POST /api/auth/register-vendor
 * @desc    Owner registers vendor directly
 * @access  Private (Owner only)
 */
router.post('/register-vendor', authenticate, isOwner, (req, res, next) => {
  req.body.role = 'vendor';
  next();
}, validateRegistration, register);

/**
 * @route   POST /api/auth/register-client
 * @desc    Client public registration (legacy support)
 * @access  Public
 */
router.post('/register-client', (req, res, next) => {
  req.body.role = 'client';
  next();
}, validateRegistration, register);

/**
 * @route   POST /api/auth/register-guest
 * @desc    Guest registration (legacy support)
 * @access  Public
 */
router.post('/register-guest', (req, res, next) => {
  req.body.role = 'guest';
  next();
}, validateRegistration, register);

/**
 * ============================
 *  PROFILE IMAGE HANDLING
 * ============================
 */

/**
 * @route   POST /api/auth/upload-profile-photo
 * @desc    Upload profile photo
 * @access  Private
 */
router.post('/upload-profile-photo', authenticate, uploadSingle('profilePhoto'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ success: false, message: 'Only image files are allowed' });
    }

    const User = require('../models/User');
    const profileImageUrl = getFileUrl(req, `images/${req.file.filename}`);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: profileImageUrl },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profileImage: profileImageUrl,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    console.error('Profile photo upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/auth/remove-profile-photo
 * @desc    Remove profile photo
 * @access  Private
 */
router.delete('/remove-profile-photo', authenticate, async (req, res) => {
  try {
    const User = require('../models/User');

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $unset: { profileImage: 1 } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile photo removed successfully',
      data: { user: user.toSafeObject() },
    });
  } catch (error) {
    console.error('Profile photo removal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove profile photo',
      error: error.message,
    });
  }
});

/**
 * ============================
 *  PASSWORD RESET VIA EMAIL OTP
 * ============================
 */

const bcrypt = require('bcryptjs');
const { sendPasswordOTP, generateOTP } = require('../utils/emailService');

/**
 * @route   POST /api/auth/request-password-otp
 * @desc    Send OTP to user email for password reset
 * @access  Public (email required)
 */
router.post('/request-password-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const User = require('../models/User');

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ success: true, message: 'If this email exists, an OTP has been sent.' });
    }

    // Rate limiting: max 3 attempts per 15 minutes
    const now = new Date();
    if (user.passwordResetExpiry && user.passwordResetExpiry > now && user.passwordResetAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again in 15 minutes.'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Save hashed OTP with 10 minute expiry
    user.passwordResetOTP = otpHash;
    user.passwordResetExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
    await user.save();

    // Send email
    try {
      await sendPasswordOTP(email, otp, user.firstName);
    } catch (emailError) {
      console.error('[Auth] Email send error:', emailError);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    console.log('✅ [Auth] OTP sent to:', email);
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    console.error('Request OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to process request', error: error.message });
  }
});

/**
 * @route   POST /api/auth/verify-password-otp
 * @desc    Verify OTP for password reset
 * @access  Public
 */
router.post('/verify-password-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const User = require('../models/User');

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordResetOTP) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Check expiry
    if (!user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
      user.passwordResetOTP = null;
      user.passwordResetExpiry = null;
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, user.passwordResetOTP);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP verified - generate temp token for password reset
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(resetToken, 10);
    user.passwordResetOTP = tokenHash; // Reuse field for temp token
    user.passwordResetExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes to set new password
    await user.save();

    console.log('✅ [Auth] OTP verified for:', email);
    res.json({ success: true, message: 'OTP verified', resetToken });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed', error: error.message });
  }
});

/**
 * @route   POST /api/auth/reset-password-with-otp
 * @desc    Set new password after OTP verification
 * @access  Public (requires resetToken from verify step)
 */
router.post('/reset-password-with-otp', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    const User = require('../models/User');

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordResetOTP) {
      return res.status(400).json({ success: false, message: 'Invalid reset request' });
    }

    // Check expiry
    if (!user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
      user.passwordResetOTP = null;
      user.passwordResetExpiry = null;
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(400).json({ success: false, message: 'Reset session expired. Please start over.' });
    }

    // Verify token
    const isValid = await bcrypt.compare(resetToken, user.passwordResetOTP);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetOTP = null;
    user.passwordResetExpiry = null;
    user.passwordResetAttempts = 0;
    await user.save();

    console.log('✅ [Auth] Password reset successful for:', email);
    res.json({ success: true, message: 'Password changed successfully. Please login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
  }
});

module.exports = router;
