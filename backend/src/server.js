require('dotenv').config({ path: __dirname + '/../.env' });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { generateToken } = require('./utils/jwt');


const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500, // Increased limit to 500 requests per windowMs for development
  message: 'Too many requests from this IP, please try again later.',
  // Skip rate limiting in development mode
  skip: (req, res) => process.env.NODE_ENV === 'development'
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:19006', // Expo mobile app
  'http://localhost:8081',  // Expo web app (original port)
  'http://localhost:8082',  // Expo web app (port 2)
  'http://localhost:8083',  // Expo web app (current port)
  'http://localhost:3000',  // React development server (if used)
  'exp://localhost:19000',  // Expo development
  'exp://192.168.0.100:19000', // Expo on network
  'exp://192.168.0.100:8082', // Expo on network (port 2)
  'exp://192.168.0.100:8083', // Expo on network (current port)
  'http://192.168.0.100:8081', // Expo on network (original port)
  'http://192.168.1.100:8081', // Expo on network (alternative IP)
  'http://192.168.1.5:19000', // Your mobile device Expo on network
  'http://192.168.1.5:8081', // Your mobile device Expo on network (web)
  'http://192.168.1.5:8082', // Your mobile device Expo on network (web port 2)
  'http://192.168.1.5:8083', // Your mobile device Expo on network (web current port)
  process.env.FRONTEND_URL, // Environment variable URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // For development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      console.log('CORS: Allowing all origins in development mode');
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('CORS: Origin allowed:', origin);
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Explicitly handle OPTIONS requests for all routes
app.options('*', (req, res) => {
  console.log('OPTIONS request received for:', req.originalUrl);
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files for uploads - with explicit CORS headers
app.use('/uploads', (req, res, next) => {
  // Explicitly set CORS headers for static files
  const origin = req.get('Origin');
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Helmet sets Cross-Origin-Resource-Policy: same-origin by default, which
  // makes browsers block images/scripts loaded from a different origin (e.g. different port).
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}, express.static('uploads'));

app.use('/api/auth', require('./routes/auth'));
// Socket.io real-time setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Make io accessible in routes/controllers
app.set('io', io);

// Core houseway dashboard events
const DASHBOARD_EVENTS = {
  PROJECT_UPDATED: 'projectUpdated',
  MATERIAL_REQUEST: 'materialRequest',
  QUOTATION_UPDATED: 'quotationUpdated',
  PAYMENT_UPLOADED: 'paymentUploaded',
  MESSAGE_THREAD: 'messageThread',
  GENERAL_UPDATE: 'generalUpdate',
};
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Negotiation chat rooms are scoped per purchase order: order_<orderId>
  socket.on('joinOrder', ({ orderId }) => {
    if (!orderId) return;
    const room = `order_${orderId}`;
    socket.join(room);
    console.log(`🧩 Socket ${socket.id} joined ${room}`);
  });

  socket.on('leaveOrder', ({ orderId }) => {
    if (!orderId) return;
    const room = `order_${orderId}`;
    socket.leave(room);
    console.log(`🧩 Socket ${socket.id} left ${room}`);
  });

  socket.on('typing', ({ orderId, userId, isTyping }) => {
    if (!orderId) return;
    const room = `order_${orderId}`;
    socket.to(room).emit('userTyping', { userId, isTyping: !!isTyping });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Database connection - continue even if MongoDB fails
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/houseway_db', {
  serverSelectionTimeoutMS: 5000,   // Timeout after 5s instead of hanging
  socketTimeoutMS: 45000,            // Close sockets after 45s of inactivity
  connectTimeoutMS: 10000,           // Give up initial connection after 10s
})
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Continuing without database - using mock authentication');
  });

// Routes - Use normal authentication with database
console.log('✅ Using database authentication');
app.use('/api/auth', require('./routes/auth'));
console.log('✅ Auth routes loaded');

// Other routes - load with fallbacks
const routes = [
  { path: '/api/users', file: './routes/users', name: 'Users' },
  { path: '/api/clients', file: './routes/clients', name: 'Clients' },
  { path: '/api/projects', file: './routes/projects', name: 'Projects' },
  { path: '/api/tasks', file: './routes/tasks', name: 'Tasks' },
  { path: '/api/invoices', file: './routes/invoices', name: 'Invoices' },
  { path: '/api/material-requests', file: './routes/materialRequests', name: 'Material Requests' },
  { path: '/api/quotations', file: './routes/quotations', name: 'Quotations' },
  { path: '/api/purchase-orders', file: './routes/purchaseOrders', name: 'Purchase Orders' },
  { path: '/api/vendor-invoices', file: './routes/vendorInvoices', name: 'Vendor Invoices' },
  { path: '/api/service-requests', file: './routes/serviceRequests', name: 'Service Requests' },
  { path: '/api/files', file: './routes/files', name: 'Files' },
  { path: '/api/dashboard', file: './routes/dashboard', name: 'Dashboard' },
  { path: '/api/work-status', file: './routes/workStatus', name: 'Work Status' },
  { path: '/api/attendance', file: './routes/attendance', name: 'Attendance' },
  { path: '/api/notifications', file: './routes/notifications', name: 'Notifications' },
];

routes.forEach(route => {
  try {
    app.use(route.path, require(route.file));
    console.log(`✅ ${route.name} routes loaded`);
  } catch (error) {
    console.log(`❌ ${route.name} routes failed:`, error.message);
    // Create a placeholder route that returns a message
    app.use(route.path, (req, res) => {
      res.status(503).json({
        success: false,
        message: `${route.name} service unavailable - database connection required`,
      });
    });
  }
});


// Simple test login endpoint (temporary)
app.post('/api/login', (req, res) => {
  console.log('[Direct Auth] Login request received:', req.body);

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

  console.log(`[Direct Auth] Login successful: ${email} (${user.role})`);

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found',
//   });
// });
app.get('/test-jwt', (req, res) => {
  console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded ✓' : 'Missing ✗');
  res.json({ secretExists: !!process.env.JWT_SECRET });
});
// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(error.errors).map(err => err.message),
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value',
    });
  }

  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🟢 Socket.io enabled on same port.`);
  console.log(process.env.MONGODB_URI ? '✅ MongoDB connected' : '⚠️  MongoDB not connected - using mock authentication');
  console.log(`✅ Server running on port ${process.env.PORT}`);
  console.log("✅ JWT_SECRET loaded:", process.env.JWT_SECRET ? "Yes" : "No");
});
