import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../utils/api';

const ChangePasswordModal = ({ visible, onClose, onSuccess }) => {
  const [passwordData, setPasswordData] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [qrState, setQrState] = useState({
    loading: false,
    qrCodeDataUrl: '',
    error: '',
    otpVerified: false,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
      fetchQrCode();
    }
  }, [visible]);

  const fetchQrCode = async () => {
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
        if (onSuccess) onSuccess();
        onClose();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {qrState.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3C5046" />
                <Text style={styles.loadingText}>Generating QR code...</Text>
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
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  qrImage: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#3C5046',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordModal;
