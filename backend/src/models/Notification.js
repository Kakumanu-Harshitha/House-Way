const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // Who receives the notification
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Who triggered the notification (optional)
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Notification type for categorization and handling
    type: {
      type: String,
      enum: [
        'assignment',           // When assigned to a project/task
        'task_assigned',        // Specific task assignment
        'vendor_assigned',      // Vendor assigned to project
        'executive_added',      // Executive added to project by designer
        'team_member_added',    // Team member added by executive
        'project_update',       // Project status/progress update
        'milestone_completed',  // Milestone achieved
        'deadline_reminder',    // Upcoming deadline
        'quotation_received',   // Quotation from vendor
        'quotation_accepted',   // Quotation accepted
        'invoice_generated',    // New invoice
        'payment_received',     // Payment confirmation
        'message_received',     // New chat/negotiation message
        'material_request',     // New material request
        'work_status_update',   // Work status changed
        'schedule_reminder',    // Schedule-based reminder
        'general',              // General notifications
      ],
      default: 'general',
      index: true,
    },
    // Title of the notification
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Main message content
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Related entities for deep linking
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    relatedTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    relatedPurchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    relatedMaterialRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MaterialRequest',
    },
    // For navigation in the app
    actionUrl: {
      type: String,
      default: '',
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Read status
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
    // Priority level
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    // Expiry date (for temporary notifications)
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1 });
notificationSchema.index({ createdAt: -1 });

// Static method to create a notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ recipient: userId, read: false });
};

// Static method to mark all as read for a user
notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { recipient: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);
