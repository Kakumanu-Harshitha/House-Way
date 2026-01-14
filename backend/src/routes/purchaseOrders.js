const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const PurchaseOrder = require('../models/PurchaseOrder');
const NegotiationMessage = require('../models/NegotiationMessage');
const VendorInvoice = require('../models/VendorInvoice');
const Quotation = require('../models/Quotation');
const Project = require('../models/Project');
const { authenticate, authorize, isOwner } = require('../middleware/auth');

const canAccessPurchaseOrder = async (purchaseOrder, user) => {
  if (!purchaseOrder || !user) return false;
  if (user.role === 'owner') return true;
  if (user.role === 'vendor') return purchaseOrder.vendor.toString() === user._id.toString();
  if (user.role === 'employee') {
    const project = await Project.findById(purchaseOrder.project).select('assignedEmployees');
    return project?.assignedEmployees?.some((id) => id.toString() === user._id.toString());
  }
  if (user.role === 'client') {
    const project = await Project.findById(purchaseOrder.project).select('client');
    return project?.client?.toString() === user._id.toString();
  }
  return false;
};

const toSocketPayload = (messageDoc, orderId) => {
  const obj = messageDoc.toObject ? messageDoc.toObject() : { ...messageDoc };
  obj.order = orderId;
  return obj;
};

/**
 * @route   GET /api/purchase-orders
 * @desc    Get purchase orders (role-based access)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, projectId, vendorId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    let query = {};

    // Role-based filtering
    switch (req.user.role) {
      case 'owner':
        // Owner can see all purchase orders
        break;
      case 'vendor':
        // Vendor can see only their purchase orders
        query.vendor = req.user._id;
        break;
      case 'employee':
        // Employee can see purchase orders for projects they're assigned to
        const employeeProjects = await Project.find({ assignedEmployees: req.user._id }).select('_id');
        query.project = { $in: employeeProjects.map(p => p._id) };
        break;
      case 'client':
        // Client can see purchase orders for their projects
        const clientProjects = await Project.find({ client: req.user._id }).select('_id');
        query.project = { $in: clientProjects.map(p => p._id) };
        break;
      default:
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
    }

    // Additional filters
    if (status) query.status = status;
    if (projectId) query.project = projectId;
    if (vendorId) query.vendor = vendorId;

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('quotation', 'quotationNumber title')
      .populate('materialRequest', 'title')
      .populate('project', 'title status')
      .populate('vendor', 'firstName lastName email vendorDetails.companyName')
      .populate('createdBy', 'firstName lastName')
      .sort(sortConfig)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchaseOrders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchase orders',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/purchase-orders/unread-count
 * @desc    Get unread message count for current user (across all orders)
 * @access  Private
 */
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    // Limit to orders current user can see
    let orderQuery = {};
    if (req.user.role === 'vendor') {
      orderQuery.vendor = req.user._id;
    }

    const orderIds = await PurchaseOrder.find(orderQuery).distinct('_id');
    const unread = await NegotiationMessage.countDocuments({
      purchaseOrder: { $in: orderIds },
      readBy: { $not: { $elemMatch: { user: req.user._id } } },
    });

    res.json({ success: true, data: { unread } });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count', error: error.message });
  }
});

/**
 * @route   GET /api/purchase-orders/delivery-overview
 * @desc    Get delivery tracking overview (Owner)
 * @access  Private (Owner)
 */
router.get('/delivery-overview', authenticate, isOwner, async (req, res) => {
  try {
    const orders = await PurchaseOrder.find({
      status: { $in: ['accepted', 'in_progress', 'acknowledged', 'partially_delivered', 'completed'] },
    })
      .populate('project', 'title')
      .populate('vendor', 'firstName lastName email vendorDetails.companyName')
      .sort({ 'deliveryTracking.updatedAt': -1, updatedAt: -1 })
      .limit(200);

    // Separate into active and delivered for frontend
    const activeDeliveries = orders.filter(o => 
      o.deliveryTracking?.status !== 'delivered' && o.status !== 'completed'
    );
    const delivered = orders.filter(o => 
      o.deliveryTracking?.status === 'delivered' || o.status === 'completed'
    );

    res.json({ 
      success: true, 
      data: { 
        activeDeliveries, 
        delivered,
        total: orders.length 
      } 
    });
  } catch (error) {
    console.error('Delivery overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to get delivery overview', error: error.message });
  }
});

