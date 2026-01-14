const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true,
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'File category is required'],
    enum: [
      'documents',
      'images',
      'quotations',
      'purchase-orders',
      'work_update',
      'invoices'
    ],
    default: 'documents',
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative'],
  },
  path: {
    type: String, // ✅ GCS URL stored here
    required: [true, 'File path is required'],
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploader is required'],
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation',
  },
  invoiceDate: {
    type: Date,
  },
  invoiceInfo: {
    type: String,
    trim: true,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
}, {
  timestamps: true,
});

// Indexes for faster queries
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ category: 1 });
fileSchema.index({ project: 1 });
fileSchema.index({ quotation: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ createdAt: -1 });

module.exports = mongoose.model('File', fileSchema);
