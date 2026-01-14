const mongoose = require('mongoose');

const clientTimelineEventSchema = new mongoose.Schema({
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
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: {
      values: ['milestone', 'update', 'media', 'invoice', 'note'],
      message: 'Event type must be one of: milestone, update, media, invoice, note'
    }
  },
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Event description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  visibility: {
    type: String,
    enum: {
      values: ['public', 'internal'],
      message: 'Visibility must be either public or internal'
    },
    default: 'public'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  comments: [{
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Comment author ID is required']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  isPinned: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'in-progress'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
clientTimelineEventSchema.index({ clientId: 1, createdAt: -1 });
clientTimelineEventSchema.index({ projectId: 1, createdAt: -1 });
clientTimelineEventSchema.index({ eventType: 1 });
clientTimelineEventSchema.index({ visibility: 1 });
clientTimelineEventSchema.index({ createdBy: 1 });

// Virtual for formatted date
clientTimelineEventSchema.virtual('formattedDate').get(function () {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for relative time
clientTimelineEventSchema.virtual('timeAgo').get(function () {
  const now = new Date();
  const diffInMs = now - this.createdAt;
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) {
    return 'Just now';
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else {
    return this.formattedDate;
  }
});

// Pre-find middleware to populate related data
clientTimelineEventSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'createdBy',
    select: 'firstName lastName email role profileImage'
  });
  this.populate({
    path: 'comments.author',
    select: 'firstName lastName email role profileImage'
  });
  next();
});

// Static method to get timeline events for a client
clientTimelineEventSchema.statics.getClientTimeline = function (clientId, options = {}) {
  const {
    page = 1,
    limit = 20,
    eventType,
    visibility,
    startDate,
    endDate
  } = options;

  const query = { clientId };

  if (eventType) query.eventType = eventType;
  if (visibility) query.visibility = visibility;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ createdAt: -1, isPinned: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Static method to get timeline events for a project
clientTimelineEventSchema.statics.getProjectTimeline = function (projectId, options = {}) {
  const {
    page = 1,
    limit = 20,
    eventType,
    visibility
  } = options;

  const query = { projectId };

  if (eventType) query.eventType = eventType;
  if (visibility) query.visibility = visibility;

  return this.find(query)
    .sort({ createdAt: -1, isPinned: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec();
};

// Instance method to add comment
clientTimelineEventSchema.methods.addComment = function (content, authorId, isInternal = false) {
  this.comments.push({
    content,
    author: authorId,
    isInternal
  });
  return this.save();
};

module.exports = mongoose.model('ClientTimelineEvent', clientTimelineEventSchema);