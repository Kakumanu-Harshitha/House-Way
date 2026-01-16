import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Platform,
  Modal,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { authAPI, usersAPI, getProfileImageUrl } from '../../utils/api';
import ChangePasswordModal from '../../components/ChangePasswordModal';

const OwnerProfileScreen = ({ navigation }) => {
  const { user, updateUser, syncUser, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = async () => {
    if (!user?._id) return;
    try {
      const response = await usersAPI.getUserById(user._id);
      if (response.success) {
        const userData = response.data.user;
        
        setProfilePhoto(userData.profileImage || null);
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          email: userData.email || '',
          phone: userData.phone || '',
        });
        
        // Sync global state if needed (or always to keep timestamp fresh)
        if (syncUser) {
           // Normalize profileImage to profilePhoto for frontend
           if (userData.profileImage) {
             userData.profilePhoto = userData.profileImage;
           }
           syncUser(userData);
        }
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
  });

  const handleSave = async () => {
    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        Alert.alert('Error', 'First name and last name are required');
        return;
      }
      
      if (updateUser) {
        const result = await updateUser(formData);
        if (!result.success) {
          Alert.alert('Error', result.message || 'Failed to update profile');
          return;
        }
      }
      
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
      console.error('Update error:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
    setIsEditing(false);
  };

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleImagePicker = () => {
    if (Platform.OS === 'web') {
        handleImageSelection('gallery');
        return;
    }
    Alert.alert(
      'Profile Photo Options',
      'Choose how you want to update your profile photo',
      [
        {
          text: '📷 Take Photo',
          onPress: () => handleImageSelection('camera')
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: () => handleImageSelection('gallery')
        },
        ...(profilePhoto ? [{
          text: '🗑️ Remove Photo',
          onPress: () => deletePhoto(),
          style: 'destructive'
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleImageSelection = async (source) => {
    console.log('handleImageSelection called with source:', source);
    try {
      if (Platform.OS === 'web') {
        // Web file input handling
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        if (source === 'camera') {
            input.capture = 'environment'; // Use camera
        }

        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showAlert('Error', 'Please select an image file');
                return;
            }

            // Validate file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                showAlert('Error', 'Image size should be less than 5MB');
                return;
            }

            try {
                const formData = new FormData();
                formData.append('photo', file, file.name);
                await uploadProfilePhoto(formData);
            } catch (error) {
                console.error('Web upload preparation error:', error);
            }
        };

        input.click();
        return;
      }

      if (Platform.OS !== 'web') {
          const { status } = source === 'camera' 
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

          console.log('Permission status:', status);
          if (status !== 'granted') {
            showAlert('Permission Required', `Please allow access to ${source}`);
            return;
          }
      }

      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      console.log('ImagePicker result:', result);

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const localUri = asset.uri;
        const filename = localUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        
        const formData = new FormData();
        formData.append('photo', { uri: localUri, name: filename, type });
        
        console.log('Uploading photo from mobile:', localUri);
        await uploadProfilePhoto(formData);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showAlert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePhoto = async (formData) => {
    console.log('uploadProfilePhoto start');
    try {
      console.log('Sending API request...');
      const uploadResponse = await usersAPI.uploadProfilePhoto(formData);
      console.log('API response:', uploadResponse);

      if (uploadResponse.success) {
        const newImage = uploadResponse.data.profileImage;

        setProfilePhoto(newImage);
        if (syncUser && user) {
          await syncUser({ ...user, profilePhoto: newImage });
        }
        showAlert('Success', 'Profile photo updated successfully');
      } else {
        showAlert('Error', uploadResponse.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Upload photo error:', error);
      showAlert('Error', 'Failed to upload profile photo');
    }
  };

  const deletePhoto = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete your profile photo?')) {
        await performDeletePhoto();
      }
    } else {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to delete your profile photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: performDeletePhoto
          },
        ]
      );
    }
  };

  const performDeletePhoto = async () => {
    try {
      console.log('Deleting profile photo...');
      const response = await usersAPI.deleteProfilePhoto();
      console.log('Delete photo response:', response);

      if (response.success) {
        setProfilePhoto(null);
        if (syncUser && user) {
          console.log('Syncing user with null profilePhoto');
          await syncUser({ ...user, profilePhoto: null });
        }
        showAlert('Success', 'Profile photo removed successfully');
      } else {
        console.error('Delete photo failed:', response);
        showAlert('Error', response.message || 'Failed to delete photo');
      }
    } catch (error) {
      console.error('Delete photo error:', error);
      showAlert('Error', 'Failed to delete profile photo');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: performLogout
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      await logout();
      console.log('[OwnerProfile] Logout successful');
    } catch (error) {
      console.error('[OwnerProfile] Logout error:', error);
      const errorMsg = 'Failed to logout. Please try again.';
      showAlert('Error', errorMsg);
    }
  };

  const getInitials = () => {
    const first = formData.firstName?.[0] || '';
    const last = formData.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'A';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profilePhoto ? (
                <Image
                  source={{ uri: getProfileImageUrl(profilePhoto) }}
                  style={styles.avatarImage}
                  onError={() => setProfilePhoto(null)}
                />
              ) : (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.cameraButton} onPress={handleImagePicker}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {profilePhoto && (
              <TouchableOpacity style={styles.deleteBadge} onPress={deletePhoto}>
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>
            {formData.firstName} {formData.lastName}
          </Text>
          <Text style={styles.profileRole}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Owner'}
          </Text>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.firstName}
              onChangeText={(text) => setFormData({ ...formData, firstName: text })}
              editable={isEditing}
              placeholder="Enter first name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.lastName}
              onChangeText={(text) => setFormData({ ...formData, lastName: text })}
              editable={isEditing}
              placeholder="Enter last name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              editable={isEditing}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={isEditing}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SECURITY</Text>
          
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
              <Text style={styles.actionText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#6B7280" />
              <Text style={styles.actionText}>Two-Factor Authentication</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
          
          <View style={styles.switchItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="mail-outline" size={20} color="#6B7280" />
              <Text style={styles.actionText}>Email Notifications</Text>
            </View>
            <Switch
              value={notifications.email}
              onValueChange={(value) => setNotifications({ ...notifications, email: value })}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={notifications.email ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="notifications-outline" size={20} color="#6B7280" />
              <Text style={styles.actionText}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications.push}
              onValueChange={(value) => setNotifications({ ...notifications, push: value })}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={notifications.push ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
              <Text style={styles.actionText}>SMS Notifications</Text>
            </View>
            <Switch
              value={notifications.sms}
              onValueChange={(value) => setNotifications({ ...notifications, sms: value })}
              trackColor={{ false: '#D1D5DB', true: '#FFC107' }}
              thumbColor={notifications.sms ? '#FFFFFF' : '#F3F4F6'}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>2024.12.21</Text>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutItem}
            onPress={handleLogout}
          >
            <View style={styles.actionLeft}>
              <View style={styles.logoutIconContainer}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.logoutText}>Logout</Text>
                <Text style={styles.logoutSubtext}>Sign out of your account</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Cancel Button (when editing) */}
        {isEditing && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ChangePasswordModal 
        visible={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFC107',
  },
  content: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  deleteBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    paddingHorizontal: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  inputGroup: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  inputDisabled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F3F4F6',
    color: '#6B7280',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 15,
    color: '#1F2937',
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  logoutSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export default OwnerProfileScreen;
