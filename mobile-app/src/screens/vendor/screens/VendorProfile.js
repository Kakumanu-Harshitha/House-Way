import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Image,
  RefreshControl,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { authAPI, usersAPI, getProfileImageUrl } from '../../../utils/api';
import theme from '../../../styles/theme';
import ChangePasswordModal from '../../../components/ChangePasswordModal';

export default function VendorProfile({ navigation }) {
  const { user, logout, updateUser, syncUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [vendor, setVendor] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    specialization: [],
  });

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Profile Photo State
  const [profilePhoto, setProfilePhoto] = useState(null);

  const fetchUserData = async () => {
    if (!user?._id) return;
    try {
      const response = await usersAPI.getUserById(user._id);
      if (response.success) {
        const userData = response.data.user;
        
        setVendor({
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
            email: userData.email,
            phone: userData.phone || 'Not provided',
            companyName: userData.company || userData.vendorDetails?.companyName || 'Not provided',
            specialization: userData.vendorDetails?.specialization || [],
        });

        const imageUri = userData.profilePhoto || null;
        setProfilePhoto(imageUri);

        if (syncUser) {
          const updatedUser = { ...userData };
          if (imageUri && !updatedUser.profilePhoto) {
             updatedUser.profilePhoto = imageUri;
          }
          await syncUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      setVendor({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone || 'Not provided',
        companyName: user.company || user.vendorDetails?.companyName || 'Not provided',
        specialization: user.vendorDetails?.specialization || [],
      });
      
      // Update profile image if base URL changes
      if (user.profilePhoto) {
         if (profilePhoto !== user.profilePhoto) {
             setProfilePhoto(user.profilePhoto);
         }
      } else {
         setProfilePhoto(null);
      }
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchUserData();
  }, []);

  // ---------------------------
  // 📸 Profile Photo Logic
  // ---------------------------
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
      'Profile Photo',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: () => handleImageSelection('camera'),
        },
        {
          text: 'Gallery',
          onPress: () => handleImageSelection('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
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
        const newImage = uploadResponse.data.profilePhoto;
        
        // Update user context immediately
        updateUser({
          ...user,
          profilePhoto: newImage
        });
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

  // ---------------------------
  // 🔐 Password Change Logic
  // ---------------------------
  // Logic moved to ChangePasswordModal component

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
            onPress: performLogout,
          },
        ],
        { cancelable: true }
      );
    }
  };

  const performLogout = async () => {
    try {
      setLoading(true);
      await logout();
      // Navigation will be handled by AuthContext
    } catch (error) {
      console.error('Logout error:', error);
      const errorMsg = 'Failed to logout. Please try again.';
      showAlert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Edit profile functionality will be available soon.');
  };

  const getInitials = () => {
    const name = vendor.name || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'V';
  };

  const MenuItem = ({ icon, title, subtitle, onPress, danger }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconContainer, danger && styles.dangerIconContainer]}>
        <Feather name={icon} size={22} color={danger ? '#EF4444' : '#3C5046'} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, danger && styles.dangerText]}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Feather name="chevron-right" size={20} color="#999" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3C5046" />
        <Text style={styles.loadingText}>Logging out...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

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
          <Text style={styles.profileName}>{vendor.name || 'Vendor User'}</Text>
          <Text style={styles.profileEmail}>{vendor.email}</Text>
          {vendor.companyName !== 'Not provided' && (
            <View style={styles.companyBadge}>
              <Feather name="briefcase" size={14} color="#3C5046" />
              <Text style={styles.companyText}>{vendor.companyName}</Text>
            </View>
          )}
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="user"
              title="Edit Profile"
              subtitle="Update your personal information"
              onPress={handleEditProfile}
            />
            <MenuItem
              icon="phone"
              title="Phone Number"
              subtitle={vendor.phone}
              onPress={() => Alert.alert('Phone', vendor.phone)}
            />
            <MenuItem
              icon="briefcase"
              title="Company Details"
              subtitle={vendor.companyName}
              onPress={() => Alert.alert('Company', vendor.companyName)}
            />
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="lock"
              title="Change Password"
              subtitle="Update your password"
              onPress={() => setShowPasswordModal(true)}
            />
          </View>
        </View>

        {/* More Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More</Text>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="image"
              title="Media Gallery"
              subtitle="View your uploaded media"
              onPress={() => navigation.navigate('MediaGallery')}
            />
            <MenuItem
              icon="tool"
              title="Work Updates"
              subtitle="Manage project progress"
              onPress={() => navigation.navigate('WorkUpdates')}
            />
            <MenuItem
              icon="help-circle"
              title="Help & Support"
              subtitle="Get help with your account"
              onPress={() => showAlert('Support', 'Contact support at support@houseway.com')}
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.menuContainer}>
            <MenuItem
              icon="log-out"
              title="Logout"
              subtitle="Sign out from your account"
              onPress={handleLogout}
              danger
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ChangePasswordModal 
        visible={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3C5046',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  companyText: {
    fontSize: 14,
    color: '#3C5046',
    fontWeight: '500',
    marginLeft: 6,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F4F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2C',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  dangerText: {
    color: '#EF4444',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3C5046',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  deleteBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  qrImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 12,
  },
  verifyOtpButton: {
    position: 'absolute',
    right: 6,
    top: 34,
    backgroundColor: '#3C5046',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyOtpButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#3C5046',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});