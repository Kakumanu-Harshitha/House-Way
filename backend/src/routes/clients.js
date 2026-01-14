const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Project = require('../models/Project');
const ClientTimelineEvent = require('../models/ClientTimelineEvent');
const ClientMedia = require('../models/ClientMedia');
const ClientInvoice = require('../models/ClientInvoice');
const { authenticate, authorize, isOwnerOrEmployee } = require('../middleware/auth');
const { uploadMultiple, getFileUrl } = require('../middleware/upload');

/**
 * @route   GET /api/clients
 * @desc    Get all clients with filtering and search
 * @access  Private (Owner, Employee)
 */
router.get('/', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { role: 'client', isActive: true };

    // Filter by client status
    if (status) {
      query['clientDetails.clientStatus'] = status;
    }

    // Filter by priority level
    if (priority) {
      query['clientDetails.priorityLevel'] = priority;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'clientDetails.tags': { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filter by tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      query['clientDetails.tags'] = { $in: tagArray };
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const clients = await User.find(query)
      .select('-password')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        clients,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get clients',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/:id
 * @desc    Get client profile with project summary
 * @access  Private (Owner, Employee)
 */
router.get('/:id', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;

    const client = await User.findById(id)
      .select('-password')
      .populate('createdBy', 'firstName lastName email');

    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Get client's projects summary
    const projects = await Project.find({ client: id })
      .select('projectId title status progress createdAt updatedAt budget')
      .sort({ createdAt: -1 });

    const projectStats = {
      total: projects.length,
      active: projects.filter(p => p.status === 'in-progress').length,
      completed: projects.filter(p => p.status === 'completed').length,
      planning: projects.filter(p => p.status === 'planning').length,
      onHold: projects.filter(p => p.status === 'on-hold').length,
      totalBudget: projects.reduce((sum, p) => sum + (p.budget?.estimated || 0), 0)
    };

    // Get recent timeline events
    const recentEvents = await ClientTimelineEvent.getClientTimeline(id, { limit: 5 });

    // Get recent media
    const recentMedia = await ClientMedia.getClientMedia(id, { limit: 6 });

    // Get invoice summary
    const invoiceStats = await ClientInvoice.getInvoiceStats(id);

    res.json({
      success: true,
      data: {
        client,
        projects: {
          list: projects,
          stats: projectStats
        },
        recentEvents,
        recentMedia,
        invoiceStats
      },
    });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/:id/projects
 * @desc    Get client's projects
 * @access  Private (Owner, Employee)
 */
router.get('/:id/projects', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { client: id };

    if (status) {
      query.status = status;
    }

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(query)
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
 * @route   PUT /api/clients/:id
 * @desc    Update client details and status
 * @access  Private (Owner, Employee)
 */
router.put('/:id', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow role change through this endpoint
    delete updates.role;
    delete updates.password;

    const client = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('clientUpdated', { operation: 'updated', client });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { client },
    });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update client',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/clients/:id/timeline
 * @desc    Add timeline event for client
 * @access  Private (Owner, Employee)
 */
router.post('/:id/timeline', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, eventType, title, description, attachments = [], visibility = 'public' } = req.body;

    // Validate required fields
    if (!projectId || !eventType || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, eventType, title, description',
      });
    }

    // Verify client exists
    const client = await User.findById(id);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Verify project exists and belongs to client
    const project = await Project.findById(projectId);
    if (!project || project.client.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID or project does not belong to this client',
      });
    }

    const timelineEvent = new ClientTimelineEvent({
      clientId: id,
      projectId,
      eventType,
      title,
      description,
      attachments,
      visibility,
      createdBy: req.user._id,
    });

    await timelineEvent.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('timelineEventAdded', {
        clientId: id,
        projectId,
        event: timelineEvent
      });
    }

    res.status(201).json({
      success: true,
      message: 'Timeline event added successfully',
      data: { timelineEvent },
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
 * @route   GET /api/clients/:id/timeline
 * @desc    Get client timeline events
 * @access  Private (Owner, Employee)
 */
router.get('/:id/timeline', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      eventType,
      visibility,
      projectId
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      eventType,
      visibility
    };

    // If projectId specified, get project timeline instead
    if (projectId) {
      const events = await ClientTimelineEvent.getProjectTimeline(projectId, options);
      const total = await ClientTimelineEvent.countDocuments({ projectId });

      return res.json({
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
    }

    const events = await ClientTimelineEvent.getClientTimeline(id, options);
    const total = await ClientTimelineEvent.countDocuments({ clientId: id });

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
    console.error('Get timeline events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get timeline events',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/clients/:id/media
 * @desc    Upload client media
 * @access  Private (Owner, Employee)
 */
router.post('/:id/media', authenticate, isOwnerOrEmployee, uploadMultiple('client-media', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const { projectId, description = '', tags = [], category = 'other', isPublic = true } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    // Verify client exists
    const client = await User.findById(id);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Verify project exists and belongs to client (if projectId provided)
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project || project.client.toString() !== id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project ID or project does not belong to this client',
        });
      }
    }

    // Process uploaded files
    const mediaFiles = req.files.map(file => {
      const url = getFileUrl(req, `client-media/${file.filename}`);
      return {
        clientId: id,
        projectId: projectId || null,
        filename: file.filename,
        originalName: file.originalname,
        url,
        type: file.mimetype.startsWith('image/') ? 'image' :
          file.mimetype.startsWith('video/') ? 'video' : 'document',
        mimeType: file.mimetype,
        size: file.size,
        description,
        tags: Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()),
        category,
        isPublic: isPublic === 'true',
        uploadedBy: req.user._id,
        // Add dimensions for images if available
        dimensions: file.mimetype.startsWith('image/') ? {
          width: file.width || null,
          height: file.height || null
        } : undefined
      };
    });

    const savedMedia = await ClientMedia.insertMany(mediaFiles);

    const io = req.app.get('io');
    if (io) {
      io.emit('clientMediaUploaded', {
        clientId: id,
        projectId,
        media: savedMedia
      });
    }

    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      data: { media: savedMedia },
    });
  } catch (error) {
    console.error('Upload media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload media',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/:id/media
 * @desc    Get client media gallery
 * @access  Private (Owner, Employee)
 */
router.get('/:id/media', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      category,
      tags,
      isPublic,
      projectId
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      category,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : undefined,
      isPublic: isPublic !== undefined ? isPublic === 'true' : undefined
    };

    let result;
    if (projectId) {
      result = await ClientMedia.getProjectMedia(projectId, options);
    } else {
      result = await ClientMedia.getClientMedia(id, options);
    }

    // Get total count for pagination
    const query = projectId ? { projectId } : { clientId: id };
    if (type) query.type = type;
    if (category) query.category = category;
    if (tags) query.tags = { $in: Array.isArray(tags) ? tags : tags.split(',') };
    if (isPublic !== undefined) query.isPublic = isPublic === 'true';

    const total = await ClientMedia.countDocuments(query);

    res.json({
      success: true,
      data: {
        media: result,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get client media error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client media',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/clients/:id/invoices
 * @desc    Create client invoice
 * @access  Private (Owner, Employee)
 */
router.post('/:id/invoices', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      projectId,
      lineItems,
      taxRate = 0,
      discountType = 'fixed',
      discountValue = 0,
      currency = 'USD',
      dueDate,
      paymentTerms,
      notes,
      internalNotes,
      attachments = []
    } = req.body;

    // Validate required fields
    if (!projectId || !lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, lineItems (array)',
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

    // Verify client exists
    const client = await User.findById(id);
    if (!client || client.role !== 'client') {
      return res.status(404).json({
        success: false,
        message: 'Client not found',
      });
    }

    // Verify project exists and belongs to client
    const project = await Project.findById(projectId);
    if (!project || project.client.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID or project does not belong to this client',
      });
    }

    const invoice = new ClientInvoice({
      clientId: id,
      projectId,
      lineItems,
      taxRate,
      discountType,
      discountValue,
      currency,
      dueDate: new Date(dueDate),
      paymentTerms,
      notes,
      internalNotes,
      // allow image/PDF attachments (uploaded separately via /api/files/upload)
      attachments: Array.isArray(attachments) ? attachments : [],
      createdBy: req.user._id,
    });

    await invoice.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('invoiceCreated', {
        clientId: id,
        projectId,
        invoice
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: { invoice },
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/:id/invoices
 * @desc    Get client invoices
 * @access  Private (Owner, Employee)
 */
router.get('/:id/invoices', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    };

    const invoices = await ClientInvoice.getClientInvoices(id, options);

    // Get total count for pagination
    const query = { clientId: id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

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
    console.error('Get client invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get client invoices',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/:id/projects/:projectId/invoices
 * @desc    Get invoices for a specific client project (client can view their own)
 * @access  Private (Client self, Owner, Employee)
 */
router.get('/:id/projects/:projectId/invoices', authenticate, async (req, res) => {
  try {
    const { id, projectId } = req.params;
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Role-based access: clients can only see their own invoices
    const isClient = req.user.role === 'client';
    if (isClient && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own project invoices',
      });
    }

    // For non-clients, require owner/employee permissions
    if (!isClient && req.user.role !== 'owner' && req.user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view project invoices',
      });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      startDate,
      endDate,
      sortBy,
      sortOrder: sortOrder === 'desc' ? -1 : 1
    };

    const query = { clientId: id, projectId };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await ClientInvoice.find(query)
      .sort({ [sortBy]: options.sortOrder })
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

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

/**
 * @route   GET /api/clients/dashboard/stats
 * @desc    Get client management dashboard statistics
 * @access  Private (Owner, Employee)
 */
router.get('/dashboard/stats', authenticate, isOwnerOrEmployee, async (req, res) => {
  try {
    // Get overall client statistics
    const totalClients = await User.countDocuments({ role: 'client', isActive: true });

    const clientsByStatus = await User.aggregate([
      { $match: { role: 'client', isActive: true } },
      { $group: { _id: '$clientDetails.clientStatus', count: { $sum: 1 } } }
    ]);

    const clientsByPriority = await User.aggregate([
      { $match: { role: 'client', isActive: true } },
      { $group: { _id: '$clientDetails.priorityLevel', count: { $sum: 1 } } }
    ]);

    // Get project statistics
    const totalProjects = await Project.countDocuments();
    const projectsByStatus = await Project.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get recent activity counts
    const recentTimelineEvents = await ClientTimelineEvent.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    const recentMediaUploads = await ClientMedia.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const recentInvoices = await ClientInvoice.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Get financial summary
    const invoiceStats = await ClientInvoice.getInvoiceStats();

    res.json({
      success: true,
      data: {
        clients: {
          total: totalClients,
          byStatus: clientsByStatus,
          byPriority: clientsByPriority
        },
        projects: {
          total: totalProjects,
          byStatus: projectsByStatus
        },
        recentActivity: {
          timelineEvents: recentTimelineEvents,
          mediaUploads: recentMediaUploads,
          invoices: recentInvoices
        },
        financial: invoiceStats
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message,
    });
  }
});

// ===============================================
// CLIENT SELF-SERVICE ENDPOINTS
// These endpoints allow clients to access their own data
// ===============================================

/**
 * @route   GET /api/clients/me/projects
 * @desc    Get logged-in client's assigned projects
 * @access  Private (Client only)
 */
router.get('/me/projects', authenticate, async (req, res) => {
  try {
    // Verify user is a client
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only accessible to clients',
      });
    }

    const {
      page = 1,
      limit = 50,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = { client: req.user._id };

    if (status) {
      query.status = status;
    }

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const projects = await Project.find(query)
      .populate('assignedEmployees', 'firstName lastName email')
      .populate('assignedVendors', 'firstName lastName email vendorDetails.companyName')
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
      message: 'Failed to get projects',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/me/projects/:projectId
 * @desc    Get full project details for the logged-in client
 * @access  Private (Client only)
 */
router.get('/me/projects/:projectId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only accessible to clients',
      });
    }

    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate('client', 'firstName lastName email phone')
      .populate('assignedEmployees', 'firstName lastName email employeeDetails')
      .populate('assignedVendors', 'firstName lastName email vendorDetails')
      .populate('createdBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Verify project belongs to the client
    if (project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This project does not belong to you.',
      });
    }

    // Get related data
    const [media, invoices, timelineEvents] = await Promise.all([
      ClientMedia.getProjectMedia(projectId, { limit: 50 }),
      ClientInvoice.find({ projectId }).sort({ createdAt: -1 }),
      ClientTimelineEvent.getProjectTimeline(projectId, { limit: 20 })
    ]);

    res.json({
      success: true,
      data: {
        project,
        media,
        invoices,
        timelineEvents,
        paymentSchedule: project.paymentSchedule || [],
        documents: project.documents || [],
      },
    });
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project details',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/clients/me/projects/:projectId/media
 * @desc    Get project media for the logged-in client
 * @access  Private (Client only)
 */
router.get('/me/projects/:projectId/media', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only accessible to clients',
      });
    }

    const { projectId } = req.params;
    const { page = 1, limit = 50, type, category } = req.query;

    // Verify project belongs to client
    const project = await Project.findById(projectId);
    if (!project || project.client.toString() !== req.user._id.toString()) {
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
      isPublic: true // Clients only see public media
    };

    const media = await ClientMedia.getProjectMedia(projectId, options);
    const total = await ClientMedia.countDocuments({ projectId, isPublic: true });

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
 * @route   GET /api/clients/me/projects/:projectId/documents
 * @desc    Get project documents for the logged-in client
 * @access  Private (Client only)
 */
router.get('/me/projects/:projectId/documents', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only accessible to clients',
      });
    }

    const { projectId } = req.params;

    // Verify project belongs to client
    const project = await Project.findById(projectId);
    if (!project || project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Return documents from the project
    res.json({
      success: true,
      data: {
        documents: project.documents || [],
      },
    });
  } catch (error) {
    console.error('Get project documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project documents',
      error: error.message,
    });
  }
});

module.exports = router;