/**
 * @route   GET /api/purchase-orders/:id/messages
 * @desc    Get negotiation messages for an order
 * @access  Private (Owner/Vendor)
 */
router.get('/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrder.findById(id);

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const hasAccess = await canAccessPurchaseOrder(purchaseOrder, req.user);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const messages = await NegotiationMessage.getOrderMessages(id);
    res.json({ success: true, data: messages.map((m) => toSocketPayload(m, id)) });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Failed to get messages', error: error.message });
  }
});

/**
 * @route   POST /api/purchase-orders/:id/messages
 * @desc    Send a negotiation message (text/system)
 * @access  Private (Owner/Vendor)
 */
router.post('/:id/messages', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, messageType = 'text' } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const hasAccess = await canAccessPurchaseOrder(purchaseOrder, req.user);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if chat is closed
    if (purchaseOrder.negotiation?.chatClosed) {
      return res.status(400).json({ 
        success: false, 
        message: 'This negotiation has ended. No new messages can be sent.' 
      });
    }

    if (messageType === 'text' && (!content || !String(content).trim())) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const message = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: req.user.role,
      messageType,
      content: content ? String(content).trim() : '',
    });

    purchaseOrder.negotiation = purchaseOrder.negotiation || {};
    purchaseOrder.negotiation.lastMessageAt = new Date();
    await purchaseOrder.save();

    const populated = await NegotiationMessage.findById(message._id).populate('sender', 'firstName lastName email role');

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populated, id));
    }

    res.status(201).json({ success: true, data: toSocketPayload(populated, id) });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message', error: error.message });
  }
});

/**
 * @route   PUT /api/purchase-orders/:id/mark-read
 * @desc    Mark all messages in an order as read
 * @access  Private
 */
router.put('/:id/mark-read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const hasAccess = await canAccessPurchaseOrder(purchaseOrder, req.user);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await NegotiationMessage.updateMany(
      {
        purchaseOrder: id,
        readBy: { $not: { $elemMatch: { user: req.user._id } } },
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } },
      }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark messages as read', error: error.message });
  }
});

/**
 * @route   POST /api/purchase-orders/:id/quotation
 * @desc    Vendor submits a quotation message
 * @access  Private (Vendor)
 */
router.post('/:id/quotation', authenticate, authorize('vendor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, currency = 'INR', note = '', items = [], validUntil = null, inResponseTo = null } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (purchaseOrder.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only quote on your own purchase orders' });
    }

    // Check if chat is closed
    if (purchaseOrder.negotiation?.chatClosed) {
      return res.status(400).json({ 
        success: false, 
        message: 'This negotiation has ended. No new quotations can be submitted.' 
      });
    }

    // Check if order is already accepted - block new quotations
    if (purchaseOrder.status === 'accepted' || purchaseOrder.negotiation?.acceptedQuotationMessage) {
      return res.status(400).json({ 
        success: false, 
        message: 'A quotation has already been accepted. No new quotations can be submitted.' 
      });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid quotation amount is required' });
    }

    const quotationMessage = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: 'vendor',
      messageType: 'quotation',
      content: note ? String(note).trim() : '',
      quotation: {
        amount,
        currency,
        note: note ? String(note).trim() : '',
        status: 'pending',
        items: Array.isArray(items) ? items : [],
        validUntil: validUntil ? new Date(validUntil) : null,
        inResponseTo: inResponseTo || null,
      },
    });

    purchaseOrder.status = purchaseOrder.status === 'draft' ? 'sent' : purchaseOrder.status;
    if (purchaseOrder.status === 'sent' || purchaseOrder.status === 'acknowledged') {
      purchaseOrder.status = 'in_negotiation';
    }
    purchaseOrder.negotiation = purchaseOrder.negotiation || {};
    purchaseOrder.negotiation.lastMessageAt = new Date();
    await purchaseOrder.save();

    const populated = await NegotiationMessage.findById(quotationMessage._id).populate('sender', 'firstName lastName email role');

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('quotationSubmitted', { orderId: id, messageId: quotationMessage._id });
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populated, id));
      io.to(`order_${id}`).emit('orderUpdated', { orderId: id, status: purchaseOrder.status });
    }

    res.status(201).json({ success: true, message: 'Quotation submitted', data: toSocketPayload(populated, id) });
  } catch (error) {
    console.error('Submit quotation error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit quotation', error: error.message });
  }
});

