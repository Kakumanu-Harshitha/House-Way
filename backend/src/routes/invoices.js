const express = require('express');
const router = express.Router();
const ClientInvoice = require('../models/ClientInvoice');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth');
const User = require('../models/User');
const File = require('../models/File');
const { generateInvoicePDF } = require('../utils/pdfGenerator');
const { uploadToGCS } = require('../utils/gcs');

/**
 * @route   POST /api/invoices
 * @desc    Create a new invoice
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            clientId,
            projectId,
            lineItems,
            taxRate,
            discountType,
            discountValue,
            dueDate,
            paymentTerms,
            notes,
        } = req.body;

        console.log('📝 [Invoice] Create request received for Project:', projectId);

        // Validate project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found',
            });
        }

        // Calculate line item totals
        const processedLineItems = lineItems.map(item => ({
            ...item,
            total: item.quantity * item.unitPrice,
        }));

        // Calculate subtotal
        const subtotal = processedLineItems.reduce((sum, item) => sum + item.total, 0);

        const invoice = new ClientInvoice({
            clientId: clientId || project.client,
            projectId,
            lineItems: processedLineItems,
            subtotal,
            taxRate: taxRate || 0,
            discountType: discountType || 'fixed',
            discountValue: discountValue || 0,
            issueDate: new Date(),
            dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            paymentTerms,
            notes,
            createdBy: req.user._id,
        });

        console.log('💾 [Invoice] Saving invoice to database...');

        await invoice.save();

        // Generate and upload PDF
        try {
            console.log('🔍 [Invoice] Fetching client details for PDF...');
            const client = await User.findById(invoice.clientId);
            if (client) {
                console.log('📄 [Invoice] Generating PDF for invoice:', invoice.invoiceNumber);
                const pdfBuffer = await generateInvoicePDF(invoice, project, client);
                const filename = `Invoice_${invoice.invoiceNumber}.pdf`;

                console.log('☁️ [Invoice] Uploading PDF to GCS...');
                const uploadResult = await uploadToGCS({
                    buffer: pdfBuffer,
                    mimetype: 'application/pdf',
                    originalname: filename,
                    folder: 'invoices',
                    projectId: projectId.toString(),
                });

                invoice.attachments.push({
                    filename: uploadResult.filename,
                    originalName: filename,
                    url: uploadResult.url,
                    size: pdfBuffer.length,
                    uploadedAt: new Date()
                });

                // Create a File record for the invoice so it appears in file lists
                try {
                    const fileDoc = new File({
                        filename: uploadResult.filename,
                        originalName: filename,
                        category: 'invoices',
                        mimeType: 'application/pdf',
                        size: pdfBuffer.length,
                        path: uploadResult.url,
                        uploadedBy: req.user._id,
                        project: projectId,
                        invoiceInfo: `Invoice #${invoice.invoiceNumber}`,
                        invoiceDate: invoice.issueDate
                    });
                    await fileDoc.save();
                } catch (fileError) {
                    console.error('Error creating File record for invoice:', fileError);
                }

                await invoice.save();
                console.log('✅ [Invoice] PDF attached successfully');
            } else {
                console.warn('⚠️ [Invoice] Client not found, skipping PDF generation');
            }
        } catch (pdfError) {
            console.error('Error generating/uploading invoice PDF:', pdfError);
            // We don't fail the response here to avoid rolling back the invoice creation
            // but we log the error.
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
 * @route   GET /api/invoices
 * @desc    Get all invoices (for admin/owner dashboard)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        console.log('[Invoice] Fetching all invoices and project payment schedules');
        
        // Fetch actual invoices
        const invoices = await ClientInvoice.find()
            .populate('clientId', 'firstName lastName email')
            .populate('projectId', 'title')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch projects with payment schedules
        const projectsWithSchedules = await Project.find({ 
            'paymentSchedule.0': { $exists: true } 
        })
        .populate('client', 'firstName lastName email')
        .select('title client paymentSchedule')
        .lean();

        // Transform payment schedules into "virtual invoices"
        const scheduleInvoices = [];
        const today = new Date();
        
        projectsWithSchedules.forEach(project => {
            if (project.paymentSchedule && project.paymentSchedule.length > 0) {
                project.paymentSchedule.forEach((item, index) => {
                    let status = item.status || 'pending';
                    const dueDate = item.dueDate ? new Date(item.dueDate) : null;
                    
                    // Dynamically determine if overdue
                    if (status === 'pending' && dueDate && dueDate < today) {
                        status = 'overdue';
                    }

                    scheduleInvoices.push({
                        _id: `sched-${project._id}-${index}`,
                        invoiceNumber: `SCHED-${index + 1}`,
                        clientId: project.client,
                        projectId: {
                            _id: project._id,
                            title: project.title
                        },
                        totalAmount: item.amount,
                        dueDate: item.dueDate,
                        status: status,
                        isSchedule: true,
                        installmentName: item.name,
                        createdAt: item.createdAt || project.createdAt || new Date()
                    });
                });
            }
        });

        // Combine and sort by date (latest first)
        const allItems = [...invoices, ...scheduleInvoices].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });

        console.log('[Invoice] Found', invoices.length, 'invoices and', scheduleInvoices.length, 'schedules');

        res.status(200).json({
            success: true,
            data: {
                invoices: allItems
            }
        });
    } catch (error) {
        console.error('Get all invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices',
            error: error.message,
        });
    }
});

/**
 * @route   POST /api/invoices/project/:projectId/upload
 * @desc    Upload invoice PDF directly
 * @access  Private
 */
