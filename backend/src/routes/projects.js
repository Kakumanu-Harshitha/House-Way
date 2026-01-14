const express = require('express');
const router = express.Router();
const multer = require('multer');
const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const ClientTimelineEvent = require('../models/ClientTimelineEvent');
const ClientMedia = require('../models/ClientMedia');
const ClientInvoice = require('../models/ClientInvoice');
const { authenticate, authorize, isOwner, isOwnerOrEmployee } = require('../middleware/auth');
const { validateProject } = require('../middleware/validation');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');
const { uploadToGCS } = require('../utils/gcs');
const NotificationService = require('../utils/notificationService');

// Memory storage for GCS media uploads
const memoryStorage = multer.memoryStorage();
const uploadMediaToMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-ms-wmv',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: Images and Videos'));
  }
}).array('images', 10);

/**
 * @route   GET /api/projects
 * @desc    Get projects (role-based access)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    let query = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'owner':
        // Owner can see all projects
        break;
      case 'employee':
        // Check if employee is vendorTeam - they are assigned via assignedVendors
        if (req.user.subRole === 'vendorTeam') {
          query.assignedVendors = req.user._id;
        } else if (req.user.subRole === 'designTeam') {
          // DesignTeam can see projects they created OR are assigned to
          query.$or = [
            { createdBy: req.user._id },
            { assignedEmployees: req.user._id }
          ];
        } else {
          // Other employees (executionTeam) can see assigned projects OR created projects
          query.$or = [
            { assignedEmployees: req.user._id },
            { createdBy: req.user._id }
          ];
        }
        break;
      case 'vendor':
        // Vendor can see projects they're assigned to
        query.assignedVendors = req.user._id;
        break;
      case 'client':
        // Client can see only their projects
        query.client = req.user._id;
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
    }

    // Store role-based $or conditions if any
    const roleOrConditions = query.$or;
    delete query.$or;

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Search functionality - combine with role filter using $and if needed
    if (search) {
      const searchConditions = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];

      if (roleOrConditions) {
        // If role filter has $or, combine with $and
        query.$and = [
          { $or: roleOrConditions },
          { $or: searchConditions }
        ];
      } else {
        query.$or = searchConditions;
      }
    } else if (roleOrConditions) {
      // Restore role-based $or if no search
      query.$or = roleOrConditions;
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(query)
      .populate('client', 'firstName lastName email')
      .populate('assignedEmployees', 'firstName lastName email')
      .populate('assignedVendors', 'firstName lastName email vendorDetails.companyName')
      .populate('createdBy', 'firstName lastName email')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get projects',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/timeline/recent
 * @desc    Get recent project timeline updates across all projects
 * @access  Private (Owner only)
 */