/**
 * @route   PUT /api/purchase-orders/:id/quotation/:messageId/accept
 * @desc    Owner accepts a quotation, generates invoice, closes chat
 * @access  Private (Owner)
 */
router.put('/:id/quotation/:messageId/accept', authenticate, isOwner, async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const purchaseOrder = await PurchaseOrder.findById(id).populate('project', 'title');
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const quotationMessage = await NegotiationMessage.findOne({
      _id: messageId,
      purchaseOrder: id,
      messageType: 'quotation',
    });

    if (!quotationMessage) {
      return res.status(404).json({ success: false, message: 'Quotation message not found' });
    }

    console.log('[Accept Quotation] Message data:', {
      id: quotationMessage._id,
      quotationExists: !!quotationMessage.quotation,
      quotationStatus: quotationMessage.quotation?.status,
      messageType: quotationMessage.messageType
    });

    if (!quotationMessage.quotation || !quotationMessage.quotation.amount) {
      console.log('[Accept Quotation] Invalid quotation structure:', {
        hasQuotation: !!quotationMessage.quotation,
        quotationData: quotationMessage.quotation
      });
      // If quotation exists but has no amount, it's malformed - treat as error
      return res.status(400).json({
        success: false,
        message: 'Invalid quotation structure - missing amount',
        debug: {
          hasQuotation: !!quotationMessage.quotation,
          currentStatus: quotationMessage.quotation?.status,
          fullQuotation: quotationMessage.quotation
        }
      });
    }

    if (quotationMessage.quotation.status !== 'pending') {
      console.log('[Accept Quotation] Status check failed - quotation not pending:', {
        hasQuotation: !!quotationMessage.quotation,
        status: quotationMessage.quotation?.status,
        purchaseOrderStatus: purchaseOrder.status
      });
      
      // If quotation already accepted and order is accepted, return success (idempotent)
      if (quotationMessage.quotation.status === 'accepted' && purchaseOrder.status === 'accepted') {
        console.log('[Accept Quotation] Already accepted - returning success');
        return res.status(200).json({ 
          success: true, 
          message: 'Quotation already accepted',
          data: { purchaseOrder }
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        message: `Quotation is not pending (current status: ${quotationMessage.quotation?.status})`,
        debug: {
          hasQuotation: !!quotationMessage.quotation,
          currentStatus: quotationMessage.quotation?.status,
          purchaseOrderStatus: purchaseOrder.status,
          messageId: messageId,
          quotationAmount: quotationMessage.quotation?.amount
        }
      });
    }

    quotationMessage.quotation.status = 'accepted';
    await quotationMessage.save();

    // Create system message for acceptance
    const acceptanceMessage = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: 'owner',
      messageType: 'system',
      content: 'Quotation accepted. Awaiting delivery details from vendor.',
      systemEvent: 'quotation_accepted',
    });

    // Create system prompt for delivery details
    const deliveryPromptMessage = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: 'system',
      messageType: 'system',
      content: 'Please submit delivery details to proceed with the order.',
      systemEvent: 'delivery_details_required',
    });

    purchaseOrder.status = 'accepted';
    purchaseOrder.negotiation = purchaseOrder.negotiation || {};
    purchaseOrder.negotiation.acceptedQuotationMessage = quotationMessage._id;
    purchaseOrder.negotiation.finalAmount = quotationMessage.quotation?.amount || null;
    purchaseOrder.negotiation.lastMessageAt = new Date();
    // Don't close chat yet - need delivery details first
    await purchaseOrder.save();

    const populatedAcceptance = await NegotiationMessage.findById(acceptanceMessage._id).populate(
      'sender',
      'firstName lastName email role'
    );
    const populatedPrompt = await NegotiationMessage.findById(deliveryPromptMessage._id).populate(
      'sender',
      'firstName lastName email role'
    );

    const io = req.app.get('io');
    if (io) {
      // Emit to order room (for chat participants)
      io.to(`order_${id}`).emit('quotationAccepted', { orderId: id, messageId });
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populatedAcceptance, id));
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populatedPrompt, id));
      io.to(`order_${id}`).emit('orderUpdated', { orderId: id, status: purchaseOrder.status, awaitingDelivery: true });
      
      // Also emit to vendor user room so they get updates on orders list
      if (purchaseOrder.vendor) {
        io.to(`vendor_${purchaseOrder.vendor._id}`).emit('orderUpdated', { 
          orderId: id, 
          status: purchaseOrder.status, 
          awaitingDelivery: true,
          purchaseOrderNumber: purchaseOrder.purchaseOrderNumber
        });
      }
    }

    res.json({
      success: true,
      message: 'Quotation accepted. Awaiting delivery details from vendor.',
      data: {
        purchaseOrder,
        awaitingDeliveryDetails: true,
      },
    });
  } catch (error) {
    console.error('Accept quotation error:', error);
    res.status(500).json({ success: false, message: 'Failed to accept quotation', error: error.message });
  }
});

