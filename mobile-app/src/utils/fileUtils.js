/**
 * File Utilities - Upload and Download helpers
 * Handles file operations across web and mobile platforms
 */

import { Platform, Alert, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { filesAPI } from './api';
import { getServerBaseUrl } from './network';

/**
 * Get the full URL for a file path
 * @param {string} filePath - Relative or absolute file path
 * @returns {string} Full URL
 */
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  
  // Already a full URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // GCS URL
  if (filePath.startsWith('gs://')) {
    // Convert gs:// to https:// storage URL
    const bucket = process.env.GCS_BUCKET || 'invoices_houseway';
    const path = filePath.replace('gs://', '').replace(`${bucket}/`, '');
    return `https://storage.googleapis.com/${bucket}/${path}`;
  }
  
  // Local path - prepend server URL
  const baseUrl = getServerBaseUrl();
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${baseUrl}${cleanPath}`;
};

/**
 * Download a file
 * @param {string} fileUrl - URL of the file to download
 * @param {string} filename - Suggested filename for download
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const downloadFile = async (fileUrl, filename) => {
  try {
    const fullUrl = getFileUrl(fileUrl);
    
    if (Platform.OS === 'web') {
      // For web, open in new tab or trigger download
      const link = document.createElement('a');
      link.href = fullUrl;
      link.target = '_blank';
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return { success: true };
    }
    
    // For mobile, download to local storage
    const downloadDir = FileSystem.documentDirectory;
    const localUri = `${downloadDir}${filename || 'download'}`;
    
    const downloadResult = await FileSystem.downloadAsync(fullUrl, localUri);
    
    if (downloadResult.status === 200) {
      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: downloadResult.headers['content-type'] || 'application/octet-stream',
          dialogTitle: 'Save File',
        });
        return { success: true, localUri: downloadResult.uri };
      } else {
        Alert.alert('Download Complete', `File saved to: ${downloadResult.uri}`);
        return { success: true, localUri: downloadResult.uri };
      }
    } else {
      throw new Error(`Download failed with status ${downloadResult.status}`);
    }
  } catch (error) {
    console.error('Download error:', error);
    return { success: false, message: error.message || 'Failed to download file' };
  }
};

/**
 * Open a file URL in browser/viewer
 * @param {string} fileUrl - URL of the file to open
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export const openFile = async (fileUrl) => {
  try {
    const fullUrl = getFileUrl(fileUrl);
    
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
      return { success: true };
    }
    
    // For mobile, check if URL can be opened
    const canOpen = await Linking.canOpenURL(fullUrl);
    if (canOpen) {
      await Linking.openURL(fullUrl);
      return { success: true };
    } else {
      // Fallback to download
      return downloadFile(fullUrl, 'file');
    }
  } catch (error) {
    console.error('Open file error:', error);
    return { success: false, message: error.message || 'Failed to open file' };
  }
};

/**
 * Upload a file to the server
 * @param {object} file - File object with uri, name, type
 * @param {object} options - Upload options
 * @param {string} options.category - File category (documents, images, etc.)
 * @param {string} options.projectId - Optional project ID
 * @param {string[]} options.tags - Optional tags array
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
export const uploadFile = async (file, options = {}) => {
  try {
    const { category = 'documents', projectId, tags = [] } = options;
    
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      // Web file handling
      if (file instanceof File || file instanceof Blob) {
        formData.append('file', file, file.name || 'upload');
      } else if (file.uri) {
        // Convert URI to blob for web
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name || 'upload');
      }
    } else {
      // Mobile file handling
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || `file_${Date.now()}`,
      });
    }
    
    formData.append('category', category);
    if (projectId) formData.append('projectId', projectId);
    if (tags.length > 0) formData.append('tags', JSON.stringify(tags));
    
    const response = await filesAPI.uploadFile(formData);
    
    if (response.success) {
      return { success: true, data: response.data };
    } else {
      throw new Error(response.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, message: error.message || 'Failed to upload file' };
  }
};

/**
 * Upload invoice image to server
 * @param {object} file - File object with uri, name, type
 * @param {string} projectId - Optional project ID
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
export const uploadInvoiceImage = async (file, projectId) => {
  try {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      if (file instanceof File || file instanceof Blob) {
        formData.append('file', file, file.name || 'invoice.jpg');
      } else if (file.uri) {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name || 'invoice.jpg');
      }
    } else {
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || `invoice_${Date.now()}.jpg`,
      });
    }
    
    if (projectId) formData.append('projectId', projectId);
    
    const response = await filesAPI.uploadInvoice(formData);
    
    if (response.success) {
      return { success: true, data: response.data };
    } else {
      throw new Error(response.message || 'Upload failed');
    }
  } catch (error) {
    console.error('Invoice upload error:', error);
    return { success: false, message: error.message || 'Failed to upload invoice' };
  }
};

/**
 * Get file extension from filename or URL
 * @param {string} filename - Filename or URL
 * @returns {string} File extension (lowercase, without dot)
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Get file type category from extension
 * @param {string} extension - File extension
 * @returns {string} File category (image, video, document, spreadsheet, pdf, other)
 */
export const getFileType = (extension) => {
  const ext = extension.toLowerCase();
  
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  const videoTypes = ['mp4', 'mov', 'avi', 'wmv', 'webm', 'mkv'];
  const documentTypes = ['doc', 'docx', 'txt', 'rtf'];
  const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
  const pdfTypes = ['pdf'];
  
  if (imageTypes.includes(ext)) return 'image';
  if (videoTypes.includes(ext)) return 'video';
  if (documentTypes.includes(ext)) return 'document';
  if (spreadsheetTypes.includes(ext)) return 'spreadsheet';
  if (pdfTypes.includes(ext)) return 'pdf';
  return 'other';
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
};

export default {
  getFileUrl,
  downloadFile,
  openFile,
  uploadFile,
  uploadInvoiceImage,
  getFileExtension,
  getFileType,
  formatFileSize,
};
