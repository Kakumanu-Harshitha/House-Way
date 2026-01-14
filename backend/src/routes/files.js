const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middleware/auth');
const { deleteFile } = require('../middleware/upload');

const File = require('../models/File');
const { uploadToGCS } = require('../utils/gcs');
const { Storage } = require('@google-cloud/storage');
const gcsClient = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  keyFilename: process.env.GCS_KEYFILE,
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create category directory if it doesn't exist
    const category = req.body.category || 'documents';
    const allowedCategories = ['documents', 'images', 'quotations', 'purchase-orders', 'work_update'];
    const uploadDir = path.join(__dirname, '../../uploads', category);

    console.log('[Files] Multer destination - category:', category, 'uploadDir:', uploadDir);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('[Files] Multer filename - original:', file.originalname, 'generated:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for video support
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types including videos
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/jpg',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    console.log('[Files] Multer fileFilter - file mimetype:', file.mimetype);
    console.log("File received:", req.file);

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: images, videos, PDFs, Word documents, and text files.'));
    }
  }
});

// Memory storage for GCS uploads
const memoryStorage = multer.memoryStorage();

const uploadToMemory = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for video support
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-ms-wmv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: Images, Videos, PDF, Word, Excel, Text'));
  }
}).single('file');

const uploadInvoiceImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPEG/PNG images are allowed for invoices'));
  }
}).single('file');

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file
 * @access  Private
 */
/**
 * @route   POST /api/files/upload
 * @desc    Upload a file directly to Google Cloud Storage
 * @access  Private
 */
