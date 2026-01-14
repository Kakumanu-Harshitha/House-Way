const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const MaterialRequest = require('../models/MaterialRequest');
const Project = require('../models/Project');
const PurchaseOrder = require('../models/PurchaseOrder');
const User = require('../models/User');
const { authenticate, authorize, isOwner, isOwnerOrEmployee } = require('../middleware/auth');
const { validateMaterialRequest } = require('../middleware/validation');
const NotificationService = require('../utils/notificationService');

/**
 * @route   GET /api/material-requests
 * @desc    Get material requests (role-based access)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, sortBy = 'createdAt', sortOrder = 'desc', available } = req.query;

    let query = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'owner':
        // Owner can see all material requests
        break;
      case 'employee':
        // VendorTeam employees should see requests they created + assigned + available
        if (req.user.subRole === 'vendorTeam') {
          if (available === 'true') {
            // Show unassigned/pending requests
            query.assignedVendors = { $size: 0 };
            query.status = { $in: ['pending', 'approved'] };
          } else {
            // Show requests created by OR assigned to this vendor team employee
            query.$or = [
              { requestedBy: req.user._id },
              { 'assignedVendors.vendor': req.user._id }
            ];
          }
        } else {
          // Other employees (designTeam, executionTeam) see requests for their assigned projects
          const employeeProjects = await Project.find({
            $or: [
              { assignedEmployees: req.user._id },
              { createdBy: req.user._id }
            ]
          }).select('_id');
          query.project = { $in: employeeProjects.map(p => p._id) };
        }
        break;
      case 'vendor':
        // If 'available' flag is set, show unassigned/pending requests
        // Otherwise show only requests assigned to this vendor
        if (available === 'true') {
          // Available means not assigned to anyone yet
          query.assignedVendors = { $size: 0 };
          query.status = { $in: ['pending', 'approved'] }; // Only show pending/approved
        } else {
          query['assignedVendors.vendor'] = req.user._id;
        }
        break;
      case 'client':
        // Client can see requests for their projects
        const clientProjects = await Project.find({ client: req.user._id }).select('_id');
        query.project = { $in: clientProjects.map(p => p._id) };
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
    }

    // Filter by status if provided
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by project if provided
    if (projectId) {
      query.project = projectId;
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const materialRequests = await MaterialRequest.find(query)
      .populate('project', 'title status')
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedVendors.vendor', 'firstName lastName email vendorDetails.companyName')
      .populate('assignedVendors.assignedBy', 'firstName lastName')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MaterialRequest.countDocuments(query);

    res.json({
      success: true,
      data: {
        materialRequests,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get material requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get material requests',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/material-requests/:id
 * @desc    Get material request by ID
 * @access  Private (role-based)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const materialRequest = await MaterialRequest.findById(id)
      .populate('project', 'title status client assignedEmployees assignedVendors')
      .populate('requestedBy', 'firstName lastName email')
      .populate('assignedVendors.vendor', 'firstName lastName email vendorDetails')
      .populate('assignedVendors.assignedBy', 'firstName lastName')
      .populate('approvals.approvedBy', 'firstName lastName')
      .populate('notes.author', 'firstName lastName');

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'employee' && materialRequest.project.assignedEmployees.includes(req.user._id)) ||
      (req.user.role === 'vendor' && materialRequest.assignedVendors.some(av => av.vendor._id.toString() === req.user._id.toString())) ||
      (req.user.role === 'client' && materialRequest.project.client.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this material request.',
      });
    }

    res.json({
      success: true,
      data: { materialRequest },
    });
  } catch (error) {
    console.error('Get material request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get material request',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/material-requests
 * @desc    Create new material request
 * @access  Private (Owner and Employee only)
 */
