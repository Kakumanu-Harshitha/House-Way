const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  role: {
    type: String,
    required: true,
    enum: ['owner', 'employee', 'vendor', 'client', 'guest'],
  },
  subRole: {
    type: String,
    enum: ['designTeam', 'vendorTeam', 'executionTeam', 'none'],
    default: 'none',
  },
  // Auto-generated client ID (for client role users)
  clientId: {
    type: String,
    unique: true,
    sparse: true,  // Allow null values for non-client users
  },
  approvedByAdmin: {
    type: Boolean,
    default: false,
  },

  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  profileImage: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Role-specific fields
  employeeDetails: {
    employeeId: String,
    department: String,
    position: String,
    hireDate: Date,
    skills: [String],
  },
  vendorDetails: {
    companyName: String,
    businessLicense: String,
    specialization: [String],
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalProjects: {
      type: Number,
      default: 0,
    },
  },
  clientDetails: {
    projectBudget: Number,
    preferredStyle: String,
    propertyType: String,
    timeline: String,
    // Premium client management fields
    clientStatus: {
      type: String,
      enum: ['active', 'at-risk', 'pending', 'inactive'],
      default: 'active'
    },
    totalProjectsCompleted: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    preferredContact: {
      type: String,
      enum: ['email', 'phone', 'both'],
      default: 'both'
    },
    lastProjectDate: Date,
    tags: [String],
    priorityLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'vip'],
      default: 'medium'
    }
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Password reset OTP fields
  passwordResetOTP: {
    type: String,
    default: null,
  },
  passwordResetExpiry: {
    type: Date,
    default: null,
  },
  passwordResetAttempts: {
    type: Number,
    default: 0,
  },
  passwordChangeTotpSecret: {
    type: String,
    default: null,
  },
  passwordChangeTotpVerified: {
    type: Boolean,
    default: false,
  },
  passwordChangeTotpRequestedAt: {
    type: Date,
    default: null,
  },
  passwordChangeTotpVerifiedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for better query performance (email index is already created by unique: true)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  try {
    // Generate clientId for new client users
    if (this.isNew && this.role === 'client' && !this.clientId) {
      const lastClient = await this.constructor.findOne({ clientId: { $exists: true, $ne: null } })
        .sort({ clientId: -1 })
        .select('clientId');

      let nextNumber = 1;
      if (lastClient && lastClient.clientId) {
        const match = lastClient.clientId.match(/CLT-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      this.clientId = `CLT-${String(nextNumber).padStart(5, '0')}`;
    }

    // Only hash the password if it has been modified (or is new)
    if (this.isModified('password')) {
      // Hash password with cost of 12
      const hashedPassword = await bcrypt.hash(this.password, 12);
      this.password = hashedPassword;
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get user data without sensitive information
userSchema.methods.toSafeObject = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to get users by role
userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model('User', userSchema);
