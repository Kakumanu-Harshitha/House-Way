const { validationResult } = require('express-validator');
const { generateToken } = require('../utils/jwt');

// Mock user data for testing
const mockUsers = [
  {
    _id: 'owner_123',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@houseway.com',
    password: 'Admin123',
    role: 'owner',
    isActive: true,
    phone: '+1234567890',
    address: { street: '123 Main St', city: 'New York', state: 'NY', zip: '10001' }
  },
  {
    _id: 'employee_123',
    firstName: 'John',
    lastName: 'Employee',
    email: 'employee@houseway.com',
    password: 'Employee123',
    role: 'employee',
    isActive: true,
    phone: '+1234567891',
    address: { street: '456 Oak Ave', city: 'New York', state: 'NY', zip: '10002' }
  },
  {
    _id: 'vendor_123',
    firstName: 'Mike',
    lastName: 'Vendor',
    email: 'vendor@houseway.com',
    password: 'Vendor123',
    role: 'vendor',
    isActive: true,
    phone: '+1234567892',
    address: { street: '789 Pine Rd', city: 'New York', state: 'NY', zip: '10003' }
  },
  {
    _id: 'client_123',
    firstName: 'Sarah',
    lastName: 'Client',
    email: 'client@houseway.com',
    password: 'Client123',
    role: 'client',
    isActive: true,
    phone: '+1234567893',
    address: { street: '321 Elm St', city: 'New York', state: 'NY', zip: '10004' }
  }
];

/**
 * Mock login user - for testing without MongoDB
 */
const mockLogin = async (req, res) => {
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

    const { email, password } = req.body;

    console.log(`[Mock Auth] Login attempt: ${email}`);

    // Find user by email in mock data
    const user = mockUsers.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check password (simple string comparison for mock)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    console.log(`[Mock Auth] Login successful: ${email} (${user.role})`);

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    // Create safe user object (remove password)
    const safeUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      address: user.address,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: safeUser,
        token,
      },
    });
  } catch (error) {
    console.error('Mock login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
    });
  }
};

/**
 * Mock get current user profile
 */
const mockGetProfile = async (req, res) => {
  try {
    // Get user from mock data based on JWT token
    const user = mockUsers.find(u => u._id === req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Create safe user object
    const safeUser = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      phone: user.phone,
      address: user.address,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    console.error('Mock get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
    });
  }
};

module.exports = {
  mockLogin,
  mockGetProfile,
};