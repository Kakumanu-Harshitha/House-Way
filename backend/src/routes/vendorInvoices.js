const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const VendorInvoice = require('../models/VendorInvoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const NegotiationMessage = require('../models/NegotiationMessage');
const { authenticate, authorize } = require('../middleware/auth');

// Ensure vendor-invoices upload directory exists
const vendorInvoicesDir = 'uploads/vendor-invoices';
if (!fs.existsSync(vendorInvoicesDir)) {
  fs.mkdirSync(vendorInvoicesDir, { recursive: true });
}

// Multer config for vendor invoice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, vendorInvoicesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `invoice-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'), false);
    }
  },
});

/**
 * @route   GET /api/vendor-invoices
 * @desc    Get all vendor invoices (role-based access)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, projectId, vendorId } = req.query;

    let query = {};

    if (req.user.role === 'vendor') {
      query.vendor = req.user._id;
    } else if (req.user.role !== 'owner' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (status) query.status = status;
    if (projectId) query.project = projectId;
    if (vendorId && req.user.role === 'owner') query.vendor = vendorId;

    const invoices = await VendorInvoice.find(query)
      .populate('purchaseOrder', 'purchaseOrderNumber title')
      .populate('project', 'title')
      .populate('vendor', 'firstName lastName email vendorDetails.companyName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await VendorInvoice.countDocuments(query);

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
    console.error('Get vendor invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/vendor-invoices/:id
 * @desc    Get single vendor invoice
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id)
      .populate('purchaseOrder')
      .populate('project', 'title client')
      .populate('vendor', 'firstName lastName email phone vendorDetails')
      .populate('acceptedQuotation')
      .populate('payments.recordedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'vendor' && invoice.vendor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Get vendor invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/vendor-invoices/:id/download
 * @desc    Get a URL for invoice PDF download
 * @access  Private
 */
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id)
      .populate('purchaseOrder')
      .populate('project', 'title client')
      .populate('vendor', 'firstName lastName email phone vendorDetails');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'vendor' && invoice.vendor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/api/vendor-invoices/${invoice._id}/pdf`;

    res.json({
      success: true,
      message: 'Invoice download link ready',
      data: { invoiceNumber: invoice.invoiceNumber, downloadUrl: fileUrl, fileUrl },
    });
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   GET /api/vendor-invoices/:id/pdf
 * @desc    Stream invoice PDF
 * @access  Private
 */
router.get('/:id/pdf', authenticate, async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id)
      .populate('purchaseOrder')
      .populate('project', 'title client')
      .populate('vendor', 'firstName lastName email phone vendorDetails');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'vendor' && invoice.vendor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);

    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text(`Invoice ${invoice.invoiceNumber}`, { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Project: ${invoice.project?.title || 'N/A'}`);
    doc.text(
      `Vendor: ${
        invoice.vendor?.vendorDetails?.companyName || `${invoice.vendor?.firstName || ''} ${invoice.vendor?.lastName || ''}`
      }`
    );
    doc.text(`Purchase Order: ${invoice.purchaseOrder?.purchaseOrderNumber || invoice.purchaseOrder}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.text(`Due: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    doc.fontSize(14).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Subtotal: ${invoice.currency} ${Number(invoice.subtotal || 0).toLocaleString()}`);
    doc.text(`Tax: ${invoice.currency} ${Number(invoice.tax?.amount || 0).toLocaleString()} (${invoice.tax?.rate || 0}%)`);
    doc.text(`Total: ${invoice.currency} ${Number(invoice.totalAmount || 0).toLocaleString()}`);

    doc.end();
  } catch (error) {
    console.error('Stream invoice PDF error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   POST /api/vendor-invoices/:id/upload
 * @desc    Upload invoice document (PDF/image) from vendor
 * @access  Private (Vendor only)
 */
router.post('/:id/upload', authenticate, upload.single('invoiceFile'), async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id);

    if (!invoice) {
      // Clean up uploaded file if invoice not found
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Only the vendor who owns the invoice can upload attachments
    if (req.user.role !== 'vendor' && req.user.role !== 'owner' && req.user.role !== 'admin') {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (req.user.role === 'vendor' && invoice.vendor.toString() !== req.user._id.toString()) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Build file URL
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/vendor-invoices/${req.file.filename}`;

    // Add attachment to invoice
    const attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      uploadedAt: new Date(),
      uploadedBy: req.user._id,
    };

    invoice.attachments = invoice.attachments || [];
    invoice.attachments.push(attachment);
    await invoice.save();

    res.json({
      success: true,
      message: 'Invoice document uploaded successfully',
      data: {
        attachment,
        totalAttachments: invoice.attachments.length,
      },
    });
  } catch (error) {
    console.error('Upload invoice document error:', error);
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/vendor-invoices/:id/attachments/:attachmentId
 * @desc    Delete an attachment from invoice
 * @access  Private (Vendor/Owner/Admin)
 */
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const invoice = await VendorInvoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Check access
    if (req.user.role === 'vendor' && invoice.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const attachmentIndex = invoice.attachments.findIndex(
      (att) => att._id.toString() === req.params.attachmentId
    );

    if (attachmentIndex === -1) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }

    const attachment = invoice.attachments[attachmentIndex];

    // Try to delete the file
    const filePath = path.join(vendorInvoicesDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from array
    invoice.attachments.splice(attachmentIndex, 1);
    await invoice.save();

    res.json({
      success: true,
      message: 'Attachment deleted successfully',
      data: { remainingAttachments: invoice.attachments.length },
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
