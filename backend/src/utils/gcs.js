const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

const bucketName = process.env.GCS_BUCKET;
const keyFilename = process.env.GCS_KEYFILE;

// Initialize GCS client (optional)
let storage = null;
let bucket = null;
let gcsEnabled = false;

try {
  if (bucketName) {
    if (keyFilename && !fs.existsSync(keyFilename)) {
      throw new Error(`GCS_KEYFILE not found at: ${keyFilename}`);
    }
    storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename,
    });
    bucket = storage.bucket(bucketName);
    gcsEnabled = true;
  } else {
    console.log('ℹ️  GCS disabled (missing GCS_BUCKET). Using local uploads.');
  }
} catch (error) {
  console.warn('⚠️  GCS init failed; using local uploads. Reason:', error.message);
  storage = null;
  bucket = null;
  gcsEnabled = false;
}

const getBackendBaseUrl = () => {
  return process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
};

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const uploadToLocal = async ({ buffer, originalname, folder, projectId }) => {
  const sanitizedName = originalname
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '');
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(sanitizedName);
  const basename = path.basename(sanitizedName, ext);
  const filename = `${basename}-${uniqueSuffix}${ext}`;

  const relativeFolder = projectId ? path.join(folder, String(projectId)) : folder;
  const uploadDir = path.join(__dirname, '../../uploads', relativeFolder);
  ensureDir(uploadDir);
  const filePath = path.join(uploadDir, filename);

  fs.writeFileSync(filePath, buffer);

  // Build URL compatible with app's static uploads mount: /uploads
  const urlPath = `/uploads/${relativeFolder.replace(/\\/g, '/')}/${filename}`;
  return {
    filename,
    url: `${getBackendBaseUrl()}${urlPath}`,
    gcsPath: null,
    localPath: filePath,
  };
};

/**
 * Upload file to Google Cloud Storage
 * @param {Object} options - Upload options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.mimetype - File MIME type
 * @param {string} options.originalname - Original filename
 * @param {string} options.folder - Folder path in GCS
 * @param {string} [options.projectId] - Optional project ID for nested folders
 * @returns {Promise<{filename: string, url: string}>}
 */
const uploadToGCS = async ({ buffer, mimetype, originalname, folder, projectId }) => {
  try {
    if (!gcsEnabled || !bucket) {
      return uploadToLocal({ buffer, mimetype, originalname, folder, projectId });
    }

    // Sanitize filename - remove spaces and special characters
    const sanitizedName = originalname
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9._-]/g, ''); // Remove special chars

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(sanitizedName);
    const basename = path.basename(sanitizedName, ext);
    const filename = `${basename}-${uniqueSuffix}${ext}`;

    // Build GCS path - include projectId if provided
    const gcsPath = projectId
      ? `${folder}/${projectId}/${filename}`
      : `${folder}/${filename}`;

    console.log('📤 Uploading to GCS path:', gcsPath);

    // Get file reference
    const blob = bucket.file(gcsPath);

    // Create write stream
    const blobStream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: mimetype,
      },
      // 🔥 REMOVED: predefinedAcl - not compatible with uniform bucket-level access
    });

    // Return promise that resolves when upload completes
    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('❌ GCS Stream Error:', err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        // 🔥 REMOVED: blob.makePublic() - not needed with uniform bucket-level access
        // The bucket itself is already public

        // Construct public URL
        const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsPath}`;

        console.log('✅ Upload complete. Public URL:', publicUrl);

        resolve({
          filename,
          url: publicUrl,
          gcsPath, // Include the full GCS path for reference
        });
      });

      // Write buffer to stream
      blobStream.end(buffer);
    });
  } catch (error) {
    console.error('❌ GCS Upload Error:', error);
    console.log('⚠️ Falling back to local upload due to GCS error...');
    try {
      return await uploadToLocal({ buffer, mimetype, originalname, folder, projectId });
    } catch (localError) {
      console.error('❌ Local Fallback Error:', localError);
      throw error; // Throw original GCS error if local also fails
    }
  }
};

/**
 * Delete file from Google Cloud Storage
 * @param {string} filePath - Path to file in GCS
 * @returns {Promise<void>}
 */
const deleteFromGCS = async (filePath) => {
  try {
    if (!gcsEnabled || !bucket) {
      // Best-effort local delete if filePath looks like a local uploads path
      if (filePath && typeof filePath === 'string') {
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized.includes('/uploads/')) {
          const idx = normalized.indexOf('/uploads/');
          const rel = normalized.slice(idx + '/uploads/'.length);
          const local = path.join(__dirname, '../../uploads', rel);
          if (fs.existsSync(local)) fs.unlinkSync(local);
        }
      }
      return;
    }
    await bucket.file(filePath).delete();
    console.log('✅ Deleted from GCS:', filePath);
  } catch (error) {
    console.error('❌ GCS Delete Error:', error);
    throw error;
  }
};

/**
 * Check if file exists in GCS
 * @param {string} filePath - Path to file in GCS
 * @returns {Promise<boolean>}
 */
const fileExistsInGCS = async (filePath) => {
  try {
    if (!gcsEnabled || !bucket) {
      return false;
    }
    const [exists] = await bucket.file(filePath).exists();
    return exists;
  } catch (error) {
    console.error('❌ GCS Exists Check Error:', error);
    return false;
  }
};

/**
 * Generate a signed URL for private file access
 * @param {string} filePath - Path to file in GCS (e.g., 'invoices/filename.jpg')
 * @param {number} expiresInMinutes - URL expiration time in minutes (default: 60)
 * @returns {Promise<string>} - Signed URL
 */
const getSignedUrl = async (filePath, expiresInMinutes = 60) => {
  try {
    if (!gcsEnabled || !bucket) {
      // Local uploads are publicly served by /uploads
      if (!filePath) return '';
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
      const normalized = String(filePath).replace(/^\/+/, '');
      const withUploadsPrefix =
        normalized.startsWith('uploads/') || normalized.startsWith('uploads\\')
          ? normalized
          : `uploads/${normalized}`;
      return `${getBackendBaseUrl()}/${withUploadsPrefix.replace(/\\/g, '/')}`;
    }
    const options = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    };

    const [url] = await bucket.file(filePath).getSignedUrl(options);
    console.log('🔐 Generated signed URL for:', filePath);
    return url;
  } catch (error) {
    console.error('❌ Signed URL Generation Error:', error);
    // Fallback to public URL if signing fails (for backward compatibility)
    return `https://storage.googleapis.com/${bucketName}/${filePath}`;
  }
};

/**
 * Get signed URLs for multiple files
 * @param {string[]} filePaths - Array of file paths
 * @param {number} expiresInMinutes - URL expiration time
 * @returns {Promise<Object>} - Object mapping filePath to signedUrl
 */
const getSignedUrls = async (filePaths, expiresInMinutes = 60) => {
  const urlMap = {};
  await Promise.all(
    filePaths.map(async (filePath) => {
      urlMap[filePath] = await getSignedUrl(filePath, expiresInMinutes);
    })
  );
  return urlMap;
};

module.exports = {
  uploadToGCS,
  deleteFromGCS,
  fileExistsInGCS,
  getSignedUrl,
  getSignedUrls,
  storage,
  bucket,
  gcsEnabled,
};