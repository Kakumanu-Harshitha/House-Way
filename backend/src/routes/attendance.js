const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/attendance/check-in
 * @desc    Start work day (check in)
 * @access  Private
 */
router.post('/check-in', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        // Check if already checked in today
        let attendance = await Attendance.findOne({ user: userId, date: today });

        if (attendance && attendance.isCheckedIn) {
            return res.status(400).json({
                success: false,
                message: 'Already checked in today',
                data: { attendance },
            });
        }

        if (attendance && !attendance.isCheckedIn) {
            // Re-check-in after checkout (resume work)
            attendance.isCheckedIn = true;
            attendance.lastHeartbeat = now;
            // Resume means session is active again; clear prior checkout time.
            attendance.checkOutTime = null;
            // Defensive: ensure checkInTime exists.
            if (!attendance.checkInTime) attendance.checkInTime = now;
            await attendance.save();
        } else {
            // First check-in of the day
            attendance = new Attendance({
                user: userId,
                date: today,
                checkInTime: now,
                isCheckedIn: true,
                lastHeartbeat: now,
                hourlyLogs: [],
                totalActiveMinutes: 0,
            });
            await attendance.save();
        }

        res.status(201).json({
            success: true,
            message: 'Checked in successfully',
            data: { attendance },
        });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check in',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/attendance/heartbeat
 * @desc    Log hourly activity (called once per hour from app)
 * @access  Private
 */
router.post('/heartbeat', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        let { activeMinutes } = req.body;
        
        // Validate activeMinutes: must be 0-60
        if (typeof activeMinutes !== 'number' || activeMinutes < 0 || activeMinutes > 60) {
            activeMinutes = 60; // Default to full hour
        }
        activeMinutes = Math.min(Math.max(0, activeMinutes), 60);
        
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const currentHour = now.getHours();

        // Find the active session for TODAY (not just any active session)
        const attendance = await Attendance.findOne({ 
            user: userId, 
            isCheckedIn: true,
            date: { $gte: today }
        }).sort({ date: -1 });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'No active session found to record heartbeat',
            });
        }

        // Check if this hour already logged
        const existingLog = attendance.hourlyLogs.find(log => log.hour === currentHour);

        if (existingLog) {
            // Update existing log - don't allow decreasing values
            existingLog.activeMinutes = Math.max(existingLog.activeMinutes, activeMinutes);
            existingLog.timestamp = now;
        } else {
            // Add new hourly log
            attendance.hourlyLogs.push({
                hour: currentHour,
                activeMinutes,
                timestamp: now,
            });
        }

        // Recalculate total - cap at 24 hours (1440 minutes)
        const rawTotal = attendance.hourlyLogs.reduce(
            (sum, log) => sum + log.activeMinutes, 0
        );
        attendance.totalActiveMinutes = Math.min(rawTotal, 1440);
        attendance.lastHeartbeat = now;

        await attendance.save();

        res.json({
            success: true,
            message: 'Heartbeat recorded',
            data: {
                hour: currentHour,
                activeMinutesThisHour: activeMinutes,
                totalActiveMinutes: attendance.totalActiveMinutes,
                totalActiveHours: Math.round(attendance.totalActiveMinutes / 60 * 10) / 10,
            },
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record heartbeat',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/attendance/check-out
 * @desc    End work day (check out)
 * @access  Private
 */
router.post('/check-out', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        // Find the most recent active session for today
        const attendance = await Attendance.findOne({ 
            user: userId, 
            isCheckedIn: true,
            date: { $gte: today }
        }).sort({ date: -1, checkInTime: -1 });

        if (!attendance) {
            return res.status(400).json({
                success: false,
                message: 'No active session found. Please check in first.',
            });
        }

        if (!attendance.isCheckedIn) {
            return res.status(400).json({
                success: false,
                message: 'Already checked out',
                data: { attendance },
            });
        }

        // Verify checkInTime exists before checkout
        if (!attendance.checkInTime) {
            return res.status(400).json({
                success: false,
                message: 'Invalid session: no check-in time found',
            });
        }

        attendance.checkOutTime = now;
        attendance.isCheckedIn = false;
        await attendance.save();

        // Calculate duration
        const durationMs = attendance.checkOutTime - attendance.checkInTime;
        const durationMinutes = Math.max(0, Math.round(durationMs / 60000));

        res.json({
            success: true,
            message: 'Checked out successfully',
            data: {
                attendance,
                summary: {
                    checkIn: attendance.checkInTime,
                    checkOut: attendance.checkOutTime,
                    durationMinutes,
                    sessionHours: Math.round(durationMinutes / 60 * 10) / 10,
                    totalActiveHours: Math.round(attendance.totalActiveMinutes / 60 * 10) / 10,
                },
            },
        });
    } catch (error) {
        console.error('Check-out error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check out',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/attendance
 * @desc    Get attendance data for current user or specific employee (admin)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { userId, date } = req.query;
        
        // Determine which user to fetch
        let targetUserId = userId || req.user._id.toString();
        
        // If admin/owner is requesting another user's data, allow it
        if (userId && req.user.role !== 'owner' && userId !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Only owners can view other employees attendance',
            });
        }

        console.log('[Attendance] Fetching for user:', targetUserId, 'Requester role:', req.user.role);

        // If a date is provided, return the record for that day (not “most recent”).
        if (date) {
            const d = new Date(date);
            if (!Number.isNaN(d.getTime())) {
                d.setHours(0, 0, 0, 0);
                const nextDay = new Date(d);
                nextDay.setDate(nextDay.getDate() + 1);

                const dayRecord = await Attendance.findOne({
                    user: targetUserId,
                    date: { $gte: d, $lt: nextDay },
                }).sort({ date: -1, checkInTime: -1 });

                return res.json({
                    success: true,
                    data: {
                        isCheckedIn: dayRecord?.isCheckedIn || false,
                        checkInTime: dayRecord?.checkInTime || null,
                        checkOutTime: dayRecord?.checkOutTime || null,
                        totalActiveMinutes: dayRecord?.totalActiveMinutes || 0,
                        totalActiveHours: dayRecord ? Math.round(dayRecord.totalActiveMinutes / 60 * 10) / 10 : 0,
                        lastHeartbeat: dayRecord?.lastHeartbeat || null,
                    },
                });
            }
        }

        // Look for active session first
        let attendance = await Attendance.findOne({ user: targetUserId, isCheckedIn: true });

        if (!attendance) {
            // Get most recent record
            attendance = await Attendance.findOne({ user: targetUserId }).sort({ date: -1 });
        }

        console.log('[Attendance] Found:', attendance ? 'yes' : 'no');

        res.json({
            success: true,
            data: {
                isCheckedIn: attendance?.isCheckedIn || false,
                checkInTime: attendance?.checkInTime || null,
                checkOutTime: attendance?.checkOutTime || null,
                totalActiveMinutes: attendance?.totalActiveMinutes || 0,
                totalActiveHours: attendance ? Math.round(attendance.totalActiveMinutes / 60 * 10) / 10 : 0,
                lastHeartbeat: attendance?.lastHeartbeat || null,
            },
        });
    } catch (error) {
        console.error('Attendance GET error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/attendance/status
 * @desc    Get current check-in status
 * @access  Private
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Look for active session for TODAY only
        let attendance = await Attendance.findOne({ 
            user: userId, 
            isCheckedIn: true,
            date: { $gte: today }
        });

        if (!attendance) {
            // Get most recent record for today
            attendance = await Attendance.findOne({ 
                user: userId,
                date: { $gte: today }
            }).sort({ date: -1, checkInTime: -1 });
        }

        res.json({
            success: true,
            data: {
                isCheckedIn: attendance?.isCheckedIn || false,
                checkInTime: attendance?.checkInTime || null,
                checkOutTime: attendance?.checkOutTime || null,
                totalActiveMinutes: attendance?.totalActiveMinutes || 0,
                totalActiveHours: attendance ? Math.round(attendance.totalActiveMinutes / 60 * 10) / 10 : 0,
                lastHeartbeat: attendance?.lastHeartbeat || null,
            },
        });
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get status',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/attendance/all
 * @desc    Get all attendance records for all employees (Admin/Owner only)
 * @access  Private (Owner only)
 */
router.get('/all', authenticate, async (req, res) => {
    try {
        // Check if requester is owner
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Only owners can view all attendance records',
            });
        }

        const { date, startDate, endDate } = req.query;
        let dateFilter = {};
        
        if (date) {
            // Single date filter
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const nextDay = new Date(d);
            nextDay.setDate(nextDay.getDate() + 1);
            dateFilter = { date: { $gte: d, $lt: nextDay } };
        } else if (startDate && endDate) {
            // Date range filter
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter = { date: { $gte: start, $lte: end } };
        } else {
            // Default: last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            thirtyDaysAgo.setHours(0, 0, 0, 0);
            dateFilter = { date: { $gte: thirtyDaysAgo } };
        }

        const attendanceRecords = await Attendance.find(dateFilter)
            .populate('user', 'firstName lastName email employeeDetails')
            .sort({ date: -1, checkInTime: -1 });

        res.json({
            success: true,
            data: {
                attendanceRecords,
                count: attendanceRecords.length,
            },
        });
    } catch (error) {
        console.error('Get all attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance records',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/attendance/stats
 * @desc    Get attendance statistics (daily/weekly/monthly)
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const userId = req.user._id;
        const { period = 'weekly' } = req.query;

        const stats = await Attendance.getStats(userId, period);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get stats',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/attendance/employee/:employeeId
 * @desc    Get attendance for a specific employee (Admin use)
 * @access  Private (Owner/Admin)
 */
router.get('/employee/:employeeId', authenticate, async (req, res) => {
    try {
        // Check if requester is owner/admin
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'Only owners can view employee attendance',
            });
        }

        const { employeeId } = req.params;
        const { period = 'weekly' } = req.query;

        const stats = await Attendance.getStats(employeeId, period);

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Employee stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get employee stats',
            error: error.message,
        });
    }
});

module.exports = router;