router.get('/timeline/recent', authenticate, authorize('owner'), async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '10', 10)));
    const { visibility } = req.query;

    const query = {};
    if (visibility) query.visibility = visibility;

    const events = await ClientTimelineEvent.find(query)
      .populate({ path: 'projectId', select: 'title status priority' })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: { events },
    });
  } catch (error) {
    console.error('Get recent project timeline updates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent project timeline updates',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get project by ID
 * @access  Private (role-based)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('client', 'firstName lastName email phone clientDetails')
      .populate('assignedEmployees', 'firstName lastName email employeeDetails')
      .populate('assignedVendors', 'firstName lastName email vendorDetails')
      .populate('createdBy', 'firstName lastName email')
      .populate('notes.author', 'firstName lastName')
      .populate('documents.uploadedBy', 'firstName lastName')
      .populate('images.uploadedBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'client' && project.client._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.createdBy?._id?.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString())) ||
      (req.user.role === 'employee' && req.user.subRole === 'vendorTeam' && project.assignedVendors.some(vendor => vendor._id.toString() === req.user._id.toString())) ||
      (req.user.role === 'vendor' && project.assignedVendors.some(vendor => vendor._id.toString() === req.user._id.toString()));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this project.',
      });
    }

    res.json({
      success: true,
      data: { project },
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private (Owner only)
 */
router.post('/', authenticate, isOwnerOrEmployee, validateProject, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      title,
      description,
      clientId,
      assignedEmployees = [],
      assignedVendors = [],
      budget,
      timeline,
      location,
      projectType,
      designStyle,
      specifications,
    } = req.body;

    // Verify client exists and has client role
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(400).json({
        success: false,
        message: 'Invalid client ID or user is not a client',
      });
    }

    // Verify assigned employees exist and have employee role
    if (assignedEmployees.length > 0) {
      const employees = await User.find({
        _id: { $in: assignedEmployees },
        role: 'employee',
        isActive: true
      });
      if (employees.length !== assignedEmployees.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned employees are invalid',
        });
      }
    }

    // Verify assigned vendors exist and have vendor role
    if (assignedVendors.length > 0) {
      const vendors = await User.find({
        _id: { $in: assignedVendors },
        role: 'vendor',
        isActive: true
      });
      if (vendors.length !== assignedVendors.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned vendors are invalid',
        });
      }
    }

    const project = new Project({
      title,
      description,
      client: clientId,
      assignedEmployees,
      assignedVendors,
      budget,
      timeline,
      location,
      projectType,
      designStyle,
      specifications,
      createdBy: req.user._id,
    });

    await project.save();

    // Populate the created project
    await project.populate('client assignedEmployees assignedVendors createdBy');
    const io = req.app.get('io');
    if (io) io.emit('projectUpdated', { operation: 'created', project });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/projects/:id
 * @desc    Update project
 * @access  Private (Owner or Employee)
 */
router.put('/:id', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.updatedAt;

    const project = await Project.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('client assignedEmployees assignedVendors createdBy');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }
    const io = req.app.get('io');
    if (io) io.emit('projectUpdated', { operation: 'updated', project });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project (soft delete by changing status)
 * @access  Private (Owner only)
 */