router.post('/', authenticate, isOwnerOrEmployee, validateMaterialRequest, async (req, res) => {
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
      projectId,
      title,
      description,
      materials,
      priority,
      requiredBy,
      assignedVendors,
    } = req.body;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee') {
      const isAssignedEmployee = project.assignedEmployees.includes(req.user._id);
      const isAssignedVendor = project.assignedVendors.includes(req.user._id);
      const isCreator = project.createdBy?.toString() === req.user._id.toString();

      if (!isAssignedEmployee && !isAssignedVendor && !isCreator) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this project',
        });
      }
    }

    // Optional: assign one or more vendors at creation time
    // (Used by vendorTeam employees to target a vendor directly)
    let normalizedAssignedVendors = [];
    if (Array.isArray(assignedVendors) && assignedVendors.length > 0) {
      const vendorIds = assignedVendors
        .map((av) => (typeof av === 'string' ? av : av?.vendor))
        .filter(Boolean);

      // Deduplicate
      const uniqueVendorIds = [...new Set(vendorIds.map(String))];

      const vendors = await User.find({
        _id: { $in: uniqueVendorIds },
        role: 'vendor',
        isActive: true,
      }).select('_id');

      const foundVendorIds = new Set(vendors.map((v) => v._id.toString()));
      const invalidVendorIds = uniqueVendorIds.filter((id) => !foundVendorIds.has(String(id)));

      if (invalidVendorIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned vendors are invalid',
          data: { invalidVendorIds },
        });
      }

      normalizedAssignedVendors = uniqueVendorIds.map((vendorId) => ({
        vendor: vendorId,
        assignedAt: new Date(),
        assignedBy: req.user._id,
      }));
    }

    const materialRequest = new MaterialRequest({
      project: projectId,
      requestedBy: req.user._id,
      title,
      description,
      materials,
      priority,
      requiredBy,
      assignedVendors: normalizedAssignedVendors,
    });

    await materialRequest.save();

    // Populate the created material request
    await materialRequest.populate('project requestedBy assignedVendors.vendor assignedVendors.assignedBy');

    // Send notifications to assigned vendors
    if (normalizedAssignedVendors.length > 0) {
      try {
        const notificationPromises = normalizedAssignedVendors.map((av) =>
          NotificationService.notifyVendorAssignedToProject({
            vendorId: av.vendor,
            executiveId: req.user._id,
            projectId: projectId,
            projectTitle: project.title,
            materialRequestTitle: title,
            materialRequestId: materialRequest._id,
          })
        );
        await Promise.all(notificationPromises);
      } catch (notifError) {
        console.error('Failed to send vendor notifications:', notifError);
        // Don't fail the request if notification fails
      }
    }

    // Emit socket event for new creation
    const io = req.app.get('io');
    if (io) io.emit('materialRequest', { operation: 'created', materialRequest });

    res.status(201).json({
      success: true,
      message: 'Material request created successfully',
      data: { materialRequest },
    });
  } catch (error) {
    console.error('Create material request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create material request',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/material-requests/:id/approve
 * @desc    Approve material request
 * @access  Private (Owner only)
 */
router.put('/:id/approve', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;

    const materialRequest = await MaterialRequest.findById(id);
    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
      });
    }

    if (materialRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be approved',
      });
    }

    await materialRequest.approve(req.user._id, comments);
    await materialRequest.populate('project requestedBy approvals.approvedBy');

    // Emit socket event for approval
    const io = req.app.get('io');
    if (io) io.emit('materialRequest', { operation: 'approved', materialRequest });

    res.json({
      success: true,
      message: 'Material request approved successfully',
      data: { materialRequest },
    });
  } catch (error) {
    console.error('Approve material request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve material request',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/material-requests/:id/reject
 * @desc    Reject material request
 * @access  Private (Owner only)
 */
router.put('/:id/reject', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { comments = '' } = req.body;

    const materialRequest = await MaterialRequest.findById(id);
    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
      });
    }

    if (materialRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending requests can be rejected',
      });
    }

    await materialRequest.reject(req.user._id, comments);
    await materialRequest.populate('project requestedBy approvals.approvedBy');

    // Emit socket event for rejection
    const io = req.app.get('io');
    if (io) io.emit('materialRequest', { operation: 'rejected', materialRequest });

    res.json({
      success: true,
      message: 'Material request rejected successfully',
      data: { materialRequest },
    });
  } catch (error) {
    console.error('Reject material request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject material request',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/material-requests/:id/accept
 * @desc    Vendor accepts material request (self-assign)
 * @access  Private (Vendor only)
 */
router.post('/:id/accept', authenticate, authorize('vendor'), async (req, res) => {
  try {
    const { id } = req.params;

    const materialRequest = await MaterialRequest.findById(id)
      .populate('project', 'title status');

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
      });
    }

    // Check if request is in valid status
    if (!['pending', 'approved'].includes(materialRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or approved requests can be accepted',
      });
    }

    // Check if vendor is already assigned
    const isAlreadyAssigned = materialRequest.assignedVendors.some(
      av => av.vendor.toString() === req.user._id.toString()
    );

    // If another vendor is already assigned, do not allow accepting
    if (!isAlreadyAssigned && materialRequest.assignedVendors.length > 0) {
      return res.status(403).json({
        success: false,
        message: 'This material request is already assigned to another vendor',
      });
    }

    if (isAlreadyAssigned) {
      // Check if PO exists for this vendor and material request
      const existingPO = await PurchaseOrder.findOne({
        materialRequest: materialRequest._id,
        vendor: req.user._id
      });

      if (existingPO) {
        return res.status(400).json({
          success: false,
          message: 'You have already accepted this material request',
          data: {
            materialRequest,
            purchaseOrder: existingPO
          }
        });
      }
      
      // If no PO exists, allow creating one (recovery from previous errors)
      console.log('[MaterialRequests] Vendor already assigned but no PO found, creating PO...');
    } else {
      // Assign vendor (self-assign) only if not already assigned
      materialRequest.assignedVendors.push({
        vendor: req.user._id,
        assignedAt: new Date(),
        assignedBy: req.user._id, // Self-assigned
      });

      await materialRequest.save();
      await materialRequest.populate('assignedVendors.vendor', 'firstName lastName email vendorDetails.companyName');
    }

    // Create Purchase Order for negotiation
    const poNumber = `PO-${Date.now().toString().slice(-8)}`;
    
    // Transform materials from MaterialRequest format to PurchaseOrder items format
    const poItems = (materialRequest.materials || []).map(material => ({
      materialName: material.name,
      description: material.description || '',
      quantity: material.quantity,
      unit: material.unit,
      unitPrice: 0, // Will be filled during negotiation
      totalPrice: 0, // Will be filled during negotiation
      deliveryStatus: 'pending',
      deliveredQuantity: 0,
    }));
    
    const purchaseOrder = await PurchaseOrder.create({
      purchaseOrderNumber: poNumber,
      project: materialRequest.project._id,
      materialRequest: materialRequest._id,
      vendor: req.user._id,
      createdBy: req.user._id, // Vendor creates the PO when accepting
      title: `Purchase Order for ${materialRequest.title}`,
      description: materialRequest.description || '',
      items: poItems,
      status: 'sent', // Set to 'sent' so vendor can start negotiation immediately
      negotiation: {
        isActive: true,
        startedAt: new Date(),
      },
    });

    await purchaseOrder.populate('vendor', 'firstName lastName email vendorDetails.companyName');

    // Emit socket event for vendor acceptance
    const io = req.app.get('io');
    if (io) {
      io.emit('materialRequest', { operation: 'vendorAccepted', materialRequest });
      io.emit('purchaseOrderCreated', { purchaseOrder });
    }

    res.json({
      success: true,
      message: 'Material request accepted successfully. Purchase Order created for negotiation.',
      data: { 
        materialRequest,
        purchaseOrder,
      },
    });
  } catch (error) {
    console.error('Accept material request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept material request',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/material-requests/:id/assign-vendor
 * @desc    Assign vendor to material request
 * @access  Private (Owner only)
 */
router.put('/:id/assign-vendor', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required',
      });
    }

    const materialRequest = await MaterialRequest.findById(id);
    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
      });
    }

    await materialRequest.assignVendor(vendorId, req.user._id);
    await materialRequest.populate('assignedVendors.vendor assignedVendors.assignedBy');

    // Emit socket event for vendor assignment
    const io = req.app.get('io');
    if (io) io.emit('materialRequest', { operation: 'vendorAssigned', materialRequest });

    res.json({
      success: true,
      message: 'Vendor assigned successfully',
      data: { materialRequest },
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
 * @route   POST /api/material-requests/:id/notes
 * @desc    Add note to material request
 * @access  Private (Owner, Employee, Vendor with access)
 */
router.post('/:id/notes', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required',
      });
    }

    const materialRequest = await MaterialRequest.findById(id)
      .populate('project', 'assignedEmployees assignedVendors client');

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'employee' && materialRequest.project.assignedEmployees.includes(req.user._id)) ||
      (req.user.role === 'vendor' && materialRequest.assignedVendors.some(av => av.vendor.toString() === req.user._id.toString())) ||
      (req.user.role === 'client' && materialRequest.project.client.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await materialRequest.addNote(content.trim(), req.user._id);
    await materialRequest.populate('notes.author', 'firstName lastName');

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { materialRequest },
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/material-requests/project/:projectId
 * @desc    Get material requests for a specific project
 * @access  Private (role-based)
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'client' && project.client.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && project.assignedEmployees.includes(req.user._id)) ||
      (req.user.role === 'vendor' && project.assignedVendors.includes(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const materialRequests = await MaterialRequest.findByProject(projectId);

    res.json({
      success: true,
      data: { materialRequests },
    });
  } catch (error) {
    console.error('Get project material requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project material requests',
      error: error.message,
    });
  }
});

module.exports = router;