const multer = require('multer');
const memoryStorage = multer.memoryStorage();
const uploadInvoicePDF = multer({
    storage: memoryStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        cb(new Error('Only PDF files are allowed'));
    }
}).single('invoice');

router.post('/project/:projectId/upload', authenticate, (req, res) => {
    uploadInvoicePDF(req, res, async (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload failed',
            });
        }

        try {
            const { projectId } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No PDF file uploaded',
                });
            }

            // Validate project exists
            const project = await Project.findById(projectId).populate('client');
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found',
                });
            }

            // Get invoice name and description from form data
            const invoiceName = req.body.invoiceName || '';
            const description = req.body.description || '';

            console.log('📄 [Invoice] Uploading PDF:', file.originalname, 'Name:', invoiceName);

            // Upload to GCS
            const uploadResult = await uploadToGCS({
                buffer: file.buffer,
                mimetype: 'application/pdf',
                originalname: file.originalname,
                folder: 'invoices',
                projectId: projectId.toString(),
            });

            // Generate invoice number
            const count = await ClientInvoice.countDocuments();
            const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

            // Create invoice record with name and description
            const invoice = new ClientInvoice({
                invoiceNumber,
                clientId: project.client._id,
                projectId,
                status: 'sent',
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                lineItems: [],
                subtotal: 0,
                taxRate: 0,
                discountType: 'fixed',
                discountValue: 0,
                notes: description, // Store description in notes field
                paymentTerms: invoiceName, // Store invoice name for display
                createdBy: req.user._id,
                attachments: [{
                    filename: uploadResult.filename,
                    originalName: file.originalname,
                    url: uploadResult.url,
                    size: file.size,
                    uploadedAt: new Date()
                }]
            });

            await invoice.save();

            // Also create a File record
            try {
                const fileDoc = new File({
                    filename: uploadResult.filename,
                    originalName: file.originalname,
                    category: 'invoices',
                    mimeType: 'application/pdf',
                    size: file.size,
                    path: uploadResult.url,
                    uploadedBy: req.user._id,
                    project: projectId,
                    invoiceInfo: invoiceName || `Invoice #${invoiceNumber}`,
                    invoiceDate: new Date()
                });
                await fileDoc.save();
            } catch (fileError) {
                console.error('Error creating File record:', fileError);
            }

            console.log('✅ [Invoice] PDF uploaded successfully:', invoiceNumber);

            res.status(201).json({
                success: true,
                message: 'Invoice PDF uploaded successfully',
                data: { invoice },
            });
        } catch (error) {
            console.error('Upload invoice PDF error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload invoice',
                error: error.message,
            });
        }
    });
});

/**
 * @route   GET /api/invoices/project/:projectId
 * @desc    Get all invoices for a project
 * @access  Private
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        const query = { projectId };
        if (status) query.status = status;

        const invoices = await ClientInvoice.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((page - 1) * parseInt(limit));

        const total = await ClientInvoice.countDocuments(query);

        const { getSignedUrl } = require('../utils/gcs');

        // Generate signed URLs for attachments
        const invoicesWithUrls = await Promise.all(invoices.map(async (inv) => {
            const invoiceObj = inv.toObject();
            if (invoiceObj.attachments && invoiceObj.attachments.length > 0) {
                const attachment = invoiceObj.attachments[0];
                const projectIdStr = invoiceObj.projectId?._id?.toString() || invoiceObj.projectId?.toString();
                const gcsPath = projectIdStr
                    ? `invoices/${projectIdStr}/${attachment.filename}`
                    : `invoices/${attachment.filename}`;

                try {
                    const signedUrl = await getSignedUrl(gcsPath, 60);
                    invoiceObj.fileUrl = signedUrl;
                } catch (err) {
                    console.warn('Could not generate signed URL for invoice:', gcsPath);
                    invoiceObj.fileUrl = attachment.url;
                }
            }
            return invoiceObj;
        }));

        res.json({
            success: true,
            data: {
                invoices: invoicesWithUrls,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    } catch (error) {
        console.error('Get project invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoices',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/invoices/client/:clientId
 * @desc    Get all invoices for a client
 * @access  Private
 */