router.delete('/:id', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndUpdate(
      id,
      { status: 'cancelled' },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    res.json({
      success: true,
      message: 'Project cancelled successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel project',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/projects/:id/assign-employee
 * @desc    Assign employee to project
 * @access  Private (Owner or Employee - Designer can assign Executive)
 */
router.put('/:id/assign-employee', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
      });
    }

    // Verify employee exists and has employee role
    const employee = await User.findById(employeeId);
    if (!employee || employee.role !== 'employee' || !employee.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID or employee is not active',
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is already assigned
    if (project.assignedEmployees.includes(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Employee is already assigned to this project',
      });
    }

    project.assignedEmployees.push(employeeId);
    await project.save();
    await project.populate('assignedEmployees', 'firstName lastName email');
    const io = req.app.get('io');
    if (io) io.emit('projectUpdated', { operation: 'employeeAssigned', project });

    // Send notification to the assigned employee (executive)
    try {
      // Check if assigned by a designer (employee with designTeam subRole)
      const isAssignedByDesigner = req.user.role === 'employee' && req.user.subRole === 'designTeam';
      const isAssignedByOwner = req.user.role === 'owner';
      
      if (isAssignedByDesigner || isAssignedByOwner) {
        await NotificationService.notifyExecutiveAddedToProject({
          executiveId: employeeId,
          designerId: req.user._id,
          projectId: project._id,
          projectTitle: project.title,
        });
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }

    res.json({
      success: true,
      message: 'Employee assigned successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Assign employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign employee',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/projects/:id/assign-vendor
 * @desc    Assign vendor to project
 * @access  Private (Owner or Employee - Executive can assign Vendors)
 */
router.put('/:id/assign-vendor', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    // Verify vendor exists and is either a vendor role or vendorTeam employee
    const vendor = await User.findById(vendorId);
    const isVendor = vendor && vendor.role === 'vendor' && vendor.isActive;
    const isVendorTeamEmployee = vendor && vendor.role === 'employee' && vendor.subRole === 'vendorTeam' && vendor.isActive;

    if (!isVendor && !isVendorTeamEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID or vendor is not active',
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if vendor is already assigned
    if (project.assignedVendors.includes(vendorId)) {
      return res.status(400).json({
        success: false,
        message: 'Vendor is already assigned to this project',
      });
    }

    project.assignedVendors.push(vendorId);
    await project.save();
    await project.populate('assignedVendors', 'firstName lastName email vendorDetails.companyName');
    const io = req.app.get('io');
    if (io) io.emit('projectUpdated', { operation: 'vendorAssigned', project });

    res.json({
      success: true,
      message: 'Vendor assigned successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Assign vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign vendor',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/projects/:id/unassign-employee/:employeeId
 * @desc    Remove employee from project
 * @access  Private (Owner or Employee - Designer can remove Executive)
 */
router.delete('/:id/unassign-employee/:employeeId', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { id, employeeId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned
    const employeeIndex = project.assignedEmployees.findIndex(
      emp => emp.toString() === employeeId
    );

    if (employeeIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Employee is not assigned to this project',
      });
    }

    project.assignedEmployees.splice(employeeIndex, 1);
    await project.save();
    await project.populate('assignedEmployees', 'firstName lastName email');

    const io = req.app.get('io');
    if (io) io.emit('projectUpdated', { operation: 'employeeUnassigned', project });

    res.json({
      success: true,
      message: 'Employee removed successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Unassign employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove employee',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/projects/:id/unassign-vendor/:vendorId
 * @desc    Remove vendor from project
 * @access  Private (Owner or Employee - Executive can remove Vendor)
 */
router.delete('/:id/unassign-vendor/:vendorId', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { id, vendorId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if vendor is assigned
    const vendorIndex = project.assignedVendors.findIndex(
      vendor => vendor.toString() === vendorId
    );

    if (vendorIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Vendor is not assigned to this project',
      });
    }

    project.assignedVendors.splice(vendorIndex, 1);
    await project.save();
    await project.populate('assignedVendors', 'firstName lastName email vendorDetails.companyName');

    const io = req.app.get('io');
    if (io) io.emit('projectUpdated', { operation: 'vendorUnassigned', project });

    res.json({
      success: true,
      message: 'Vendor removed successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Unassign vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove vendor',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:id/upload-documents
 * @desc    Upload documents to project
 * @access  Private (Owner, Employee, Client with access)
 */
router.post('/:id/upload-documents', authenticate, uploadMultiple('documents', 3), async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'other' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const project = await Project.findById(id)
      .populate('client assignedEmployees');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'client' && project.client._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString()));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Add documents to project
    const documents = req.files.map(file => ({
      name: file.originalname,
      url: getFileUrl(req, `documents/${file.filename}`),
      type,
      uploadedBy: req.user._id,
    }));

    project.documents.push(...documents);
    await project.save();

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { documents },
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload documents',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:id/upload-images
 * @desc    Upload images to project
 * @access  Private (Owner, Employee with access)
 */
router.post('/:id/upload-images', authenticate, isOwnerOrEmployee, uploadMultiple('images', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'progress' } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const project = await Project.findById(id)
      .populate('assignedEmployees');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee' && !project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project',
      });
    }

    // Add images to project
    const images = req.files.map(file => ({
      name: file.originalname,
      url: getFileUrl(req, `images/${file.filename}`),
      type,
      uploadedBy: req.user._id,
    }));

    project.images.push(...images);
    await project.save();

    res.json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images },
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/projects/:id/progress
 * @desc    Update project progress
 * @access  Private (Owner and Employee with access)
 */
router.put('/:id/progress', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const { percentage, milestones } = req.body;

    if (percentage !== undefined && (percentage < 0 || percentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'Progress percentage must be between 0 and 100',
      });
    }

    const project = await Project.findById(id)
      .populate('assignedEmployees');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee' && !project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project',
      });
    }

    // Update progress
    if (percentage !== undefined) {
      project.progress.percentage = percentage;
    }

    if (milestones) {
      project.progress.milestones = milestones;
    }

    project.progress.lastUpdated = new Date();
    project.progress.updatedBy = req.user._id;

    await project.save();
    await project.populate('progress.updatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Project progress updated successfully',
      data: { project },
    });
  } catch (error) {
    console.error('Update progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update project progress',
      error: error.message,
    });
  }
});

// ===== CLIENT MANAGEMENT EXTENSIONS =====

/**
 * @route   GET /api/projects/client/:clientId
 * @desc    Get all projects for specific client
 * @access  Private (Owner, Employee, Client)
 */
router.get('/client/:clientId', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { client: clientId };

    // Check access permissions
    if (req.user.role === 'client' && req.user._id.toString() !== clientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own projects.',
      });
    }

    if (req.user.role === 'employee') {
      // Employees can only see projects they're assigned to
      query.assignedEmployees = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(query)
      .populate('client', 'firstName lastName email clientDetails')
      .populate('assignedEmployees', 'firstName lastName email')
      .populate('assignedVendors', 'firstName lastName email vendorDetails.companyName')
      .populate('createdBy', 'firstName lastName email')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: {
        projects,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get client projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client projects',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:id/timeline
 * @desc    Add timeline event to project
 * @access  Private (Owner, Employee)
 */
router.post('/:id/timeline', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const { eventType, title, description, attachments = [], visibility = 'public', status = 'in-progress', startDate, endDate } = req.body;

    // Validate required fields
    if (!eventType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: eventType, title, description',
      });
    }

    const project = await Project.findById(id)
      .populate('client');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee' &&
      !project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project',
      });
    }

    const timelineEvent = new ClientTimelineEvent({
      clientId: project.client._id,
      projectId: id,
      eventType,
      title,
      description,
      attachments,
      visibility,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: req.user._id,
    });

    await timelineEvent.save();

    // If this is a milestone event, also sync to project's progress.milestones
    // This ensures the client timeline animation reflects the updates
    if (eventType === 'milestone') {
      // Initialize milestones array if not exists
      if (!project.progress) {
        project.progress = { percentage: 0, milestones: [] };
      }
      if (!project.progress.milestones) {
        project.progress.milestones = [];
      }

      // Check if milestone with same title exists
      const existingIndex = project.progress.milestones.findIndex(
        m => m.name?.toLowerCase() === title.toLowerCase() || m.title?.toLowerCase() === title.toLowerCase()
      );

      const milestoneData = {
        name: title,
        title: title,
        description: description,
        status: status,
        targetDate: endDate ? new Date(endDate) : undefined,
        completedDate: status === 'completed' ? new Date() : undefined,
      };

      if (existingIndex >= 0) {
        // Update existing milestone
        project.progress.milestones[existingIndex] = {
          ...project.progress.milestones[existingIndex],
          ...milestoneData,
        };
      } else {
        // Add new milestone
        project.progress.milestones.push(milestoneData);
      }

      // Update progress percentage based on completed milestones
      const totalMilestones = project.progress.milestones.length;
      const completedMilestones = project.progress.milestones.filter(m => m.status === 'completed').length;
      project.progress.percentage = totalMilestones > 0 
        ? Math.round((completedMilestones / totalMilestones) * 100) 
        : 0;
      project.progress.lastUpdated = new Date();
      project.progress.updatedBy = req.user._id;

      await project.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('projectTimelineUpdated', {
        projectId: id,
        clientId: project.client._id,
        event: timelineEvent,
        projectProgress: project.progress, // Include updated progress
      });
    }

    res.status(201).json({
      success: true,
      message: 'Timeline event added successfully',
      data: { 
        timelineEvent,
        projectProgress: project.progress, // Include updated progress in response
      },
    });
  } catch (error) {
    console.error('Add timeline event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add timeline event',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:id/timeline
 * @desc    Get project timeline
 * @access  Private (Owner, Employee, Client with access)
 */
router.get('/:id/timeline', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      eventType,
      visibility
    } = req.query;

    const project = await Project.findById(id)
      .populate('client');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'client' && project.client._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString()));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      eventType,
      visibility
    };

    const events = await ClientTimelineEvent.getProjectTimeline(id, options);
    const total = await ClientTimelineEvent.countDocuments({ projectId: id });

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get project timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project timeline',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:id/media
 * @desc    Upload project media to GCS
 * @access  Private (Owner, Employee)
 */
