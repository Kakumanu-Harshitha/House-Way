const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            projectId,
            taskName,
            taskDescription,
            date,
            time,
            notifyBefore,
            priority,
            assignedTo,
        } = req.body;

        // Validate project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }

        const task = new Task({
            projectId,
            taskName,
            taskDescription,
            date,
            time,
            notifyBefore: notifyBefore || 30,
            priority: priority || 'medium',
            assignedTo,
            createdBy: req.user._id,
        });

        await task.save();

        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName');

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: { task: populatedTask },
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create task',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/tasks/project/:projectId
 * @desc    Get all tasks for a project
 * @access  Private
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, fromDate } = req.query;

        const tasks = await Task.getProjectTasks(projectId, { status, fromDate });

        res.json({
            success: true,
            data: { tasks },
        });
    } catch (error) {
        console.error('Get project tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tasks',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/tasks/upcoming
 * @desc    Get upcoming tasks for current user
 * @access  Private
 */
router.get('/upcoming', authenticate, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const tasks = await Task.getUpcomingTasks(req.user._id, parseInt(days));

        res.json({
            success: true,
            data: { tasks },
        });
    } catch (error) {
        console.error('Get upcoming tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get upcoming tasks',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/tasks/:taskId
 * @desc    Get a single task
 * @access  Private
 */
router.get('/:taskId', authenticate, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId)
            .populate('projectId', 'title')
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName');

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        res.json({
            success: true,
            data: { task },
        });
    } catch (error) {
        console.error('Get task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get task',
            error: error.message,
        });
    }
});

/**
 * @route   PUT /api/tasks/:taskId
 * @desc    Update a task
 * @access  Private
 */
router.put('/:taskId', authenticate, async (req, res) => {
    try {
        const {
            taskName,
            taskDescription,
            date,
            time,
            notifyBefore,
            priority,
            status,
            assignedTo,
        } = req.body;

        const task = await Task.findById(req.params.taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        // Update fields if provided
        if (taskName) task.taskName = taskName;
        if (taskDescription !== undefined) task.taskDescription = taskDescription;
        if (date) task.date = date;
        if (time) task.time = time;
        if (notifyBefore !== undefined) task.notifyBefore = notifyBefore;
        if (priority) task.priority = priority;
        if (status) {
            task.status = status;
            if (status === 'completed') {
                task.completedAt = new Date();
            }
        }
        if (assignedTo !== undefined) task.assignedTo = assignedTo;

        await task.save();

        const updatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'firstName lastName')
            .populate('createdBy', 'firstName lastName');

        res.json({
            success: true,
            message: 'Task updated successfully',
            data: { task: updatedTask },
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task',
            error: error.message,
        });
    }
});

/**
 * @route   DELETE /api/tasks/:taskId
 * @desc    Delete a task
 * @access  Private
 */
router.delete('/:taskId', authenticate, async (req, res) => {
    try {
        const task = await Task.findById(req.params.taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        await Task.findByIdAndDelete(req.params.taskId);

        res.json({
            success: true,
            message: 'Task deleted successfully',
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete task',
            error: error.message,
        });
    }
});

/**
 * @route   PUT /api/tasks/:taskId/status
 * @desc    Update task status
 * @access  Private
 */
router.put('/:taskId/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status',
            });
        }

        const task = await Task.findById(req.params.taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found',
            });
        }

        task.status = status;
        if (status === 'completed') {
            task.completedAt = new Date();
        }

        await task.save();

        res.json({
            success: true,
            message: 'Task status updated',
            data: { task },
        });
    } catch (error) {
        console.error('Update task status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task status',
            error: error.message,
        });
    }
});

module.exports = router;
