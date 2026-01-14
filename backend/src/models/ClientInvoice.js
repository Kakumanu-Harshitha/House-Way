const mongoose = require('mongoose');

const clientInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Client ID is required']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  lineItems: [{
    description: {
      type: String,
      required: [true, 'Line item description is required'],
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 1
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    total: {
      type: Number,
      required: [true, 'Line item total is required'],
      min: [0, 'Line item total cannot be negative']
    },
    category: {
      type: String,
      enum: ['labor', 'materials', 'services', 'consulting', 'other'],
      default: 'services'
    },
    taxable: {
      type: Boolean,
      default: true
    }
  }],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative']
  },
  taxRate: {
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100'],
    default: 0
  },
  taxAmount: {
    type: Number,
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'fixed'
  },
  discountValue: {
    type: Number,
    min: [0, 'Discount value cannot be negative'],
    default: 0
  },
  discountAmount: {
    type: Number,
    min: [0, 'Discount amount cannot be negative'],
    default: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    default: 'USD'
  },
  status: {
    type: String,
    enum: {
      values: ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'refunded'],
      message: 'Status must be one of: draft, sent, viewed, paid, overdue, cancelled, refunded'
    },
    default: 'draft'
  },
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function (value) {
        return value >= this.issueDate;
      },
      message: 'Due date must be on or after issue date'
    }
  },
  paidDate: Date,
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'paypal', 'other'],
    default: 'bank_transfer'
  },
  paymentTerms: {
    type: String,
    trim: true,
    maxlength: [500, 'Payment terms cannot exceed 500 characters'],
    default: 'Payment due within 30 days'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  internalNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Internal notes cannot exceed 1000 characters']
  },
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sentDate: Date,
  viewedDate: Date,
  reminderDates: [Date],
  lateFeeSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    value: Number,
    gracePeriodDays: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  recurringSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
    },
    nextDate: Date,
    endDate: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
clientInvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
clientInvoiceSchema.index({ clientId: 1, createdAt: -1 });
clientInvoiceSchema.index({ projectId: 1, createdAt: -1 });
clientInvoiceSchema.index({ status: 1 });
clientInvoiceSchema.index({ dueDate: 1 });
clientInvoiceSchema.index({ createdBy: 1 });

// Virtual for formatted currency amounts
clientInvoiceSchema.virtual('formattedSubtotal').get(function () {
  return this.formatCurrency(this.subtotal);
});

clientInvoiceSchema.virtual('formattedTaxAmount').get(function () {
  return this.formatCurrency(this.taxAmount);
});

clientInvoiceSchema.virtual('formattedDiscountAmount').get(function () {
  return this.formatCurrency(this.discountAmount);
});

clientInvoiceSchema.virtual('formattedTotalAmount').get(function () {
  return this.formatCurrency(this.totalAmount);
});

// Virtual for days until due
clientInvoiceSchema.virtual('daysUntilDue').get(function () {
  const now = new Date();
  const diffTime = this.dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is overdue
clientInvoiceSchema.virtual('isOverdue').get(function () {
  return this.status !== 'paid' && this.status !== 'cancelled' && this.daysUntilDue < 0;
});

// Virtual for formatted issue date
clientInvoiceSchema.virtual('formattedIssueDate').get(function () {
  return this.issueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted due date
clientInvoiceSchema.virtual('formattedDueDate').get(function () {
  return this.dueDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Pre-find middleware to populate related data
clientInvoiceSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'clientId',
    select: 'firstName lastName email company phone address'
  });
  this.populate({
    path: 'projectId',
    select: 'title status'
  });
  this.populate({
    path: 'createdBy',
    select: 'firstName lastName email'
  });
  this.populate({
    path: 'lastModifiedBy',
    select: 'firstName lastName email'
  });
  next();
});

// Pre-validate middleware to calculate totals
clientInvoiceSchema.pre('validate', function (next) {
  // Calculate subtotal from line items
  this.subtotal = this.lineItems.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);

  // Calculate tax amount
  const taxableAmount = this.lineItems
    .filter(item => item.taxable)
    .reduce((total, item) => {
      return total + (item.quantity * item.unitPrice);
    }, 0);

  this.taxAmount = (taxableAmount * this.taxRate) / 100;

  // Calculate discount amount
  if (this.discountType === 'percentage') {
    this.discountAmount = (this.subtotal * this.discountValue) / 100;
  } else {
    this.discountAmount = this.discountValue;
  }

  // Calculate total amount
  this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;

  // Update line item totals
  this.lineItems.forEach(item => {
    item.total = item.quantity * item.unitPrice;
  });

  next();
});

// Pre-validate middleware to generate invoice number
clientInvoiceSchema.pre('validate', async function (next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(year + 1, 0, 1)
      }
    });

    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Instance method to format currency
clientInvoiceSchema.methods.formatCurrency = function (amount) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$'
  };

  const symbol = symbols[this.currency] || '$';
  return `${symbol}${amount.toFixed(2)}`;
};

// Instance method to mark as sent
clientInvoiceSchema.methods.markAsSent = function () {
  this.status = 'sent';
  this.sentDate = new Date();
  return this.save();
};

// Instance method to mark as viewed
clientInvoiceSchema.methods.markAsViewed = function () {
  if (this.status === 'sent') {
    this.status = 'viewed';
    this.viewedDate = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Instance method to mark as paid
clientInvoiceSchema.methods.markAsPaid = function (paymentMethod, paidDate = new Date()) {
  this.status = 'paid';
  this.paymentMethod = paymentMethod;
  this.paidDate = paidDate;
  return this.save();
};

// Instance method to calculate late fee
clientInvoiceSchema.methods.calculateLateFee = function () {
  if (!this.lateFeeSettings.enabled || !this.isOverdue) {
    return 0;
  }

  const gracePeriodEnd = new Date(this.dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + this.lateFeeSettings.gracePeriodDays);

  if (new Date() <= gracePeriodEnd) {
    return 0;
  }

  if (this.lateFeeSettings.type === 'percentage') {
    return (this.totalAmount * this.lateFeeSettings.value) / 100;
  } else {
    return this.lateFeeSettings.value;
  }
};

// Static method to get invoices for a client
clientInvoiceSchema.statics.getClientInvoices = function (clientId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    startDate,
    endDate,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const query = { clientId };

  if (status) query.status = status;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get overdue invoices
clientInvoiceSchema.statics.getOverdueInvoices = function () {
  const now = new Date();
  return this.find({
    status: { $in: ['sent', 'viewed'] },
    dueDate: { $lt: now }
  })
    .sort({ dueDate: 1 })
    .exec();
};

// Static method to get invoice statistics
clientInvoiceSchema.statics.getInvoiceStats = function (clientId = null, startDate = null, endDate = null) {
  const matchStage = {};
  if (clientId) matchStage.clientId = new mongoose.Types.ObjectId(clientId);
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$totalAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('ClientInvoice', clientInvoiceSchema);