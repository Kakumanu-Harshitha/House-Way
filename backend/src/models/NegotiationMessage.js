const mongoose = require('mongoose');

/**
 * NegotiationMessage Model
 * Represents a single message/quotation in the negotiation chat for a PurchaseOrder.
 */
const negotiationMessageSchema = new mongoose.Schema(
  {
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'PurchaseOrder reference is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender is required'],
    },
    senderRole: {
      type: String,
      enum: ['admin', 'owner', 'vendor', 'system'],
      required: true,
    },
    messageType: {
      type: String,
      enum: {
        values: ['text', 'quotation', 'invoice', 'system', 'delivery'],
        message: 'Invalid message type',
      },
      default: 'text',
    },
    content: {
      type: String,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    quotation: {
      amount: {
        type: Number,
        min: [0, 'Amount cannot be negative'],
      },
      currency: {
        type: String,
        default: 'INR',
        enum: ['INR', 'USD', 'EUR', 'GBP'],
      },
      note: {
        type: String,
        trim: true,
        maxlength: [500, 'Quotation note cannot exceed 500 characters'],
      },
      status: {
        type: String,
        enum: ['pending', 'negotiated', 'accepted', 'rejected', 'expired'],
        default: 'pending',
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
      validUntil: Date,
      inResponseTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NegotiationMessage',
        default: null,
      },
    },
    invoice: {
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VendorInvoice',
      },
      invoiceNumber: String,
      amount: Number,
      status: String,
    },
    delivery: {
      estimatedDeliveryDate: Date,
      trackingNumber: String,
      carrier: String,
      notes: String,
    },
    systemEvent: {
      type: String,
      enum: [
        'order_created',
        'order_sent',
        'quotation_accepted',
        'quotation_rejected',
        'invoice_generated',
        'payment_received',
        'delivery_update',
        'delivery_details_required',
        'delivery_submitted',
      ],
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        filename: String,
        url: String,
        mimeType: String,
        size: Number,
      },
    ],
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
  },
  { timestamps: true }
);

negotiationMessageSchema.index({ purchaseOrder: 1, createdAt: 1 });
negotiationMessageSchema.index({ sender: 1 });

negotiationMessageSchema.virtual('isQuotation').get(function () {
  return this.messageType === 'quotation';
});

negotiationMessageSchema.virtual('canAct').get(function () {
  return this.messageType === 'quotation' && this.quotation?.status === 'pending';
});

negotiationMessageSchema.statics.getLatestQuotation = async function (purchaseOrderId) {
  return this.findOne({
    purchaseOrder: purchaseOrderId,
    messageType: 'quotation',
    'quotation.status': 'pending',
  }).sort({ createdAt: -1 });
};

negotiationMessageSchema.statics.getOrderMessages = async function (purchaseOrderId) {
  return this.find({ purchaseOrder: purchaseOrderId })
    .populate('sender', 'firstName lastName email role')
    .sort({ createdAt: 1 });
};

module.exports = mongoose.model('NegotiationMessage', negotiationMessageSchema);
