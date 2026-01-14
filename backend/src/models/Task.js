const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true,
    },
    taskName: {
        type: String,
        required: [true, 'Task name is required'],
        trim: true,
        maxlength: 200,
    },
    taskDescription: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    date: {
        type: Date,
        required: [true, 'Task date is required'],
    },
    time: {
        type: String,
        required: [true, 'Task time is required'],
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format'],
    },
    notifyBefore: {
        type: Number, // Minutes before task to notify
        default: 30,
        min: 0,
        max: 1440, // Max 24 hours
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'cancelled'],
        default: 'pending',
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    completedAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp on save
taskSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Get scheduled datetime
taskSchema.virtual('scheduledAt').get(function () {
    if (!this.date || !this.time) return null;
    const [hours, minutes] = this.time.split(':').map(Number);
    const scheduled = new Date(this.date);
    scheduled.setHours(hours, minutes, 0, 0);
    return scheduled;
});

// Get notification datetime
taskSchema.virtual('notifyAt').get(function () {
    if (!this.scheduledAt || !this.notifyBefore) return null;
    return new Date(this.scheduledAt.getTime() - this.notifyBefore * 60000);
});

// Indexes
taskSchema.index({ projectId: 1, date: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ date: 1, status: 1 });

// Static method to get tasks for a project
taskSchema.statics.getProjectTasks = async function (projectId, options = {}) {
    const query = { projectId };

    if (options.status) {
        query.status = options.status;
    }

    if (options.fromDate) {
        query.date = { $gte: new Date(options.fromDate) };
    }

    return this.find(query)
        .populate('assignedTo', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ date: 1, time: 1 });
};

// Static method to get upcoming tasks
taskSchema.statics.getUpcomingTasks = async function (userId, days = 7) {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.find({
        $or: [
            { assignedTo: userId },
            { createdBy: userId },
        ],
        date: { $gte: now, $lte: endDate },
        status: { $in: ['pending', 'in-progress'] },
    })
        .populate('projectId', 'title')
        .sort({ date: 1, time: 1 });
};

module.exports = mongoose.model('Task', taskSchema);
