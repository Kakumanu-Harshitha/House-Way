const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/User');
const { authenticate, isOwner, authorize } = require('../middleware/auth');
const { uploadToGCS, deleteFromGCS } = require('../utils/gcs');

// Multer memory storage for profile photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'), false);
    }
  }
});

/**
 * @route   GET /api/users
 * @desc    Get all users (Owner or Employee)
 * @access  Private (Owner or Employee)
 */
router.get('/', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { role, subRole, page = 1, limit = 10, search } = req.query;

    const query = { isActive: true };

    // ✅ Filter by role if specified
    if (role) query.role = role;

    // ✅ Filter by subRole if specified (e.g., designerTeam)
    if (subRole) query.subRole = subRole;

    // 🔍 Search by name or email
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message,
    });
  }
});


/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role and optional subRole
 * @access  Private (Owner or Employee)
 */
router.get('/role/:role', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { role } = req.params;
    const { subRole } = req.query;

    const validRoles = ['owner', 'employee', 'vendor', 'client', 'guest'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified',
      });
    }

    const query = { role, isActive: true };
    if (subRole) query.subRole = subRole;

    const users = await User.find(query).select('-password');

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users by role',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Owner or Self)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'owner' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own profile.',
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/users/:id/status
 * @desc    Activate or deactivate user
 * @access  Private (Owner only)
 */
router.put('/:id/status', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    if (req.user._id.toString() === id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Soft delete user (mark inactive)
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message,
    });
  }
});



/**
 * @route   POST /api/users/register-client
 * @desc    Register a new client user (Employee creates client account)
 * @access  Private (Owner or Employee)
 */
router.post('/register-client', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const {
      clientId,  // Custom client ID (optional)
      firstName,
      lastName,
      email,
      phone,
      username,
      password,
      address,
      clientDetails,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required',
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // If custom clientId provided, check if it's unique
    if (clientId) {
      const existingClientId = await User.findOne({ clientId });
      if (existingClientId) {
        return res.status(400).json({
          success: false,
          message: 'Client ID already exists. Please use a different ID.',
        });
      }
    }

    // Create new client user
    const newClient = new User({
      clientId: clientId || undefined, // Custom ID or auto-generate via pre-save hook
      firstName,
      lastName,
      email,
      phone,
      username: username || email,
      password, // Will be hashed by User model pre-save hook
      role: 'client',
      address,
      clientDetails,
      createdBy: req.user._id,
    });

    await newClient.save();

    // Return without password
    const clientData = newClient.toObject();
    delete clientData.password;

    res.status(201).json({
      success: true,
      message: 'Client registered successfully',
      data: { client: clientData },
    });
  } catch (error) {
    console.error('Register client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register client',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { firstName, lastName, phone, email, address, profileImage } = req.body;

    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone) updates.phone = phone;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
      updates.email = email.toLowerCase();
    }
    if (address) updates.address = address;
    if (profileImage) updates.profileImage = profileImage;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'This endpoint is deprecated. Use /api/auth/change-password with OTP verification.',
  });
});

/**
 * @route   POST /api/users/profile-photo
 * @desc    Upload profile photo to GCS
 * @access  Private
 */
router.post('/profile-photo', authenticate, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file provided',
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete old profile photo from GCS if exists
    if (user.profileImage) {
      try {
        // Extract GCS path from URL
        const oldUrl = user.profileImage;
        const bucketName = process.env.GCS_BUCKET;
        const gcsPath = oldUrl.split(`${bucketName}/`)[1];
        if (gcsPath) {
          await deleteFromGCS(gcsPath);
          console.log('🗑️ Deleted old profile photo:', gcsPath);
        }
      } catch (deleteError) {
        console.log('⚠️ Could not delete old photo:', deleteError.message);
      }
    }

    // Upload new photo to GCS
    const result = await uploadToGCS({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: 'profile-photos',
    });

    // Update user's profileImage
    user.profileImage = result.url;
    await user.save();

    console.log('✅ Profile photo uploaded for user:', user._id);

    res.json({
      success: true,
      message: 'Profile photo uploaded successfully',
      data: {
        profileImage: result.url,
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
 * @route   DELETE /api/users/profile-photo
 * @desc    Delete profile photo from GCS
 * @access  Private
 */
router.delete('/profile-photo', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.profileImage) {
      return res.status(400).json({
        success: false,
        message: 'No profile photo to delete',
      });
    }

    // Delete from GCS
    try {
      const oldUrl = user.profileImage;
      const bucketName = process.env.GCS_BUCKET;
      const gcsPath = oldUrl.split(`${bucketName}/`)[1];
      if (gcsPath) {
        await deleteFromGCS(gcsPath);
        console.log('🗑️ Deleted profile photo from GCS:', gcsPath);
      }
    } catch (deleteError) {
      console.log('⚠️ GCS delete error:', deleteError.message);
    }

    // Clear profileImage field
    user.profileImage = null;
    await user.save();

    res.json({
      success: true,
      message: 'Profile photo deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile photo',
      error: error.message,
    });
  }
});

module.exports = router;