router.get('/client/:clientId', authenticate, async (req, res) => {
    try {
        const { clientId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;

        const invoices = await ClientInvoice.getClientInvoices(clientId, {
            status,
            page: parseInt(page),
            limit: parseInt(limit),
        });

        res.json({
            success: true,
            data: { invoices },
        });
    } catch (error) {
        console.error('Get client invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoices',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/invoices/:invoiceId
 * @desc    Get a single invoice
 * @access  Private
 */
router.get('/:invoiceId', authenticate, async (req, res) => {
    try {
        const invoice = await ClientInvoice.findById(req.params.invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
            });
        }

        res.json({
            success: true,
            data: { invoice },
        });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoice',
            error: error.message,
        });
    }
});

/**
 * @route   PUT /api/invoices/:invoiceId
 * @desc    Update an invoice
 * @access  Private
 */
router.put('/:invoiceId', authenticate, async (req, res) => {
    try {
        const {
            lineItems,
            taxRate,
            discountType,
            discountValue,
            dueDate,
            paymentTerms,
            notes,
            status,
        } = req.body;

        const invoice = await ClientInvoice.findById(req.params.invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
            });
        }

        // Update fields if provided
        if (lineItems) invoice.lineItems = lineItems;
        if (taxRate !== undefined) invoice.taxRate = taxRate;
        if (discountType) invoice.discountType = discountType;
        if (discountValue !== undefined) invoice.discountValue = discountValue;
        if (dueDate) invoice.dueDate = dueDate;
        if (paymentTerms !== undefined) invoice.paymentTerms = paymentTerms;
        if (notes !== undefined) invoice.notes = notes;
        if (status) invoice.status = status;

        invoice.lastModifiedBy = req.user._id;

        await invoice.save();

        res.json({
            success: true,
            message: 'Invoice updated successfully',
            data: { invoice },
        });
    } catch (error) {
        console.error('Update invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice',
            error: error.message,
        });
    }
});

/**
 * @route   PUT /api/invoices/:invoiceId/status
 * @desc    Update invoice status
 * @access  Private
 */
router.put('/:invoiceId/status', authenticate, async (req, res) => {
    try {
        const { status, paymentMethod } = req.body;
        const invoice = await ClientInvoice.findById(req.params.invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
            });
        }

        if (status === 'sent') {
            await invoice.markAsSent();
        } else if (status === 'viewed') {
            await invoice.markAsViewed();
        } else if (status === 'paid') {
            await invoice.markAsPaid(paymentMethod || 'bank_transfer');
        } else {
            invoice.status = status;
            await invoice.save();
        }

        res.json({
            success: true,
            message: 'Invoice status updated',
            data: { invoice },
        });
    } catch (error) {
        console.error('Update invoice status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice status',
            error: error.message,
        });
    }
});

/**
 * @route   DELETE /api/invoices/:invoiceId
 * @desc    Delete an invoice
 * @access  Private
 */
router.delete('/:invoiceId', authenticate, async (req, res) => {
    try {
        const invoice = await ClientInvoice.findById(req.params.invoiceId);

        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
            });
        }

        // Check authorization: owner or creator can delete
        const isOwner = req.user.role === 'owner';
        const isCreator = invoice.createdBy?.toString() === req.user._id.toString();
        const isEmployee = req.user.role === 'employee';

        if (!isOwner && !isCreator && !isEmployee) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this invoice',
            });
        }

        await ClientInvoice.findByIdAndDelete(req.params.invoiceId);

        res.json({
            success: true,
            message: 'Invoice deleted successfully',
        });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete invoice',
            error: error.message,
        });
    }
});

/**
 * @route   GET /api/invoices/stats/overview
 * @desc    Get invoice statistics
 * @access  Private
 */
router.get('/stats/overview', authenticate, async (req, res) => {
    try {
        const { clientId } = req.query;

        const stats = await ClientInvoice.getInvoiceStats(clientId || null);
        const overdueInvoices = await ClientInvoice.getOverdueInvoices();

        res.json({
            success: true,
            data: {
                stats,
                overdueCount: overdueInvoices.length,
                overdueInvoices,
            },
        });
    } catch (error) {
        console.error('Get invoice stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get invoice stats',
            error: error.message,
        });
    }
});

module.exports = router;
