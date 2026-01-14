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
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../context/AuthContext';
import { authAPI, usersAPI } from '../../../utils/api';
import theme from '../../../styles/theme';

export default function VendorProfile({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vendor, setVendor] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    specialization: [],
  });

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [qrState, setQrState] = useState({
    loading: false,
    qrCodeDataUrl: '',
    error: '',
    otpVerified: false,
  });

  // Profile Photo State
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    if (user) {
      setVendor({
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email,
        phone: user.phone || 'Not provided',
        companyName: user.company || user.vendorDetails?.companyName || 'Not provided',
        specialization: user.vendorDetails?.specialization || [],
      });
      setProfileImage(user.profileImage || null);
    }
  }, [user]);

  // ---------------------------
  // 📸 Profile Photo Logic
  // ---------------------------
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePhoto = async (imageUri) => {
    try {
      const formDataUpload = new FormData();
      const filename = imageUri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formDataUpload.append('photo', blob, filename);
      } else {
        formDataUpload.append('photo', { uri: imageUri, name: filename, type });
      }

      const uploadResponse = await usersAPI.uploadProfilePhoto(formDataUpload);
      if (uploadResponse.success) {
        setProfileImage(uploadResponse.data.profileImage);
        if (updateUser && user) {
          await updateUser({ ...user, profileImage: uploadResponse.data.profileImage });
        }
        Alert.alert('Success', 'Profile photo updated successfully');
      } else {
        Alert.alert('Error', uploadResponse.message || 'Failed to upload photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload profile photo');
    }
  };

  const deletePhoto = async () => {
    try {
      const response = await usersAPI.deleteProfilePhoto();
      if (response.success) {
        setProfileImage(null);
        if (updateUser && user) {
          await updateUser({ ...user, profileImage: null });
        }
        Alert.alert('Success', 'Profile photo removed successfully');
      } else {
        Alert.alert('Error', response.message || 'Failed to delete photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to delete profile photo');
    }
  };

  // ---------------------------
  // 🔐 Password Change Logic
  // ---------------------------
  const startPasswordChange = async () => {
    try {
      setQrState(prev => ({ ...prev, loading: true, error: '', qrCodeDataUrl: '', otpVerified: false }));
      const response = await authAPI.getPasswordChangeQr();
      if (response.success && response.data?.qrCodeDataUrl) {
        setQrState({
          loading: false,
          qrCodeDataUrl: response.data.qrCodeDataUrl,
          error: '',
          otpVerified: false,
        });
        setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(true);
      } else {
        setQrState({
          loading: false,
          qrCodeDataUrl: '',
          error: response.message || 'Failed to generate QR code',
          otpVerified: false,
        });
        Alert.alert('Error', response.message || 'Failed to generate QR code');
      }
    } catch (error) {
      setQrState({
        loading: false,
        qrCodeDataUrl: '',
        error: error.message || 'Failed to generate QR code',
        otpVerified: false,
      });
      Alert.alert('Error', error.message || 'Failed to generate QR code');
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordData.otp || passwordData.otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP from Microsoft Authenticator');
      return;
    }
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      
      // Verify OTP first
      const verifyResponse = await authAPI.verifyPasswordChangeOtp(passwordData.otp);
      if (!verifyResponse.success) {
        throw new Error(verifyResponse.message || 'Invalid OTP');
      }

      // Then change password
      const changeResponse = await authAPI.changePassword({
        newPassword: passwordData.newPassword,
      });
      
      if (changeResponse.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
        setQrState({
          loading: false,
          qrCodeDataUrl: '',
          error: '',
          otpVerified: false,
        });
      } else {
        throw new Error(changeResponse.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', error.message || error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
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
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                  onError={() => setProfileImage(null)}
                />
              ) : (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            {profileImage && (
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
              onPress={startPasswordChange}
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
              onPress={() => Alert.alert('Support', 'Contact support at support@houseway.com')}
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

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {qrState.loading ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Generating QR code...</Text>
                </View>
              ) : (
                <>
                  {qrState.qrCodeDataUrl ? (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Scan this QR using Microsoft Authenticator</Text>
                      <Image
                        source={{ uri: qrState.qrCodeDataUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>OTP (6-digit)</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.otp}
                      onChangeText={(text) => setPasswordData({ ...passwordData, otp: text })}
                      placeholder="123456"
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry={false}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.newPassword}
                      onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                      placeholder="Enter new password"
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.confirmPassword}
                      onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                      placeholder="Confirm new password"
                      secureTextEntry
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (isChangingPassword || !passwordData.otp || passwordData.otp.length !== 6 || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword) && styles.saveButtonDisabled
                    ]}
                    onPress={handlePasswordReset}
                    disabled={isChangingPassword || !passwordData.otp || passwordData.otp.length !== 6 || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>Change Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
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