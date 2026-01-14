const express = require('express');
const router = express.Router();

// Simple mock login without validation
router.post('/login', (req, res) => {
  console.log('[Simple Auth] Login request received:', req.body);

  const { email, password } = req.body;

  // Mock users
  const users = {
    'admin@houseway.com': { password: 'Admin123', role: 'owner', name: 'Admin User' },
    'employee@houseway.com': { password: 'Employee123', role: 'employee', name: 'John Employee' },
    'vendor@houseway.com': { password: 'Vendor123', role: 'vendor', name: 'Mike Vendor' },
    'client@houseway.com': { password: 'Client123', role: 'client', name: 'Sarah Client' }
  };

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  const user = users[email];

  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  console.log(`[Simple Auth] Login successful: ${email} (${user.role})`);

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        _id: `${user.role}_123`,
        firstName: user.name.split(' ')[0],
        lastName: user.name.split(' ')[1] || '',
        email: email,
        role: user.role,
        isActive: true
      },
      token: 'mock_jwt_token_' + Date.now()
    }
  });
});

module.exports = router;