/**
 * @route   PUT /api/purchase-orders/:id/quotation/:messageId/reject
 * @desc    Owner rejects a quotation
 * @access  Private (Owner)
 */
router.put('/:id/quotation/:messageId/reject', authenticate, isOwner, async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const { reason = '' } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const quotationMessage = await NegotiationMessage.findOne({
      _id: messageId,
      purchaseOrder: id,
      messageType: 'quotation',
    });

    if (!quotationMessage) {
      return res.status(404).json({ success: false, message: 'Quotation message not found' });
    }

    if (quotationMessage.quotation?.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Quotation is not pending' });
    }

    quotationMessage.quotation.status = 'rejected';
    await quotationMessage.save();

    // Add a system message
    const systemMessage = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: 'owner',
      messageType: 'system',
      content: reason ? `Quotation rejected: ${reason}` : 'Quotation rejected',
      systemEvent: 'quotation_rejected',
    });

    purchaseOrder.status = 'in_negotiation';
    purchaseOrder.negotiation = purchaseOrder.negotiation || {};
    purchaseOrder.negotiation.lastMessageAt = new Date();
    await purchaseOrder.save();

    const populated = await NegotiationMessage.findById(systemMessage._id).populate('sender', 'firstName lastName email role');

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('quotationRejected', { orderId: id, messageId, reason });
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populated, id));
      io.to(`order_${id}`).emit('orderUpdated', { orderId: id, status: purchaseOrder.status });
    }

    res.json({ success: true, message: 'Quotation rejected', data: toSocketPayload(populated, id) });
  } catch (error) {
    console.error('Reject quotation error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject quotation', error: error.message });
  }
});

/**
 * @route   POST /api/purchase-orders/:id/delivery-details
 * @desc    Vendor submits delivery details after quotation acceptance
 * @access  Private (Vendor)
 */
router.post('/:id/delivery-details', authenticate, authorize('vendor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estimatedDeliveryDate, trackingNumber, carrier, deliveryNotes } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id).populate('project', 'title');
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (purchaseOrder.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only submit delivery details for your own orders' });
    }

    if (purchaseOrder.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Purchase order must be in accepted status' });
    }

    // Check if negotiation has accepted quotation
    if (!purchaseOrder.negotiation?.acceptedQuotationMessage) {
      return res.status(400).json({ success: false, message: 'No accepted quotation found' });
    }

    // Add delivery details message to chat
    const deliveryMessage = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: 'vendor',
      messageType: 'delivery', // Use 'delivery' to match frontend DeliveryStatusNode
      content: `Delivery details submitted${deliveryNotes ? ': ' + deliveryNotes : ''}`,
      delivery: { // Use 'delivery' field to match DeliveryStatusNode expectations
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
        trackingNumber: trackingNumber || '',
        carrier: carrier || '',
        notes: deliveryNotes || '',
      },
    });

    // Update purchase order delivery tracking
    purchaseOrder.deliveryTracking = {
      status: 'processing',
      trackingNumber: trackingNumber || '',
      carrier: carrier || '',
      expectedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
      notes: deliveryNotes || '',
      updatedAt: new Date(),
      updatedBy: req.user._id,
    };

    // Now generate the invoice
    const acceptedQuotationMsg = await NegotiationMessage.findById(purchaseOrder.negotiation.acceptedQuotationMessage);
    
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const invoice = await VendorInvoice.create({
      invoiceNumber,
      purchaseOrder: purchaseOrder._id,
      project: purchaseOrder.project,
      vendor: purchaseOrder.vendor,
      acceptedQuotation: acceptedQuotationMsg._id,
      title: `Invoice for ${purchaseOrder.title}`,
      description: acceptedQuotationMsg.quotation?.note || '',
      items: acceptedQuotationMsg.quotation?.items || [],
      subtotal: acceptedQuotationMsg.quotation?.amount || 0,
      totalAmount: acceptedQuotationMsg.quotation?.amount || 0,
      currency: acceptedQuotationMsg.quotation?.currency || 'INR',
      createdBy: req.user._id,
      status: 'pending',
    });

    // Add invoice message into chat
    const invoiceMessage = await NegotiationMessage.create({
      purchaseOrder: id,
      sender: req.user._id,
      senderRole: 'system',
      messageType: 'invoice',
      content: `Invoice generated: ${invoice.invoiceNumber}`,
      invoice: {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        status: invoice.status,
      },
    });

    // Close the chat permanently
    purchaseOrder.negotiation.chatClosed = true;
    purchaseOrder.negotiation.chatClosedAt = new Date();
    purchaseOrder.negotiation.lastMessageAt = new Date();
    purchaseOrder.status = 'in_progress'; // Move to delivery phase
    await purchaseOrder.save();

    const populatedDelivery = await NegotiationMessage.findById(deliveryMessage._id).populate(
      'sender',
      'firstName lastName email role'
    );
    const populatedInvoice = await NegotiationMessage.findById(invoiceMessage._id).populate(
      'sender',
      'firstName lastName email role'
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('deliveryDetailsSubmitted', { orderId: id });
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populatedDelivery, id));
      io.to(`order_${id}`).emit('newMessage', toSocketPayload(populatedInvoice, id));
      io.to(`order_${id}`).emit('orderUpdated', { orderId: id, status: purchaseOrder.status, chatClosed: true });
    }

    res.status(201).json({
      success: true,
      message: 'Delivery details submitted and invoice generated. Chat is now closed.',
      data: {
        purchaseOrder,
        invoice,
        deliveryMessage: toSocketPayload(populatedDelivery, id),
        invoiceMessage: toSocketPayload(populatedInvoice, id),
      },
    });
  } catch (error) {
    console.error('Submit delivery details error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit delivery details', error: error.message });
  }
});