router.post('/:id/media', authenticate, isOwnerOrEmployee, (req, res, next) => {
  uploadMediaToMemory(req, res, (err) => {
    if (err) {
      console.error('[Projects] Media upload multer error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { id } = req.params;
    const { description = '', tags = [], category = 'progress', isPublic = true } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const project = await Project.findById(id)
      .populate('client');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee' &&
      !project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project',
      });
    }

    // Upload files to GCS and process
    const mediaFiles = [];
    for (const file of req.files) {
      try {
        const { filename, url } = await uploadToGCS({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname,
          folder: 'project-media',
          projectId: id,
        });

        mediaFiles.push({
          clientId: project.client._id,
          projectId: id,
          filename,
          originalName: file.originalname,
          url,
          type: file.mimetype.startsWith('image/') ? 'image' :
            file.mimetype.startsWith('video/') ? 'video' : 'document',
          mimeType: file.mimetype,
          size: file.size,
          description,
          tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(tag => tag.trim()) : []),
          category,
          isPublic: isPublic === 'true' || isPublic === true,
          uploadedBy: req.user._id,
        });
      } catch (uploadError) {
        console.error('Error uploading file to GCS:', uploadError);
      }
    }

    if (mediaFiles.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload any files to GCS',
      });
    }

    const savedMedia = await ClientMedia.insertMany(mediaFiles);

    const io = req.app.get('io');
    if (io) {
      io.emit('projectMediaUploaded', {
        projectId: id,
        clientId: project.client._id,
        media: savedMedia
      });
    }

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully to GCS',
      data: { media: savedMedia },
    });
  } catch (error) {
    console.error('Upload project media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload project media',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:id/media
 * @desc    Get project media
 * @access  Private (Owner, Employee, Client with access)
 */
router.get('/:id/media', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      category,
      isPublic
    } = req.query;

    const project = await Project.findById(id)
      .populate('client');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'client' && project.client._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString()));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      category,
      isPublic: isPublic !== undefined ? isPublic === 'true' : undefined
    };

    const media = await ClientMedia.getProjectMedia(id, options);

    // Get total count for pagination
    const query = { projectId: id };
    if (type) query.type = type;
    if (category) query.category = category;
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    const total = await ClientMedia.countDocuments(query);

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get project media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project media',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects/:id/invoices
 * @desc    Create project invoice
 * @access  Private (Owner, Employee)
 */