router.post('/upload', authenticate, (req, res, next) => {
  uploadToMemory(req, res, (err) => {
    if (err) {
      console.error('[Files] Multer Error:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('[Files] Upload request received:', {
      hasFile: !!req.file,
      fileInfo: req.file ? { name: req.file.originalname, size: req.file.size } : null,
      body: req.body,
      contentType: req.headers['content-type']
    });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const allowedUploadCategories = ['documents', 'images', 'quotations', 'purchase-orders', 'work_update'];
    const requestedCategory = req.body.category;
    const category = allowedUploadCategories.includes(requestedCategory)
      ? requestedCategory
      : 'documents';

    // Upload to GCS
    const { filename, url } = await uploadToGCS({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
      folder: category,
      projectId: req.body.projectId, // Optional: organize by project folder
    });

    // Create file record in database
    const fileData = {
      filename: filename,
      originalName: req.file.originalname,
      category: category,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: url, // GCS URL
      uploadedBy: req.user._id,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      project: req.body.projectId || undefined,
    };

    const file = new File(fileData);
    await file.save();
    await file.populate('uploadedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'File uploaded to GCS successfully',
      data: { file },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file to GCS',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/files/upload/invoice
 * @desc    Upload an invoice image directly to Google Cloud Storage
 * @access  Private
 */


router.post(
  "/upload/invoice",
  authenticate,
  (req, res, next) => {
    uploadInvoiceImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid file upload",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const { filename, url } = await uploadToGCS({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
        folder: "invoices",
      });

      const fileData = {
        filename,
        originalName: req.file.originalname,
        category: "invoices",
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: url,
        uploadedBy: req.user._id,
        project: req.body.projectId || undefined,
      };

      const file = new File(fileData);
      await file.save();
      await file.populate("uploadedBy", "firstName lastName");

      res.status(201).json({
        success: true,
        message: "Invoice image uploaded to GCS successfully",
        data: {
          file,
          attachment: {
            filename,
            originalName: req.file.originalname,
            url,
            size: req.file.size,
          },
        },
      });
    } catch (error) {
      console.error("🔥 GCS upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload invoice to GCS",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/files/project/:projectId/invoices
 * @desc    Fetch all invoices for a given project (from MongoDB + GCS)
 * @access  Private
 */
/**
 * @route   GET /api/files/project/:projectId/invoices
 * @desc    Fetch all invoices for a given project (from MongoDB + GCS)
 * @access  Private
 */
// ============================================
// INVOICE ROUTES - ADD THESE
// ============================================

/**
 * @route   GET /api/files/invoices
 * @desc    Get invoices for a specific project (query param) with signed URLs
 * @access  Private
 */
router.get("/invoices", authenticate, async (req, res) => {
  try {
    const { projectId } = req.query;

    console.log('📥 Fetching invoices for project:', projectId);

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const invoices = await File.find({
      project: projectId,
      category: "invoices",
    })
      .populate("uploadedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${invoices.length} invoices`);

    const { getSignedUrl } = require('../utils/gcs');

    // Generate signed URLs for each invoice
    const invoicesWithUrls = await Promise.all(invoices.map(async (inv) => {
      const gcsPath = `invoices/${inv.filename}`;
      const signedUrl = await getSignedUrl(gcsPath, 60); // 1 hour expiry

      return {
        _id: inv._id,
        filename: inv.filename,
        originalName: inv.originalName,
        category: inv.category,
        mimeType: inv.mimeType,
        size: inv.size,
        url: signedUrl,
        path: signedUrl,
        uploadedAt: inv.createdAt,
        createdAt: inv.createdAt,
        projectId: inv.project,
        invoiceInfo: inv.invoiceInfo,
        invoiceDate: inv.invoiceDate,
        uploadedBy: inv.uploadedBy,
      };
    }));

    res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      data: {
        files: invoicesWithUrls,
        count: invoicesWithUrls.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/files/invoices/employee
 * @desc    Get all invoices for employee's projects
 * @access  Private
 */
router.get("/invoices/employee", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    console.log('👤 Fetching invoices for employee:', userId);

    const Project = require('../models/Project');

    let projectIds = [];

    if (userRole === 'employee') {
      const projects = await Project.find({
        assignedTo: userId
      }).select('_id title');
      projectIds = projects.map(p => p._id);
    } else {
      const projects = await Project.find({}).select('_id title');
      projectIds = projects.map(p => p._id);
    }

    if (projectIds.length === 0) {
      return res.json({
        success: true,
        data: { files: [], count: 0 }
      });
    }

    const invoices = await File.find({
      project: { $in: projectIds },
      category: 'invoices',
    })
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const projects = await Project.find({
      _id: { $in: projectIds }
    }).select('_id title');

    const projectMap = {};
    projects.forEach(p => {
      projectMap[p._id.toString()] = p.title;
    });

    const GCS_BUCKET = process.env.GCS_BUCKET;

    const invoicesWithUrls = invoices.map((inv) => {
      const url = inv.path?.startsWith("http")
        ? inv.path
        : `https://storage.googleapis.com/${GCS_BUCKET}/invoices/${inv.filename}`;

      return {
        _id: inv._id,
        filename: inv.filename,
        originalName: inv.originalName,
        category: inv.category,
        mimeType: inv.mimeType,
        size: inv.size,
        url: url,
        path: url,
        uploadedAt: inv.createdAt,
        projectId: inv.project,
        projectTitle: projectMap[inv.project?.toString()] || 'Unknown Project',
        invoiceInfo: inv.invoiceInfo,
        invoiceDate: inv.invoiceDate,
        uploadedBy: inv.uploadedBy,
      };
    });

    res.json({
      success: true,
      data: {
        files: invoicesWithUrls,
        count: invoicesWithUrls.length,
      }
    });
  } catch (error) {
    console.error('❌ Error fetching employee invoices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/files/invoice/:fileId
 * @desc    Delete invoice by ID
 * @access  Private
 */
router.delete("/invoice/:fileId", authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log('🗑️ Deleting invoice:', fileId);

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file ID",
      });
    }

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    const GCS_BUCKET = process.env.GCS_BUCKET;

    // Delete from GCS
    try {
      const gcsPath = `invoices/${file.filename}`;

      await gcsClient.bucket(GCS_BUCKET).file(gcsPath).delete();
      console.log('✅ Deleted from GCS');
    } catch (gcsError) {
      console.error('⚠️ GCS deletion failed:', gcsError.message);
    }

    // Delete from database
    await File.findByIdAndDelete(fileId);
    console.log('✅ Deleted from database');

    res.json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
});

// ============================================
// CONTINUE WITH EXISTING ROUTES BELOW
// ============================================
router.get("/project/:projectId/invoices", authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const invoices = await File.find({
      project: projectId,
      category: "invoices",
    })
      .populate("uploadedBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    const GCS_BUCKET = process.env.GCS_BUCKET;

    const invoiceData = invoices.map((inv) => {
      const url = inv.path?.startsWith("http")
        ? inv.path
        : `https://storage.googleapis.com/${GCS_BUCKET}/invoices/${inv.filename}`;
      return {
        _id: inv._id,
        filename: inv.filename,
        originalName: inv.originalName,
        mimeType: inv.mimeType,
        size: inv.size,
        path: url,
        createdAt: inv.createdAt,
        uploadedBy: inv.uploadedBy,
      };
    });

    res.status(200).json({
      success: true,
      message: "Invoices fetched successfully",
      data: { invoices: invoiceData },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
});



/**
 * @route   GET /api/files
 * @desc    Get files with optional filters (projectId, category)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { projectId, category } = req.query;
    const filter = {};

    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: 'Invalid project ID' });
      }
      filter.project = projectId;
    }

    if (category) {
      filter.category = category;
    } else {
      // By default, if no category is specified, exclude invoices to show only docs
      filter.category = { $ne: 'invoices' };
    }

    const files = await File.find(filter)
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const { getSignedUrl } = require('../utils/gcs');

    // Generate signed URLs for all files
    const filesWithUrls = await Promise.all(files.map(async (file) => {
      // For GCS uploads, path is the full URL, but we need the filename to generate a signed URL
      // Upload logic uses folder/projectId/filename if projectId is present
      const projectIdStr = file.project ? file.project.toString() : null;
      const gcsPath = projectIdStr
        ? `${file.category}/${projectIdStr}/${file.filename}`
        : `${file.category}/${file.filename}`;

      let signedUrl = file.path; // Fallback

      try {
        signedUrl = await getSignedUrl(gcsPath, 60);
      } catch (err) {
        console.warn('Could not generate signed URL for:', gcsPath);
      }

      return {
        ...file.toObject(),
        url: signedUrl,
        downloadUrl: signedUrl
      };
    }));

    res.json({
      success: true,
      data: { files: filesWithUrls },
    });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get files',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/files/project/:projectId
 * @desc    Get files by project ID
 * @access  Private (role-based)
 * 
 */
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Validate projectId
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID',
      });
    }

    console.log('[Files] Fetching files for project:', projectId);

    // TODO: Add proper access control based on project ownership
    // For now, any authenticated user can access project files

    const files = await File.find({ project: projectId })
      .populate('uploadedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    console.log('[Files] Found files:', files.length);

    // Add URL information to each file
    const filesWithUrls = files.map(file => {
      // Extract category and filename from path
      const pathParts = file.path.split('/');
      const category = pathParts[pathParts.length - 2];
      const filename = pathParts[pathParts.length - 1];

      // Log for debugging
      console.log('[Files] Processing file:', {
        id: file._id,
        category,
        filename,
        path: file.path,
        project: file.project
      });

      return {
        ...file.toObject(),
        url: `/api/files/${category}/${filename}`,
        downloadUrl: `/api/files/${category}/${filename}`,
      };
    });

    res.json({
      success: true,
      data: { files: filesWithUrls },
    });
  } catch (error) {
    console.error('Get project files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get project files',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/files/:category/:filename
 * @desc    Download/view file
 * @access  Private (role-based)
 */
router.get('/:category/:filename', authenticate, async (req, res) => {
  try {
    const { category, filename } = req.params;

    // Validate category
    const allowedCategories = ['documents', 'images', 'quotations', 'purchase-orders', 'work_update'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file category',
      });
    }

    const filePath = path.join(__dirname, '../../uploads', category, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // TODO: Add proper access control based on file ownership/project access
    // For now, any authenticated user can access files

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';

    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/files/id/:fileId
 * @desc    Delete file by ID (removes from both DB and GCS)
 * @access  Private (Employee role)
 */
router.delete('/id/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;

    console.log('[Files] Deleting file by ID:', fileId);

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file ID',
      });
    }

    const file = await File.findById(fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Delete from GCS first
    const GCS_BUCKET = process.env.GCS_BUCKET;
    try {
      // Build the GCS path - format: category/projectId/filename or category/filename
      const projectIdStr = file.project ? file.project.toString() : null;
      const gcsPath = projectIdStr
        ? `${file.category}/${projectIdStr}/${file.filename}`
        : `${file.category}/${file.filename}`;

      console.log('[Files] Deleting from GCS:', gcsPath);
      await gcsClient.bucket(GCS_BUCKET).file(gcsPath).delete();
      console.log('[Files] File deleted from GCS');
    } catch (gcsError) {
      console.warn('[Files] GCS deletion failed (file may not exist on GCS):', gcsError.message);
      // Continue with database deletion even if GCS fails
    }

    // Delete from database
    await File.findByIdAndDelete(fileId);
    console.log('[Files] File deleted from database:', fileId);

    res.json({
      success: true,
      message: 'File deleted successfully from both storage and database',
    });

  } catch (error) {
    console.error('[Files] Delete by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/files/:category/:filename
 * @desc    Delete file
 * @access  Private (Owner only or file uploader)
 */
router.delete('/:category/:filename', authenticate, async (req, res) => {
  try {
    const { category, filename } = req.params;

    // Validate category
    const allowedCategories = ['documents', 'images', 'quotations', 'purchase-orders', 'work_update'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file category',
      });
    }

    // Only owners can delete files for now
    // TODO: Add proper access control based on file ownership
    if (req.user.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only owners can delete files',
      });
    }

    const filePath = path.join(__dirname, '../../uploads', category, filename);

    const deleted = deleteFile(filePath);

    if (deleted) {
      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'File not found or could not be deleted',
      });
    }

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file',
      error: error.message,
    });
  }
});


const GCS_BUCKET = process.env.GCS_BUCKET;

// ✅ Get all invoices for a specific project





/**
 * @route   GET /api/files/info/:category/:filename
 * @desc    Get file information
 * @access  Private
 */

router.get('/info/:category/:filename', authenticate, async (req, res) => {
  try {
    const { category, filename } = req.params;

    // Validate category
    const allowedCategories = ['documents', 'images', 'quotations', 'purchase-orders', 'work_update', 'invoices'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file category',
      });
    }

    const filePath = path.join(__dirname, '../../uploads', category, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    const fileInfo = {
      filename,
      category,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      extension: ext,
      created: stats.birthtime,
      modified: stats.mtime,
      isImage: ['.jpg', '.jpeg', '.png', '.gif'].includes(ext),
      isPDF: ext === '.pdf',
      isDocument: ['.doc', '.docx', '.xls', '.xlsx', '.txt'].includes(ext),
    };

    res.json({
      success: true,
      data: { fileInfo },
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get file information',
      error: error.message,
    });
  }
});

/**
 * Helper function to format file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
