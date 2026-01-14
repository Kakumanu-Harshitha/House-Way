const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  checkInTime: {
    type: Date,
    required: true,
  },
  checkOutTime: {
    type: Date,
    default: null,
  },
  hourlyLogs: [{
    hour: { type: Number, min: 0, max: 23 },
    activeMinutes: { type: Number, default: 0, min: 0, max: 60 },
    timestamp: { type: Date, default: Date.now },
  }],
  totalActiveMinutes: {
    type: Number,
    default: 0,
  },
  isCheckedIn: {
    type: Boolean,
    default: true,
  },
  lastHeartbeat: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for user + date uniqueness (one record per user per day)
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Static: Get today's attendance for a user
attendanceSchema.statics.getTodayAttendance = async function (userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return this.findOne({ user: userId, date: today });
};

// Static: Get attendance stats for a user (daily, weekly, monthly)
attendanceSchema.statics.getStats = async function (userId, period = 'weekly') {
  const now = new Date();
  let startDate = new Date();

  switch (period) {
    case 'daily':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(now.getMonth() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }

  const records = await this.find({
    user: userId,
    date: { $gte: startDate, $lte: now },
  }).sort({ date: -1 });

  // Calculate total hours based on check-in and check-out times
  let totalMinutes = 0;
  records.forEach(r => {
    if (r.checkInTime) {
      // Use checkOutTime if available, otherwise use current time if still checked in
      const endTime = r.checkOutTime || (r.isCheckedIn ? new Date() : r.checkInTime);
      const diffMs = endTime - r.checkInTime;
      // Convert to minutes, cap at 24 hours per day max
      const dayMinutes = Math.min(Math.max(0, diffMs / 60000), 1440);
      totalMinutes += dayMinutes;
    }
  });

  const totalDays = records.length;
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  return {
    period,
    totalDays,
    totalHours,
    totalMinutes: Math.round(totalMinutes),
    averageHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 10) / 10 : 0,
    records: records.map(r => {
      let activeHours = 0;
      if (r.checkInTime) {
        const endTime = r.checkOutTime || (r.isCheckedIn ? new Date() : r.checkInTime);
        const diffMs = endTime - r.checkInTime;
        // Cap at 24 hours per day
        activeHours = Math.min(Math.round(diffMs / 3600000 * 10) / 10, 24);
      }
      return {
        date: r.date,
        checkIn: r.checkInTime,
        checkOut: r.checkOutTime,
        activeHours: Math.max(0, activeHours),
      };
    }),
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
