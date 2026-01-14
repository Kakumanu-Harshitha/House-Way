import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Platform, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AppHeader from '../components/AppHeader';
import theme from '../../../styles/theme';
import { filesAPI, workStatusAPI } from '../../../utils/api';

export default function UploadWorkStatus({ navigation, route }) {
  const { quotation, materialRequest } = route.params || {};
  
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercentage, setProgressPercentage] = useState('0');
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [existingWorkStatus, setExistingWorkStatus] = useState(null);

  // Load existing work status when component mounts
  useEffect(() => {
    loadExistingWorkStatus();
  }, []);

  const loadExistingWorkStatus = async () => {
    try {
      if (!quotation || !materialRequest) return;
      
      // Get existing work status for this quotation and material request
      const res = await workStatusAPI.getWorkStatuses({
        quotationId: quotation._id,
        materialRequestId: materialRequest._id
      });
      
      if (res.success && res.data.workStatuses && res.data.workStatuses.length > 0) {
        // Get the most recent work status
        const sorted = res.data.workStatuses.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setExistingWorkStatus(sorted[0]);
        
        // Pre-populate form with existing data
        setStatusMessage(sorted[0].message || '');
        setProgressPercentage(sorted[0].progress?.toString() || '0');
      }
    } catch (error) {
      console.error('[UploadWorkStatus] Error loading existing work status:', error);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        if (Platform.OS === 'web') {
          window.alert('Permission Required', 'Please grant permission to access your photos');
        } else {
          Alert.alert('Permission Required', 'Please grant permission to access your photos');
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        base64: false,  // Ensure we get file URIs, not base64 data
      });

      console.log('[UploadWorkStatus] ImagePicker result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets) {
        const newMedia = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'image',
          name: asset.fileName || `media_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          // Store additional metadata for debugging
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
        }));
        console.log('[UploadWorkStatus] New media to add:', JSON.stringify(newMedia, null, 2));
        setMedia(prevMedia => [...prevMedia, ...newMedia]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      if (Platform.OS === 'web') {
        window.alert('Error', 'Failed to pick image');
      } else {
        Alert.alert('Error', 'Failed to pick image');
      }
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        if (Platform.OS === 'web') {
          window.alert('Permission Required', 'Please grant permission to access your camera');
        } else {
          Alert.alert('Permission Required', 'Please grant permission to access your camera');
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        base64: false,  // Ensure we get file URIs, not base64 data
      });

      console.log('[UploadWorkStatus] Camera result:', JSON.stringify(result, null, 2));
      
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newMedia = [{
          uri: asset.uri,
          type: 'image',
          name: `photo_${Date.now()}.jpg`,
          // Store additional metadata for debugging
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
        }];
        console.log('[UploadWorkStatus] New photo to add:', JSON.stringify(newMedia, null, 2));
        setMedia(prevMedia => [...prevMedia, ...newMedia]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      if (Platform.OS === 'web') {
        window.alert('Error', 'Failed to take photo');
      } else {
        Alert.alert('Error', 'Failed to take photo');
      }
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      console.log('[UploadWorkStatus] DocumentPicker result:', result);
      
      if (result.type !== 'cancel' && result.assets) {
        const newDocs = result.assets.map(doc => ({
          uri: doc.uri,
          type: 'document',
          name: doc.name || `document_${Date.now()}.${doc.mimeType?.includes('pdf') ? 'pdf' : doc.mimeType?.includes('word') ? 'docx' : 'txt'}`,
          mimeType: doc.mimeType,
          // Store additional metadata for debugging
          size: doc.size,
        }));
        console.log('[UploadWorkStatus] New documents to add:', newDocs);
        setMedia(prevMedia => [...prevMedia, ...newDocs]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      if (Platform.OS === 'web') {
        window.alert('Error', 'Failed to pick document');
      } else {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const removeMedia = (index) => {
    const updated = [...media];
    updated.splice(index, 1);
    setMedia(updated);
  };

  const uploadStatus = async () => {
    if (!statusMessage.trim()) {
      Alert.alert('Validation Error', 'Please enter a status message');
      return;
    }

    const progress = parseFloat(progressPercentage);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      Alert.alert('Validation Error', 'Please enter valid progress (0-100)');
      return;
    }

    try {
      setUploading(true);
      console.log('[UploadWorkStatus] Uploading status...');

      // Upload each media file and log the process
      const uploadedFiles = [];
      console.log(`[UploadWorkStatus] Starting upload of ${media.length} media files`);
      
      for (const [index, item] of media.entries()) {
        // Validate item has required properties
        if (!item.uri) {
          console.error('[UploadWorkStatus] Item missing URI:', item);
          if (Platform.OS === 'web') {
            window.alert('Error', 'Selected file is missing URI');
          } else {
            Alert.alert('Error', 'Selected file is missing URI');
          }
          continue;
        }
        
        try {
          console.log(`[UploadWorkStatus] Uploading file ${index + 1}/${media.length}:`, item.name);
          
          // Create FormData
          const formData = new FormData();
          
          // Handle file URI - should now always be a file path
          let fileUri = item.uri;
          
          // Validate that this is actually a file URI, not base64 data
          if (fileUri.startsWith('data:')) {
            console.error('[UploadWorkStatus] Base64 data detected when file URI expected:', fileUri.substring(0, 100) + '...');
            
            // Try to convert base64 to a format that can be uploaded
            // This is a fallback - ideally we should get file URIs
            if (Platform.OS === 'web') {
              // For web, convert base64 to Blob
              try {
                const byteString = atob(fileUri.split(',')[1]);
                const mimeString = fileUri.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                  ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                
                formData.append('file', blob, item.name || `file_${Date.now()}.jpg`);
              } catch (blobError) {
                console.error('[UploadWorkStatus] Failed to convert base64 to Blob:', blobError);
                throw new Error('Failed to process image data');
              }
            } else {
              // For React Native, we can't easily convert base64 to uploadable format
              // Show error and continue
              if (Platform.OS === 'web') {
                window.alert('Error', 'Base64 images not supported for upload. Please select a file from your device.');
              } else {
                Alert.alert('Error', 'Base64 images not supported for upload. Please select a file from your device.');
              }
              continue;
            }
          } else {
            // Regular file URI - handle normally
            // Add file:// prefix for Android if needed
            if (Platform.OS === 'android' && !fileUri.startsWith('file://')) {
              fileUri = 'file://' + fileUri;
            }
            
            // Create file object with all required properties
            const fileObject = {
              uri: fileUri,
              type: item.mimeType || (item.type === 'video' ? 'video/mp4' : 'image/jpeg'),
              name: item.name || `file_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
            };
            
            console.log('[UploadWorkStatus] File object being appended:', fileObject);
            
            // Validate fileObject properties
            if (!fileObject.uri || !fileObject.type || !fileObject.name) {
              console.error('[UploadWorkStatus] Invalid file object:', fileObject);
              throw new Error('Invalid file object - missing required properties');
            }
            
            // Append file with explicit filename parameter
            formData.append('file', fileObject, fileObject.name);
          }
          
          // Append metadata
          formData.append('category', 'work_update');
          formData.append('tags', JSON.stringify(['work_status', quotation._id]));
          
          // Add project ID if available
          if (materialRequest && materialRequest.project) {
            formData.append('projectId', materialRequest.project._id || materialRequest.project);
            console.log('[UploadWorkStatus] Associating file with project:', materialRequest.project._id || materialRequest.project);
          }

          // Log FormData contents
          console.log('[UploadWorkStatus] About to upload file');
          console.log('[UploadWorkStatus] FormData keys:', [...formData.keys()]);
          
          // Try to upload
          console.log('[UploadWorkStatus] Sending upload request...');
          const uploadRes = await filesAPI.uploadFile(formData);
          console.log('[UploadWorkStatus] Upload response received:', uploadRes);
          
          if (uploadRes.success) {
            uploadedFiles.push(uploadRes.data.file._id);
            console.log(`[UploadWorkStatus] Successfully uploaded file ${index + 1}/${media.length}:`, uploadRes.data.file._id);
          } else {
            throw new Error(uploadRes.message || 'Upload failed');
          }
        } catch (error) {
          console.error(`[UploadWorkStatus] File upload failed for ${item.name || 'file'}:`, error);
          // Show error to user
          if (Platform.OS === 'web') {
            window.alert(`Failed to upload ${item.name || 'file'}: ${error.message}`);
          } else {
            Alert.alert('Upload Error', `Failed to upload ${item.name || 'file'}: ${error.message}`);
          }
        }
      }

      console.log(`[UploadWorkStatus] Finished uploading ${uploadedFiles.length}/${media.length} files`);

      // Prepare status data
      const statusData = {
        message: statusMessage.trim(),
        progress: progress,
        attachments: uploadedFiles, // Only send new attachments
      };

      console.log('[UploadWorkStatus] Processing work status update with data:', statusData);
      
      let statusRes;
      
      // If there's an existing work status, update it; otherwise create a new one
      if (existingWorkStatus) {
        console.log('[UploadWorkStatus] Updating existing work status:', existingWorkStatus._id);
        statusRes = await workStatusAPI.updateWorkStatus(existingWorkStatus._id, statusData);
        console.log('[UploadWorkStatus] Work status update response:', statusRes);
      } else {
        // Create a new work status with all required fields
        const newStatusData = {
          ...statusData,
          quotationId: quotation._id,
          materialRequestId: materialRequest._id,
        };
        console.log('[UploadWorkStatus] Creating new work status with data:', newStatusData);
        statusRes = await workStatusAPI.createWorkStatus(newStatusData);
        console.log('[UploadWorkStatus] Work status creation response:', statusRes);
      }

      if (statusRes.success) {
        console.log('[UploadWorkStatus] Successfully processed work status');
        // Log the images that were added
        if (uploadedFiles.length > 0) {
          console.log(`[UploadWorkStatus] Added ${uploadedFiles.length} new images to work status`);
        }
        if (Platform.OS === 'web') {
          window.alert('Work status saved successfully!');
          navigation.goBack();
        } else {
          Alert.alert('Success', 'Work status saved successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() }
          ]);
        }
      } else {
        throw new Error(statusRes.message || 'Failed to save work status');
      }
      
    } catch (error) {
      console.error('[UploadWorkStatus] Error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to save work status';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title={existingWorkStatus ? "Update Work Status" : "Upload Work Status"} 
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quotation Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Quotation Details</Text>
          <Text style={styles.quotationTitle}>{quotation.title}</Text>
          <Text style={styles.quotationAmount}>Total: ${quotation.totalAmount?.toFixed(2)}</Text>
        </View>

        {/* Status Message */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status Message</Text>
          <TextInput
            style={styles.textArea}
            value={statusMessage}
            onChangeText={setStatusMessage}
            placeholder="Describe the current work status, progress, challenges, etc..."
            multiline
            numberOfLines={6}
            placeholderTextColor={theme.colors.text.muted}
          />
        </View>

        {/* Progress */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Work Progress (%)</Text>
          <TextInput
            style={styles.input}
            value={progressPercentage}
            onChangeText={setProgressPercentage}
            placeholder="0-100"
            keyboardType="number-pad"
            placeholderTextColor={theme.colors.text.muted}
          />
          {progressPercentage && parseFloat(progressPercentage) > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${Math.min(parseFloat(progressPercentage), 100)}%` }]} />
            </View>
          )}
        </View>

        {/* Media Upload Buttons */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Attach Media</Text>
          
          <View style={styles.uploadButtonsRow}>
            <TouchableOpacity 
              style={styles.mediaButton}
              onPress={takePhoto}
              activeOpacity={0.7}
            >
              <Feather name="camera" size={24} color={theme.colors.primary} />
              <Text style={styles.mediaButtonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaButton}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              <Feather name="image" size={24} color={theme.colors.primary} />
              <Text style={styles.mediaButtonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mediaButton}
              onPress={pickDocument}
              activeOpacity={0.7}
            >
              <Feather name="file-text" size={24} color={theme.colors.primary} />
              <Text style={styles.mediaButtonText}>Document</Text>
            </TouchableOpacity>
          </View>

          {/* Media Preview */}
          {media.length > 0 && (
            <View style={styles.mediaGrid}>
              {media.map((item, index) => (
                <View key={index} style={styles.mediaItem}>
                  {item.type === 'image' && (
                    <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                  )}
                  {item.type === 'video' && (
                    <View style={styles.mediaPlaceholder}>
                      <Feather name="video" size={32} color={theme.colors.primary} />
                      <Text style={styles.placeholderText}>Video</Text>
                    </View>
                  )}
                  {item.type === 'document' && (
                    <View style={styles.mediaPlaceholder}>
                      <Feather name="file-text" size={32} color={theme.colors.primary} />
                      <Text style={styles.placeholderText} numberOfLines={2}>{item.name}</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.removeButton}
                    onPress={() => removeMedia(index)}
                  >
                    <Feather name="x" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={uploadStatus}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="upload" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                {existingWorkStatus ? "Update Work Status" : "Upload Work Status"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  quotationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  quotationAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  textArea: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.colors.text.primary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mediaButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mediaButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  mediaItem: {
    width: '31%',
    aspectRatio: 1,
    marginRight: '3.5%',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  placeholderText: {
    fontSize: 10,
    color: theme.colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});
