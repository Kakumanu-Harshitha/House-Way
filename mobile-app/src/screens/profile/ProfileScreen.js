import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StatusBar,
  Platform,
  RefreshControl,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authAPI, usersAPI, serviceRequestsAPI } from '../../utils/api';
import theme from '../../styles/theme';
import { StandardCard } from '../../components/StandardCard';
// import PermissionsStatus from '../../components/PermissionsStatus';
// Note: react-native-image-picker is for bare React Native. For Expo, use expo-image-picker instead
// import { launchImageLibrary, launchCamera, MediaType } from 'react-native-image-picker';
// import * as ImagePicker from 'expo-image-picker';
// import {
//   requestCameraPermission,
//   requestMediaLibraryPermission,
//   requestAllImagePermissions,
//   showPermissionExplanation,
//   handlePermissionDenied
// } from '../../utils/permissions';

const ProfileScreen = ({ navigation }) => {
  const { user, updateUser, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [qrState, setQrState] = useState({
    loading: false,
    qrCodeDataUrl: '',
    error: '',
    otpVerified: false,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
      setProfileImage(user.profileImage || null);
    }

    // Request permissions on component mount for mobile - temporarily disabled
    // if (Platform.OS !== 'web') {
    //   requestInitialPermissions();
    // }
  }, [user]);

  // const requestInitialPermissions = async () => {
  //   // Permissions functionality temporarily disabled
  // };

  const handleImagePicker = () => {
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
        {
          text: '👨‍💼 Request Professional Photo',
          onPress: () => handleProfessionalPhotoRequest()
        },
        ...(profileImage ? [{
          text: '🗑️ Remove Photo',
          onPress: () => handleRemoveImage(),
          style: 'destructive'
        }] : []),
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleProfessionalPhotoRequest = () => {
    Alert.alert(
      'Professional Photography Service',
      'Would you like to request a professional photographer for your profile photo? Our team will connect you with a qualified vendor.',
      [
        {
          text: 'Request Service',
          onPress: () => createProfessionalPhotoRequest()
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const createProfessionalPhotoRequest = async () => {
    try {
      setIsLoading(true);

      const requestData = {
        requestType: 'professional-photography',
        title: 'Professional Profile Photo Session',
        description: `Professional profile photo session requested by ${user?.firstName} ${user?.lastName}. Looking for high-quality business headshots for professional use.`,
        priority: 'medium',
        requirements: {
          specifications: [
            'Professional business headshots',
            'High resolution images',
            'Multiple poses and angles',
            'Professional lighting setup'
          ],
          deliverables: [
            '5-10 edited high-resolution photos',
            'Digital copies in multiple formats',
            'Professional retouching included'
          ],
          format: 'Digital (JPEG/PNG)',
          additionalNotes: 'Profile photo for business use. Professional appearance required.'
        },
        timeline: {
          expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      };

      const response = await serviceRequestsAPI.createServiceRequest(requestData);

      if (response.success) {
        Alert.alert(
          'Request Submitted Successfully!',
          'Your professional photography request has been submitted. Our team will review it and assign a qualified photographer. You will be contacted within 24 hours with details.',
          [
            {
              text: 'View Request',
              onPress: () => navigation.navigate('ServiceRequests', {
                screen: 'RequestDetails',
                params: { requestId: response.data.request._id }
              })
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Professional photo request error:', error);
      Alert.alert('Error', 'Failed to submit professional photo request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelection = async (source) => {
    try {
      setIsLoading(true);

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
          if (!file) {
            setIsLoading(false);
            return;
          }

          // Validate file type
          if (!file.type.startsWith('image/')) {
            Alert.alert('Error', 'Please select an image file');
            setIsLoading(false);
            return;
          }

          // Validate file size (5MB limit)
          if (file.size > 5 * 1024 * 1024) {
            Alert.alert('Error', 'Image size should be less than 5MB');
            setIsLoading(false);
            return;
          }

          try {
            if (!user) {
              Alert.alert('Error', 'Please log in to upload profile photo');
              setIsLoading(false);
              return;
            }

            const formData = new FormData();
            formData.append('photo', file, file.name);

            const uploadResponse = await usersAPI.uploadProfilePhoto(formData);

            if (uploadResponse.success) {
              setProfileImage(uploadResponse.data.profileImage);
              if (updateUser) {
                const result = await updateUser({ ...user, profileImage: uploadResponse.data.profileImage });
                if (!result.success) {
                  Alert.alert('Warning', 'Photo uploaded but failed to update local data. Please refresh.');
                } else {
                  Alert.alert('Success', 'Profile photo updated successfully!');
                }
              } else {
                Alert.alert('Success', 'Profile photo updated successfully!');
              }
            } else {
              Alert.alert('Error', uploadResponse.message || 'Failed to upload photo');
            }
          } catch (uploadError) {
            console.error('Upload error details:', uploadError);
            if (uploadError.response) {
              console.error('Error response:', uploadError.response.data);
              Alert.alert('Error', uploadError.response.data.message || 'Failed to upload profile photo');
            } else if (uploadError.request) {
              console.error('Network error:', uploadError.request);
              Alert.alert('Error', 'Network error. Please check your connection.');
            } else {
              console.error('Unknown error:', uploadError.message);
              Alert.alert('Error', 'Failed to upload profile photo');
            }
          } finally {
            setIsLoading(false);
          }
        };

        input.click();
      } else {
        // Mobile image picker with proper permissions (temporarily disabled)
        Alert.alert('Mobile Image Picker', 'Mobile image picker will be available after permissions setup');
        setIsLoading(false);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  // const handleMobileImageSelection = async (source) => {
  //   // Mobile image selection with permissions - temporarily disabled
  //   Alert.alert('Mobile Image Picker', 'Mobile image picker will be available after permissions setup');
  //   setIsLoading(false);
  // };

  const handleRemoveImage = async () => {
    try {
      setIsLoading(true);

      const response = await usersAPI.deleteProfilePhoto();

      if (response.success) {
        setProfileImage(null);

        if (updateUser && user) {
          const result = await updateUser({ ...user, profileImage: null });
          if (result.success) {
            Alert.alert('Success', 'Profile photo removed successfully!');
          } else {
            Alert.alert('Warning', 'Photo removed but failed to update local data. Please refresh.');
          }
        } else {
          Alert.alert('Success', 'Profile photo removed successfully!');
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to remove profile photo');
      }
    } catch (error) {
      console.error('Remove photo error:', error);
      Alert.alert('Error', 'Failed to remove profile photo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);

      const result = await updateUser(profileData);

      if (result.success) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

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
        setPasswordData({
          otp: '',
          newPassword: '',
          confirmPassword: '',
        });
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

  const handleChangePassword = async () => {
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
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setIsLoading(true);
      
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
        setShowPasswordModal(false);
        setPasswordData({
          otp: '',
          newPassword: '',
          confirmPassword: '',
        });
        setQrState({
          loading: false,
          qrCodeDataUrl: '',
          error: '',
          otpVerified: false,
        });
        Alert.alert('Success', 'Password changed successfully!');
      } else {
        throw new Error(changeResponse.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Error', error.message || error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // For web, use window.confirm; for mobile, use Alert
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
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to logout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh user data if needed
    setRefreshing(false);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      client: 'Client',
      employee: 'Employee',
      vendor: 'Vendor',
      owner: 'Owner',
    };
    return roleNames[role] || role;
  };

  const getRoleIcon = (role) => {
    const roleIcons = {
      client: '👤',
      employee: '👷',
      vendor: '🏢',
      owner: '👑',
    };
    return roleIcons[role] || '👤';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary[500]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Header Card */}
        <StandardCard variant="primary" style={styles.profileHeaderCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                onPress={handleImagePicker}
                activeOpacity={0.8}
              >
                <View style={styles.avatar}>
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={styles.avatarImage}
                      onError={() => setProfileImage(null)}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </Text>
                  )}
                </View>
                <View style={styles.cameraButton}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.roleIndicator}>
                <Text style={styles.roleIcon}>{getRoleIcon(user?.role)}</Text>
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.profileRole}>
                {getRoleDisplayName(user?.role)}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email}
              </Text>
              <TouchableOpacity
                style={styles.changePhotoButton}
                onPress={handleImagePicker}
              >
                <Text style={styles.changePhotoText}>
                  {profileImage ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </StandardCard>

        {/* Profile Details Card */}
        <StandardCard style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.firstName}
                onChangeText={(text) => setProfileData({ ...profileData, firstName: text })}
                editable={isEditing}
                placeholder="Enter first name"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.lastName}
                onChangeText={(text) => setProfileData({ ...profileData, lastName: text })}
                editable={isEditing}
                placeholder="Enter last name"
                placeholderTextColor={theme.colors.text.secondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.email}
                onChangeText={(text) => setProfileData({ ...profileData, email: text })}
                editable={isEditing}
                placeholder="Email address"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {isEditing && <Text style={styles.inputNote}>Updating email will change your login ID</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={profileData.phone}
                onChangeText={(text) => setProfileData({ ...profileData, phone: text })}
                editable={isEditing}
                placeholder="Enter phone number"
                placeholderTextColor={theme.colors.text.secondary}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
                value={profileData.address}
                onChangeText={(text) => setProfileData({ ...profileData, address: text })}
                editable={isEditing}
                placeholder="Enter address"
                placeholderTextColor={theme.colors.text.secondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {isEditing && (
              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </StandardCard>

        {/* Account Settings Card */}
        <StandardCard style={styles.settingsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Account Settings</Text>
          </View>

          {/* Permissions Status for Mobile - temporarily disabled */}
          {/* {Platform.OS !== 'web' && (
            <PermissionsStatus
              onPermissionsChange={(permissions) => {
                console.log('Permissions updated:', permissions);
              }}
            />
          )} */}

          <View style={styles.settingsContainer}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleImagePicker}
            >
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>📷</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Profile Photo</Text>
                <Text style={styles.settingSubtitle}>
                  {profileImage ? 'Change your profile photo' : 'Add a profile photo'}
                </Text>
              </View>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={startPasswordChange}
            >
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🔒</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingSubtitle}>Update your account password</Text>
              </View>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('NotificationsScreen')}
            >
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🔔</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingSubtitle}>Manage notification preferences</Text>
              </View>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => navigation.navigate('ServiceRequests')}
            >
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>🎨</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Professional Services</Text>
                <Text style={styles.settingSubtitle}>Request photography, design & more</Text>
              </View>
              <Text style={styles.settingArrow}>→</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <View style={[styles.settingIcon, styles.logoutIcon]}>
                <Text style={styles.settingIconText}>🚪</Text>
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, styles.logoutText]}>Logout</Text>
                <Text style={styles.settingSubtitle}>Sign out of your account</Text>
              </View>
              <Text style={[styles.settingArrow, styles.logoutText]}>→</Text>
            </TouchableOpacity>
          </View>
        </StandardCard>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    otp: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                  setQrState({
                    loading: false,
                    qrCodeDataUrl: '',
                    error: '',
                    otpVerified: false,
                  });
                }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Change Password</Text>

            <TouchableOpacity
              style={[
                styles.modalSaveButton, 
                (isLoading || !passwordData.otp || passwordData.otp.length !== 6 || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword) && styles.modalSaveButtonDisabled
              ]}
                onPress={handleChangePassword}
              disabled={isLoading || !passwordData.otp || passwordData.otp.length !== 6 || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
            >
              <Text style={styles.modalSaveText}>
                {isLoading ? 'Saving...' : 'Change Password'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalForm}>
              {qrState.loading ? (
                <View style={styles.qrLoadingContainer}>
                  <Text style={styles.inputLabel}>Generating QR code...</Text>
                </View>
              ) : (
                <>
                  {qrState.qrCodeDataUrl ? (
                    <View style={styles.qrContainer}>
                      <Text style={styles.inputLabel}>
                        Scan this QR using Microsoft Authenticator
                      </Text>
                      <Image
                        source={{ uri: qrState.qrCodeDataUrl }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>OTP (6-digit)</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.otp}
                      onChangeText={(text) => setPasswordData({ ...passwordData, otp: text })}
                      placeholder="123456"
                      placeholderTextColor={theme.colors.text.secondary}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.newPassword}
                      onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.colors.text.secondary}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm New Password</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.confirmPassword}
                      onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                      placeholder="Confirm new password"
                      placeholderTextColor={theme.colors.text.secondary}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.passwordRequirements}>
                    <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                    <Text style={styles.requirementItem}>• At least 6 characters long</Text>
                    <Text style={styles.requirementItem}>• Mix of letters and numbers recommended</Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Header Styles - Premium Golden Theme
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 134, 11, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245, 176, 65, 0.2)',
  },
  backButtonText: {
    fontSize: 20,
    color: '#2C2C2C',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2C',
    letterSpacing: -0.5,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 176, 65, 0.15)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4941F',
  },

  // Content Styles
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Profile Header Card
  profileHeaderCard: {
    marginBottom: 20,
    backgroundColor: theme.colors.background.card,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 176, 65, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F5B041',
    ...theme.shadows.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text.white,
  },
  cameraButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5B041',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background.card,
    ...theme.shadows.sm,
  },
  cameraIcon: {
    fontSize: 12,
  },
  roleIndicator: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 176, 65, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background.card,
  },
  roleIcon: {
    fontSize: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  profileRole: {
    fontSize: 15,
    fontWeight: '600',
    color: '#D4941F',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  profileEmail: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
  },
  changePhotoButton: {
    backgroundColor: 'rgba(245, 176, 65, 0.15)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(245, 176, 65, 0.3)',
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D4941F',
  },

  // Details Card
  detailsCard: {
    marginBottom: 20,
  },
  cardHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    letterSpacing: -0.3,
  },
  formContainer: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.card,
  },
  inputDisabled: {
    backgroundColor: theme.colors.background.tertiary,
    color: theme.colors.text.secondary,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputNote: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#F5B041',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    ...theme.shadows.sm,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.text.secondary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.white,
  },

  // Settings Card
  settingsCard: {
    marginBottom: 20,
  },
  settingsContainer: {
    padding: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingIconText: {
    fontSize: 20,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  settingArrow: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontWeight: 'bold',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutIcon: {
    backgroundColor: theme.colors.error[100],
  },
  logoutText: {
    color: theme.colors.error[600],
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(184, 134, 11, 0.1)',
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 134, 11, 0.1)',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4941F',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
    letterSpacing: -0.3,
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5B041',
  },
  modalSaveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.white,
  },
  modalContent: {
    flex: 1,
  },
  modalForm: {
    padding: 24,
  },
  passwordRequirements: {
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrLoadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 12,
  },
  verifyOtpButton: {
    backgroundColor: theme.colors.primary[600],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyOtpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.white,
  },
});

export default ProfileScreen;
