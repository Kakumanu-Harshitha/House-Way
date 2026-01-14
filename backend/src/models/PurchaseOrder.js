const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  quotationItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Made optional for draft POs created during vendor acceptance
  },
  materialName: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0'],
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
  },
  unitPrice: {
    type: Number,
    required: false, // Made optional for draft POs - prices determined during negotiation
    min: [0, 'Unit price cannot be negative'],
    default: 0,
  },
  totalPrice: {
    type: Number,
    required: false, // Made optional for draft POs - prices determined during negotiation
    min: [0, 'Total price cannot be negative'],
    default: 0,
  },
  deliveryStatus: {
    type: String,
    enum: {
      values: ['pending', 'partial', 'delivered', 'cancelled'],
      message: 'Delivery status must be one of: pending, partial, delivered, cancelled',
    },
    default: 'pending',
  },
  deliveredQuantity: {
    type: Number,
    min: [0, 'Delivered quantity cannot be negative'],
    default: 0,
  },
  deliveryDate: {
    type: Date,
    default: null,
  },
});

const purchaseOrderSchema = new mongoose.Schema({
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
    required: false, // Made optional for draft POs created during vendor acceptance
  },
  materialRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MaterialRequest',
    required: [true, 'Material request is required'],
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project is required'],
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor is required'],
  },
  purchaseOrderNumber: {
    type: String,
    required: [true, 'Purchase order number is required'],
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: [true, 'Purchase order title is required'],
    trim: true,
    maxlength: [100, 'Purchase order title cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Purchase order description cannot exceed 500 characters'],
  },
  items: {
    type: [purchaseOrderItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'At least one purchase order item is required',
    },
  },
  subtotal: {
    type: Number,
    required: false, // Made optional for draft POs
    min: [0, 'Subtotal cannot be negative'],
    default: 0,
  },
  tax: {
    percentage: {
      type: Number,
      min: [0, 'Tax percentage cannot be negative'],
      max: [100, 'Tax percentage cannot exceed 100'],
      default: 0,
    },
    amount: {
      type: Number,
      min: [0, 'Tax amount cannot be negative'],
      default: 0,
    },
  },
  discount: {
    percentage: {
      type: Number,
      min: [0, 'Discount percentage cannot be negative'],
      max: [100, 'Discount percentage cannot exceed 100'],
      default: 0,
    },
    amount: {
      type: Number,
      min: [0, 'Discount amount cannot be negative'],
      default: 0,
    },
  },
  deliveryCharges: {
    type: Number,
    min: [0, 'Delivery charges cannot be negative'],
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: false, // Made optional for draft POs
    min: [0, 'Total amount cannot be negative'],
    default: 0,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  status: {
    type: String,
    enum: {
      values: [
        'draft',
        'sent',
        'acknowledged',
        'in_progress',
        'partially_delivered',
        'completed',
        'cancelled',
        // Additive statuses used by negotiation chat/admin flows
        'in_negotiation',
        'accepted',
        'rejected',
      ],
      message:
        'Status must be one of: draft, sent, acknowledged, in_progress, partially_delivered, completed, cancelled, in_negotiation, accepted, rejected',
    },
    default: 'draft',
  },
  // Negotiation/chat metadata (additive; does not replace existing status workflow)
  negotiation: {
    acceptedQuotationMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NegotiationMessage',
      default: null,
    },
    finalAmount: {
      type: Number,
      default: null,
      min: [0, 'Final amount cannot be negative'],
    },
    chatClosed: {
      type: Boolean,
      default: false,
    },
    chatClosedAt: {
      type: Date,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  // Lightweight delivery tracking used by negotiation chat UI
  deliveryTracking: {
    status: {
      type: String,
      // Keep legacy values for backward compatibility; prefer the UI-aligned values.
      enum: [
        'not_started',
        'preparing',
        'packed',
        'dispatched',
        'in_transit',
        'out_for_delivery',
        'partially_delivered',
        'delivered',
        // legacy
        'pending',
        'processing',
        'shipped',
        'delayed',
        'cancelled',
      ],
      default: 'not_started',
    },
    trackingNumber: { type: String, default: '' },
    carrier: { type: String, default: '' },
    expectedArrival: { type: Date, default: null },
    expectedDeliveryDate: { type: Date, default: null },
    actualArrival: { type: Date, default: null },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updates: {
      type: [
        {
          status: { type: String, default: '' },
          notes: { type: String, default: '' },
          updatedAt: { type: Date, default: null },
          updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          trackingNumber: { type: String, default: '' },
          carrier: { type: String, default: '' },
          expectedArrival: { type: Date, default: null },
        },
      ],
      default: [],
    },
  },
  deliveryAddress: {
    street: {
      type: String,
      required: false, // Made optional for draft POs
    },
    city: {
      type: String,
      required: false, // Made optional for draft POs
    },
    state: {
      type: String,
      required: false, // Made optional for draft POs
    },
    zipCode: {
      type: String,
      required: false, // Made optional for draft POs
    },
    country: {
      type: String,
      required: false, // Made optional for draft POs
    },
    contactPerson: String,
    contactPhone: String,
  },
  expectedDeliveryDate: {
    type: Date,
    required: false, // Made optional for draft POs
  },
  actualDeliveryDate: {
    type: Date,
    default: null,
  },
  paymentTerms: {
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'check', 'bank_transfer', 'credit_card', 'net_30', 'net_60', 'advance'],
        message: 'Payment method must be one of: cash, check, bank_transfer, credit_card, net_30, net_60, advance',
      },
      required: false, // Made optional for draft POs
    },
    advancePercentage: {
      type: Number,
      min: [0, 'Advance percentage cannot be negative'],
      max: [100, 'Advance percentage cannot exceed 100'],
      default: 0,
    },
    advanceAmount: {
      type: Number,
      min: [0, 'Advance amount cannot be negative'],
      default: 0,
    },
    balanceAmount: {
      type: Number,
      min: [0, 'Balance amount cannot be negative'],
      default: 0,
    },
    paymentDueDate: Date,
  },
  attachments: [{
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase_order', 'invoice', 'receipt', 'delivery_note', 'other'],
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  deliveries: [{
    deliveryDate: {
      type: Date,
      required: true,
    },
    items: [{
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      deliveredQuantity: {
        type: Number,
        required: true,
        min: [0, 'Delivered quantity cannot be negative'],
      },
    }],
    deliveredBy: String,
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: String,
    attachments: [{
      name: String,
      url: String,
    }],
  }],
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [300, 'Note content cannot exceed 300 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isInternal: {
      type: Boolean,
      default: false,
    },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required'],
  },
  sentAt: {
    type: Date,
    default: null,
  },
  acknowledgedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance (purchaseOrderNumber index is already created by unique: true)
purchaseOrderSchema.index({ quotation: 1 });
purchaseOrderSchema.index({ materialRequest: 1 });
purchaseOrderSchema.index({ project: 1 });
purchaseOrderSchema.index({ vendor: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Virtual for delivery progress percentage
purchaseOrderSchema.virtual('deliveryProgress').get(function() {
  if (this.items && this.items.length > 0) {
    const totalItems = this.items.length;
    const deliveredItems = this.items.filter(item => item.deliveryStatus === 'delivered').length;
    return Math.round((deliveredItems / totalItems) * 100);
  }
  return 0;
});

// Virtual for days until expected delivery
purchaseOrderSchema.virtual('daysUntilDelivery').get(function() {
  if (this.expectedDeliveryDate) {
    const diffTime = this.expectedDeliveryDate - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Pre-save middleware to calculate totals and generate PO number
purchaseOrderSchema.pre('save', function(next) {
  // Calculate subtotal
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((total, item) => {
      item.totalPrice = item.quantity * item.unitPrice;
      return total + item.totalPrice;
    }, 0);
  }
  
  // Calculate tax amount
  if (this.tax.percentage > 0) {
    this.tax.amount = (this.subtotal * this.tax.percentage) / 100;
  }
  
  // Calculate discount amount
  if (this.discount.percentage > 0) {
    this.discount.amount = (this.subtotal * this.discount.percentage) / 100;
  }
  
  // Calculate total amount
  this.totalAmount = this.subtotal + this.tax.amount - this.discount.amount + this.deliveryCharges;
  
  // Calculate payment amounts
  if (this.paymentTerms.advancePercentage > 0) {
    this.paymentTerms.advanceAmount = (this.totalAmount * this.paymentTerms.advancePercentage) / 100;
    this.paymentTerms.balanceAmount = this.totalAmount - this.paymentTerms.advanceAmount;
  } else {
    this.paymentTerms.balanceAmount = this.totalAmount;
  }
  
  // Generate PO number if not provided
  if (!this.purchaseOrderNumber) {
    const timestamp = Date.now().toString().slice(-6);
    this.purchaseOrderNumber = `PO-${timestamp}`;
  }
  
  // Validate delivery date
  if (this.expectedDeliveryDate && this.expectedDeliveryDate <= new Date()) {
    return next(new Error('Expected delivery date must be in the future'));
  }
  
  next();
});

// Static method to find purchase orders by project
purchaseOrderSchema.statics.findByProject = function(projectId) {
  return this.find({ project: projectId })
    .populate('quotation materialRequest project vendor createdBy');
};

// Static method to find purchase orders by vendor
purchaseOrderSchema.statics.findByVendor = function(vendorId) {
  return this.find({ vendor: vendorId })
    .populate('quotation materialRequest project vendor createdBy');
};

// Instance method to send purchase order
purchaseOrderSchema.methods.send = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Instance method to acknowledge purchase order
purchaseOrderSchema.methods.acknowledge = function() {
  this.status = 'acknowledged';
  this.acknowledgedAt = new Date();
  return this.save();
};

// Instance method to record delivery
purchaseOrderSchema.methods.recordDelivery = function(deliveryData, receivedBy) {
  this.deliveries.push({
    ...deliveryData,
    receivedBy,
  });
  
  // Update item delivery status
  deliveryData.items.forEach(deliveredItem => {
    const item = this.items.id(deliveredItem.itemId);
    if (item) {
      item.deliveredQuantity += deliveredItem.deliveredQuantity;
      if (item.deliveredQuantity >= item.quantity) {
        item.deliveryStatus = 'delivered';
        item.deliveryDate = deliveryData.deliveryDate;
      } else {
        item.deliveryStatus = 'partial';
      }
    }
  });
  
  // Update overall status
  const allDelivered = this.items.every(item => item.deliveryStatus === 'delivered');
  const someDelivered = this.items.some(item => item.deliveryStatus === 'delivered' || item.deliveryStatus === 'partial');
  
  if (allDelivered) {
    this.status = 'completed';
    this.actualDeliveryDate = deliveryData.deliveryDate;
  } else if (someDelivered) {
    this.status = 'partially_delivered';
  }
  
  return this.save();
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