/**
 * @route   PUT /api/purchase-orders/:id/delivery-status
 * @desc    Update delivery tracking status
 * @access  Private (Vendor)
 */
router.put('/:id/delivery-status', authenticate, authorize('vendor'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, carrier, expectedArrival, expectedDeliveryDate, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    if (purchaseOrder.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update delivery for your own purchase orders' });
    }

    purchaseOrder.deliveryTracking = purchaseOrder.deliveryTracking || {};
    purchaseOrder.deliveryTracking.updates = purchaseOrder.deliveryTracking.updates || [];

    const now = new Date();
    const canonicalExpectedArrival = expectedArrival || expectedDeliveryDate || null;

    if (status) purchaseOrder.deliveryTracking.status = status;
    if (trackingNumber !== undefined) purchaseOrder.deliveryTracking.trackingNumber = String(trackingNumber || '');
    if (carrier !== undefined) purchaseOrder.deliveryTracking.carrier = String(carrier || '');
    if (canonicalExpectedArrival) {
      purchaseOrder.deliveryTracking.expectedArrival = new Date(canonicalExpectedArrival);
      // Back-compat: keep both fields in sync if either is provided.
      purchaseOrder.deliveryTracking.expectedDeliveryDate = new Date(canonicalExpectedArrival);
    }
    if (notes !== undefined) purchaseOrder.deliveryTracking.notes = String(notes || '');
    purchaseOrder.deliveryTracking.updatedAt = now;
    purchaseOrder.deliveryTracking.updatedBy = req.user._id;

    // Append an update entry for UI timeline cards
    purchaseOrder.deliveryTracking.updates.push({
      status: status || purchaseOrder.deliveryTracking.status || '',
      notes: notes !== undefined ? String(notes || '') : '',
      updatedAt: now,
      updatedBy: req.user._id,
      trackingNumber: trackingNumber !== undefined ? String(trackingNumber || '') : '',
      carrier: carrier !== undefined ? String(carrier || '') : '',
      expectedArrival: canonicalExpectedArrival ? new Date(canonicalExpectedArrival) : null,
    });

    // If delivery status is set to 'delivered', update order status to 'completed'
    if (status === 'delivered') {
      purchaseOrder.status = 'completed';
      purchaseOrder.deliveryTracking.actualArrival = now;
      console.log('[Delivery] Order marked as delivered and completed:', purchaseOrder.purchaseOrderNumber);
    } else if (status === 'partially_delivered' && purchaseOrder.status !== 'partially_delivered') {
      purchaseOrder.status = 'partially_delivered';
      console.log('[Delivery] Order marked as partially delivered:', purchaseOrder.purchaseOrderNumber);
    } else if (status && status !== 'not_started' && purchaseOrder.status === 'accepted') {
      // If vendor starts delivery tracking from accepted status, keep status or set to in_progress
      // We don't change status for intermediate tracking updates
      console.log('[Delivery] Delivery status updated:', status);
    }

    await purchaseOrder.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${id}`).emit('orderUpdated', { orderId: id, deliveryTracking: purchaseOrder.deliveryTracking });
    }

    res.json({ success: true, message: 'Delivery tracking updated', data: { purchaseOrder } });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update delivery status', error: error.message });
  }
});

/**
 * @route   GET /api/purchase-orders/:id/delivery-tracking
 * @desc    Get delivery tracking for an order
 * @access  Private
 */
router.get('/:id/delivery-tracking', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('project', 'title')
      .populate('vendor', 'firstName lastName email vendorDetails.companyName');

    if (!purchaseOrder) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    const hasAccess = await canAccessPurchaseOrder(purchaseOrder, req.user);
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { deliveryTracking: purchaseOrder.deliveryTracking || {}, purchaseOrder } });
  } catch (error) {
    console.error('Get delivery tracking error:', error);
    res.status(500).json({ success: false, message: 'Failed to get delivery tracking', error: error.message });
  }
});

/**
 * @route   GET /api/purchase-orders/vendor/my-orders
 * @desc    Get vendor's own purchase orders
 * @access  Private (Vendor only)
 */
router.get('/vendor/my-orders', authenticate, authorize('vendor'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let query = { vendor: req.user._id };

    if (status) {
      query.status = status;
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('project', 'title')
      .populate('materialRequest', 'title')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PurchaseOrder.countDocuments(query);

    res.json({
      success: true,
      data: {
        purchaseOrders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error('Get vendor purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vendor purchase orders',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private (role-based)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('quotation')
      .populate('materialRequest', 'title')
      .populate({
        path: 'project',
        select: 'title client assignedEmployees assignedVendors',
      })
      .populate('vendor', 'firstName lastName email vendorDetails')
      .populate('createdBy', 'firstName lastName')
      .populate('deliveries.receivedBy', 'firstName lastName')
      .populate('notes.author', 'firstName lastName');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Check access permissions
    const hasAccess =
      req.user.role === 'owner' ||
      (req.user.role === 'vendor' && purchaseOrder.vendor._id.toString() === req.user._id.toString()) ||
      (req.user.role === 'employee' && purchaseOrder.project.assignedEmployees.includes(req.user._id)) ||
      (req.user.role === 'client' && purchaseOrder.project.client.toString() === req.user._id.toString());

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to view this purchase order.',
      });
    }

    res.json({
      success: true,
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get purchase order',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/purchase-orders
 * @desc    Create purchase order from approved quotation
 * @access  Private (Owner only)
 */
router.post('/', authenticate, isOwner, async (req, res) => {
  try {
    const {
      quotationId,
      title,
      description,
      deliveryAddress,
      expectedDeliveryDate,
      paymentTerms,
    } = req.body;

    // Verify quotation exists and is approved
    const quotation = await Quotation.findById(quotationId)
      .populate('materialRequest', 'project');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (quotation.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Only approved quotations can be converted to purchase orders',
      });
    }

    // Check if purchase order already exists for this quotation
    const existingPO = await PurchaseOrder.findOne({ quotation: quotationId });
    if (existingPO) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order already exists for this quotation',
      });
    }

    // Create purchase order items from quotation items
    const items = quotation.items.map(item => ({
      quotationItem: item._id,
      materialName: item.materialName,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    // Normalize delivery address to object shape expected by the schema.
    // Accept either an object or a string for backward/loose clients.
    const normalizedDeliveryAddress = (() => {
      if (deliveryAddress && typeof deliveryAddress === 'object') return deliveryAddress;
      if (typeof deliveryAddress === 'string' && deliveryAddress.trim()) {
        return {
          street: deliveryAddress.trim(),
          city: '-',
          state: '-',
          zipCode: '-',
          country: '-',
        };
      }
      return {
        street: '-',
        city: '-',
        state: '-',
        zipCode: '-',
        country: '-',
      };
    })();

    // Normalize payment terms to schema shape.
    // Accept either an object (preferred) or a string payment method.
    const normalizedPaymentTerms = (() => {
      if (paymentTerms && typeof paymentTerms === 'object') return paymentTerms;
      if (typeof paymentTerms === 'string' && paymentTerms.trim()) {
        return {
          paymentMethod: paymentTerms.trim(),
          advancePercentage: 0,
          advanceAmount: 0,
          balanceAmount: 0,
        };
      }
      return {
        paymentMethod: 'bank_transfer',
        advancePercentage: 0,
        advanceAmount: 0,
        balanceAmount: 0,
      };
    })();

    const computedTotalAmount =
      (quotation.totalAmount ??
        (quotation.subtotal + (quotation.tax?.amount || 0) - (quotation.discount?.amount || 0) + (quotation.deliveryTerms?.deliveryCharges || 0)));

    // Mongoose required validation runs before save hooks, so provide required fields upfront.
    const purchaseOrderNumber = `PO-${Date.now()}`;

    const purchaseOrder = new PurchaseOrder({
      quotation: quotationId,
      materialRequest: quotation.materialRequest._id,
      project: quotation.materialRequest.project,
      vendor: quotation.vendor,
      purchaseOrderNumber,
      title: title || `PO for ${quotation.title}`,
      description,
      items,
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      discount: quotation.discount,
      deliveryCharges: quotation.deliveryTerms.deliveryCharges,
      totalAmount: computedTotalAmount,
      deliveryAddress: normalizedDeliveryAddress,
      expectedDeliveryDate: expectedDeliveryDate || new Date(),
      paymentTerms: normalizedPaymentTerms,
      createdBy: req.user._id,
    });

    // Ensure balances are consistent if caller didn't provide them.
    if (!purchaseOrder.paymentTerms.balanceAmount || purchaseOrder.paymentTerms.balanceAmount === 0) {
      purchaseOrder.paymentTerms.balanceAmount = purchaseOrder.totalAmount;
    }

    await purchaseOrder.save();

    // Populate the created purchase order
    await purchaseOrder.populate('quotation materialRequest project vendor createdBy');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/purchase-orders/:id/send
 * @desc    Send purchase order to vendor
 * @access  Private (Owner only)
 */
router.put('/:id/send', authenticate, isOwner, async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft purchase orders can be sent',
      });
    }

    await purchaseOrder.send();
    await purchaseOrder.populate('vendor', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Purchase order sent successfully',
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error('Send purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send purchase order',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/purchase-orders/:id/acknowledge
 * @desc    Acknowledge purchase order (vendor)
 * @access  Private (Vendor only - own POs)
 */
router.put('/:id/acknowledge', authenticate, authorize('vendor'), async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findById(id);
    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Check if vendor owns this purchase order
    if (purchaseOrder.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only acknowledge your own purchase orders',
      });
    }

    if (purchaseOrder.status !== 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Only sent purchase orders can be acknowledged',
      });
    }

    await purchaseOrder.acknowledge();

    res.json({
      success: true,
      message: 'Purchase order acknowledged successfully',
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error('Acknowledge purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge purchase order',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/purchase-orders/:id/delivery
 * @desc    Record delivery for purchase order
 * @access  Private (Owner and Employee)
 */
router.post('/:id/delivery', authenticate, authorize('owner', 'employee'), async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryDate, items, deliveredBy, notes, attachments } = req.body;

    if (!deliveryDate || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Delivery date and items are required',
      });
    }

    const purchaseOrder = await PurchaseOrder.findById(id)
      .populate('project', 'assignedEmployees');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
      });
    }

    // Check if employee is assigned to the project (if not owner)
    if (req.user.role === 'employee' && !purchaseOrder.project.assignedEmployees.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this project',
      });
    }

    const deliveryData = {
      deliveryDate: new Date(deliveryDate),
      items,
      deliveredBy,
      notes,
      attachments: attachments || [],
    };

    await purchaseOrder.recordDelivery(deliveryData, req.user._id);
    await purchaseOrder.populate('deliveries.receivedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Delivery recorded successfully',
      data: { purchaseOrder },
    });
  } catch (error) {
    console.error('Record delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record delivery',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/purchase-orders/project/:projectId
 * @desc    Get purchase orders for a specific project
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

    const purchaseOrders = await PurchaseOrder.findByProject(projectId);

    res.json({
      success: true,
      data: { purchaseOrders },
    });
  } catch (error) {
    console.error('Get project purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project purchase orders',
      error: error.message,
    });
  }
});

module.exports = router;
