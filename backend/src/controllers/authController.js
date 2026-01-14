const { validationResult } = require('express-validator');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      role,
      subRole,        // ✅ added subRole support
      phone,
      address,
      employeeDetails,
      vendorDetails,
      clientDetails,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Restrict who can create owner/employee/vendor manually
    if (['owner', 'employee', 'vendor'].includes(role)) {
      if (!req.user || req.user.role !== 'owner') {
        // Self-registration by employee is allowed (frontend)
        if (role === 'employee') {
          // continue
        } else {
          return res.status(403).json({
            success: false,
            message: 'Only owners can create owner or vendor accounts',
          });
        }
      }
    }

    // Create new user object
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role,
      subRole: subRole || null,  // ✅ save subRole to DB
      phone,
      address,
      createdBy: req.user ? req.user._id : null,
    };

    // Handle employee-specific approval
    if (role === 'employee') {
      userData.approvedByAdmin = false;
    }

    // Add role-specific details
    if (role === 'employee' && employeeDetails) {
      userData.employeeDetails = employeeDetails;
    } else if (role === 'vendor' && vendorDetails) {
      userData.vendorDetails = vendorDetails;
    } else if (role === 'client' && clientDetails) {
      userData.clientDetails = clientDetails;
    }

    const user = new User(userData);
    await user.save();

    // ✅ Log what was saved
    console.log('✅ Registered new user:', {
      email: user.email,
      role: user.role,
      subRole: user.subRole,
    });

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      subRole: user.subRole,  // ✅ include subRole in token
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;
    console.log('[Auth] Login attempt for:', email);
    
    // Set a timeout for the database query to prevent hanging
    const user = await Promise.race([
      User.findByEmail(email),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 8000)
      )
    ]);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      subRole: user.subRole,  // ✅ include subRole in JWT
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        token,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message,
      error: error.message,
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user.toSafeObject(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const allowedUpdates = [
      'firstName',
      'lastName',
      'phone',
      'address',
      'employeeDetails',
      'vendorDetails',
      'clientDetails',
      'subRole', // ✅ allow updating subRole if needed
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) updates[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long',
      });
    }

    const user = await User.findById(req.user._id);

    if (
      !user.passwordChangeTotpSecret ||
      !user.passwordChangeTotpVerified ||
      !user.passwordChangeTotpVerifiedAt
    ) {
      return res.status(400).json({
        success: false,
        message: 'OTP verification is required before changing password',
      });
    }

    const maxMinutesSinceVerification = 10;
    const ageMs = Date.now() - user.passwordChangeTotpVerifiedAt.getTime();
    const ageMinutes = ageMs / (60 * 1000);

    if (ageMinutes > maxMinutesSinceVerification) {
      // Expired verification session, but we keep the secret if it's still within its own 15m window (handled by create/verify)
      // Actually, if verification expired, we force re-verification.
      user.passwordChangeTotpVerified = false;
      user.passwordChangeTotpVerifiedAt = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP verification expired. Please scan the QR and verify again.',
      });
    }

    user.password = newPassword;
    // user.passwordChangeTotpSecret = null; // KEEP SECRET for reuse within window
    user.passwordChangeTotpVerified = false; // Reset verified status
    // user.passwordChangeTotpRequestedAt = null; // KEEP REQUEST TIME for age check
    user.passwordChangeTotpVerifiedAt = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

const createPasswordChangeTotp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const label = `${user.email}`;
    const issuer = 'Houseway Password Change';
    let secretBase32 = user.passwordChangeTotpSecret;
    let otpauthUrl;

    // Check if we can reuse the existing secret (valid for 15 mins)
    const maxMinutesReuse = 15;
    let shouldGenerateNew = true;

    if (secretBase32 && user.passwordChangeTotpRequestedAt) {
      const ageMs = Date.now() - user.passwordChangeTotpRequestedAt.getTime();
      const ageMinutes = ageMs / (60 * 1000);
      
      if (ageMinutes < maxMinutesReuse) {
        shouldGenerateNew = false;
        console.log(`[Auth] Reusing existing TOTP secret for user ${user.email} (age: ${ageMinutes.toFixed(2)}m)`);
      }
    }

    if (shouldGenerateNew) {
      const secret = speakeasy.generateSecret({
        name: `${issuer} (${label})`,
      });
      secretBase32 = secret.base32;
      otpauthUrl = secret.otpauth_url;
      
      user.passwordChangeTotpSecret = secretBase32;
      user.passwordChangeTotpVerified = false;
      user.passwordChangeTotpRequestedAt = new Date();
      user.passwordChangeTotpVerifiedAt = null;
      await user.save();
      
      console.log(`[Auth] Generated NEW TOTP secret for user ${user.email}`);
    } else {
        // Reconstruct otpauthUrl for existing secret
        otpauthUrl = speakeasy.otpauthURL({
            secret: secretBase32,
            label: label,
            issuer: issuer,
            encoding: 'base32'
        });
    }

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    res.json({
      success: true,
      message: 'OTP QR generated successfully',
      data: {
        qrCodeDataUrl,
        otpauthUrl,
      },
    });
  } catch (error) {
    console.error('Create TOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate OTP QR code',
      error: error.message,
    });
  }
};

const verifyPasswordChangeTotp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required',
      });
    }

    // Sanitize OTP (remove spaces, ensure string)
    const otpClean = String(otp).trim();

    const user = await User.findById(req.user._id);

    // DEBUG LOGGING
    console.log(`[Auth] Verifying OTP for ${user.email}`);
    console.log(`[Auth] Secret exists: ${!!user.passwordChangeTotpSecret}`);
    console.log(`[Auth] OTP Received: '${otpClean}' (Length: ${otpClean.length})`);
    // END DEBUG LOGGING

    if (!user || !user.passwordChangeTotpSecret) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP session. Please generate a new QR code.',
      });
    }

    if (!user.passwordChangeTotpRequestedAt) {
      return res.status(400).json({
        success: false,
        message: 'OTP session is invalid. Please generate a new QR code.',
      });
    }

    const maxMinutesSinceRequest = 15;
    const ageMs = Date.now() - user.passwordChangeTotpRequestedAt.getTime();
    const ageMinutes = ageMs / (60 * 1000);

    if (ageMinutes > maxMinutesSinceRequest) {
      user.passwordChangeTotpSecret = null;
      user.passwordChangeTotpVerified = false;
      user.passwordChangeTotpRequestedAt = null;
      user.passwordChangeTotpVerifiedAt = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: 'OTP session expired. Please generate a new QR code.',
      });
    }

    // Use verifyDelta to check window and get delta
    const delta = speakeasy.totp.verifyDelta({
      secret: user.passwordChangeTotpSecret,
      encoding: 'base32',
      token: otp,
      window: 6, // Increased window to allow +/- 3 minutes (total 6 mins window around current time) to handle drift and repeated attempts
      step: 30, // Explicitly set step
    });
    
    console.log(`[Auth] OTP Verification Delta: ${JSON.stringify(delta)}`);
    const verified = delta !== undefined;

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    user.passwordChangeTotpVerified = true;
    user.passwordChangeTotpVerifiedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify TOTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  createPasswordChangeTotp,
  verifyPasswordChangeTotp,
};