router.post('/:id/invoices', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      lineItems,
      taxRate = 0,
      discountType = 'fixed',
      discountValue = 0,
      currency = 'USD',
      dueDate,
      paymentTerms,
      notes,
      internalNotes
    } = req.body;

    // Validate required fields
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lineItems (array)',
      });
    }

    // Validate line items
    for (const item of lineItems) {
      if (!item.description || !item.unitPrice || !item.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Each line item must have description, unitPrice, and quantity',
        });
      }
    }

    const project = await Project.findById(id)
      .populate('client');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee' &&
      !project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project',
      });
    }

    const invoice = new ClientInvoice({
      clientId: project.client._id,
      projectId: id,
      lineItems,
      taxRate,
      discountType,
      discountValue,
      currency,
      dueDate: new Date(dueDate),
      paymentTerms,
      notes,
      internalNotes,
      createdBy: req.user._id,
    });

    await invoice.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('projectInvoiceCreated', {
        projectId: id,
        clientId: project.client._id,
        invoice
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: { invoice },
    });
  } catch (error) {
    console.error('Create project invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project invoice',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:id/invoices
 * @desc    Get project invoices
 * @access  Private (Owner, Employee, Client with access)
 */
router.get('/:id/invoices', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const project = await Project.findById(id)
      .populate('client');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'client' && project.client._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.assignedEmployees.some(emp => emp._id.toString() === req.user._id.toString()));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    let query = { projectId: id };
    if (status) query.status = status;

    const invoices = await ClientInvoice.find(query)
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ClientInvoice.countDocuments(query);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get project invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project invoices',
      error: error.message,
    });
  }
});

module.exports = router;
