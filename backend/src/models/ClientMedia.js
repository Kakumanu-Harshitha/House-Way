const mongoose = require('mongoose');

const clientMediaSchema = new mongoose.Schema({
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
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'Media URL is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Media type is required'],
    enum: {
      values: ['image', 'video', 'document'],
      message: 'Media type must be one of: image, video, document'
    }
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required'],
    trim: true
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  dimensions: {
    width: Number,
    height: Number
  },
  duration: {
    type: Number, // For videos in seconds
    min: 0
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: ['inspiration', 'progress', 'completion', 'reference', 'document', 'other'],
    default: 'other'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Uploaded by user ID is required']
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  metadata: {
    // EXIF data for images
    camera: String,
    lens: String,
    iso: Number,
    aperture: String,
    shutterSpeed: String,
    // Document specific metadata
    pageCount: Number,
    // Video specific metadata
    resolution: String,
    frameRate: Number,
    codec: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
clientMediaSchema.index({ clientId: 1, createdAt: -1 });
clientMediaSchema.index({ projectId: 1, createdAt: -1 });
clientMediaSchema.index({ type: 1 });
clientMediaSchema.index({ category: 1 });
clientMediaSchema.index({ tags: 1 });
clientMediaSchema.index({ uploadedBy: 1 });
clientMediaSchema.index({ isFeatured: 1 });
clientMediaSchema.index({ isPublic: 1 });

// Virtual for formatted file size
clientMediaSchema.virtual('formattedSize').get(function() {
  if (!this.size) return 'Unknown size';

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = this.size;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
});

// Virtual for file extension
clientMediaSchema.virtual('extension').get(function() {
  const parts = this.originalName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
});

// Virtual for thumbnail URL (for images and videos)
clientMediaSchema.virtual('thumbnailUrl').get(function() {
  if (this.type === 'image') {
    // You could implement thumbnail generation logic here
    return this.url; // For now, return original URL
  } else if (this.type === 'video') {
    // You could implement video thumbnail extraction here
    return this.url; // For now, return original URL
  }
  return null;
});

// Pre-find middleware to populate related data
clientMediaSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'uploadedBy',
    select: 'firstName lastName email role profileImage'
  });
  next();
});

// Static method to get media gallery for a client
clientMediaSchema.statics.getClientMedia = function(clientId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    tags,
    isPublic,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const query = { clientId };

  if (type) query.type = type;
  if (category) query.category = category;
  if (tags && tags.length > 0) query.tags = { $in: tags };
  if (typeof isPublic === 'boolean') query.isPublic = isPublic;

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get media for a project
clientMediaSchema.statics.getProjectMedia = function(projectId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    category,
    isPublic,
    sortBy = 'createdAt',
    sortOrder = -1
  } = options;

  const query = { projectId };

  if (type) query.type = type;
  if (category) query.category = category;
  if (typeof isPublic === 'boolean') query.isPublic = isPublic;

  return this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get featured media
clientMediaSchema.statics.getFeaturedMedia = function(clientId, limit = 6) {
  return this.find({
    clientId,
    isFeatured: true,
    isPublic: true
  })
  .sort({ featuredAt: -1, createdAt: -1 })
  .limit(limit)
  .exec();
};

// Static method to search media
clientMediaSchema.statics.searchMedia = function(searchTerm, clientId = null) {
  const query = {
    $or: [
      { originalName: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } }
    ]
  };

  if (clientId) {
    query.clientId = clientId;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .exec();
};

// Instance method to increment view count
clientMediaSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Instance method to increment download count
clientMediaSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  return this.save();
};

// Instance method to toggle featured status
clientMediaSchema.methods.toggleFeatured = function() {
  this.isFeatured = !this.isFeatured;
  if (this.isFeatured) {
    this.featuredAt = new Date();
  }
  return this.save();
};

// Pre-save middleware to validate file type and size
clientMediaSchema.pre('save', function(next) {
  // Validate file size (max 50MB for documents, 100MB for images/videos)
  const maxSizes = {
    image: 100 * 1024 * 1024, // 100MB
    video: 100 * 1024 * 1024, // 100MB
    document: 50 * 1024 * 1024  // 50MB
  };

  if (this.size > maxSizes[this.type]) {
    const error = new Error(`File size exceeds maximum allowed size for ${this.type}s`);
    error.name = 'ValidationError';
    return next(error);
  }

  next();
}); 

module.exports = mongoose.model('ClientMedia', clientMediaSchema);
