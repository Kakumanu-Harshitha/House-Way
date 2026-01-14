const mongoose = require('mongoose');

const vendorInvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      // Note: unique:true already creates an index, no need for index:true
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    acceptedQuotation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NegotiationMessage',
      required: true,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    items: [
      {
        name: String,
        quantity: Number,
        unit: String,
        unitPrice: Number,
        total: Number,
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      rate: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    discount: {
      type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage',
      },
      value: { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    amountDue: {
      type: Number,
      default: 0,
    },
    payments: [
      {
        amount: Number,
        method: String,
        reference: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        recordedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Vendor uploaded invoice documents
    attachments: [
      {
        filename: { type: String, required: true },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
  },
  { timestamps: true }
);

vendorInvoiceSchema.pre('save', function (next) {
  if (this.amountDue === 0 && this.totalAmount) {
    this.amountDue = this.totalAmount - (this.amountPaid || 0);
  }
  next();
});

module.exports = mongoose.model('VendorInvoice', vendorInvoiceSchema);
