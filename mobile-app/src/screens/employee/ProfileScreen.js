import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    Image,
    KeyboardAvoidingView,
    Keyboard,
    StatusBar,
    Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, authAPI } from '../../utils/api';
import BottomNavBar from '../../components/common/BottomNavBar';
import { COLORS } from '../../styles/colors';

// InputField component
const InputField = ({ label, value, onChangeText, placeholder, secureTextEntry = false, editable = true, icon }) => (
    <View style={inputStyles.inputContainer}>
        <Text style={inputStyles.inputLabel}>{label}</Text>
        <View style={inputStyles.inputWrapper}>
            {icon && (
                <View style={inputStyles.inputIcon}>
                    <Feather name={icon} size={18} color={COLORS.textMuted} />
                </View>
            )}
            <TextInput
                style={[
                    inputStyles.input,
                    icon && inputStyles.inputWithIcon,
                    !editable && inputStyles.inputDisabled
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={secureTextEntry}
                editable={editable}
            />
        </View>
    </View>
);

const inputStyles = StyleSheet.create({
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 14,
        top: 14,
        zIndex: 1,
    },
    input: {
        backgroundColor: '#FFFAEB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: COLORS.text,
        borderWidth: 1.5,
        borderColor: 'rgba(244, 208, 63, 0.15)',
    },
    inputWithIcon: {
        paddingLeft: 44,
    },
    inputDisabled: {
        backgroundColor: '#FFFEF5',
        color: COLORS.textMuted,
    },
});


const ProfileScreen = ({ navigation, route }) => {
    const { user, updateUser, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profileImage, setProfileImage] = useState(user?.profilePicture || user?.profileImage || null);

    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });

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

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const scrollRef = React.useRef(null);

    useEffect(() => {
        if (route.params?.scrollToPassword) {
            setShowPasswordModal(true);
        }
    }, [route.params]);

    // Scroll down when keyboard appears
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => {
                // Small delay to ensure scroll happens after layout
                setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                }, 100);
            }
        );

        return () => {
            keyboardDidShowListener.remove();
        };
    }, []);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePasswordChange = (field, value) => {
        setPasswordData(prev => ({ ...prev, [field]: value }));
    };

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showAlert('Permission Required', 'Please allow access to photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            showAlert('Error', 'Failed to pick image');
        }
    };

    const deletePhoto = async () => {
        if (!profileImage || !profileImage.startsWith('http')) {
            setProfileImage(null);
            return;
        }

        Alert.alert(
            'Delete Photo',
            'Are you sure you want to delete your profile photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoading(true);
                            const response = await usersAPI.deleteProfilePhoto();
                            if (response.success) {
                                setProfileImage(null);
                                if (updateUser) {
                                    updateUser({ ...user, profileImage: null });
                                }
                                showAlert('Success', 'Profile photo deleted');
                            } else {
                                showAlert('Error', response.message || 'Failed to delete photo');
                            }
                        } catch (error) {
                            console.error('Delete photo error:', error);
                            showAlert('Error', 'Failed to delete photo');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                },
            ]
        );
    };

    const handleSaveProfile = async () => {
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            showAlert('Error', 'First name and last name are required');
            return;
        }

        try {
            setIsSaving(true);

            const updateData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                phone: formData.phone,
                profilePicture: profileImage,
            };

            // If profile image is a local URI, upload it to GCS
            if (profileImage && !profileImage.startsWith('http')) {
                const formDataUpload = new FormData();
                const filename = profileImage.split('/').pop() || 'profile.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                if (Platform.OS === 'web') {
                    // For web, we need to fetch the blob and append it
                    try {
                        const response = await fetch(profileImage);
                        const blob = await response.blob();
                        formDataUpload.append('photo', blob, filename);
                    } catch (fetchError) {
                        console.error('Error fetching image blob:', fetchError);
                        // Fallback: try the original method
                        formDataUpload.append('photo', { uri: profileImage, name: filename, type });
                    }
                } else {
                    // For mobile (iOS/Android)
                    formDataUpload.append('photo', { uri: profileImage, name: filename, type });
                }

                const uploadResponse = await usersAPI.uploadProfilePhoto(formDataUpload);
                if (uploadResponse.success) {
                    updateData.profileImage = uploadResponse.data.profileImage;
                    setProfileImage(uploadResponse.data.profileImage);
                }
            }

            const response = await usersAPI.updateProfile(updateData);

            if (response.success) {
                if (updateUser) {
                    updateUser({ ...user, ...updateData });
                }
                showAlert('Success', 'Profile updated successfully!');
            } else {
                showAlert('Error', response.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Update profile error:', error);
            showAlert('Error', 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
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
                setShowPasswordSection(true);
                setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                }, 500);
            } else {
                setQrState({
                    loading: false,
                    qrCodeDataUrl: '',
                    error: response.message || 'Failed to generate QR code',
                    otpVerified: false,
                });
                showAlert('Error', response.message || 'Failed to generate QR code');
            }
        } catch (error) {
            setQrState({
                loading: false,
                qrCodeDataUrl: '',
                error: error.message || 'Failed to generate QR code',
                otpVerified: false,
            });
            showAlert('Error', error.message || 'Failed to generate QR code');
        }
    };

    const handlePasswordChangeSubmit = async () => {
        const { otp, newPassword, confirmPassword } = passwordData;

        if (!otp || otp.length !== 6) {
            showAlert('Error', 'Please enter the 6-digit OTP from Microsoft Authenticator');
            return;
        }

        if (!newPassword || !confirmPassword) {
            showAlert('Error', 'Please fill in all password fields');
            return;
        }

        if (newPassword.length < 6) {
            showAlert('Error', 'Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('Error', 'Passwords do not match');
            return;
        }

        try {
            setIsLoading(true);

            // Step 1: Verify OTP
            const verifyResponse = await authAPI.verifyPasswordChangeOtp(otp);
            if (!verifyResponse.success) {
                throw new Error(verifyResponse.message || 'Invalid OTP');
            }

            // Step 2: Change Password
            const changeResponse = await authAPI.changePassword({
                newPassword,
            });

            if (changeResponse.success) {
                showAlert('Success', 'Password changed successfully! Please login again.');
                setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
                setQrState({
                    loading: false,
                    qrCodeDataUrl: '',
                    error: '',
                    otpVerified: false,
                });
                setShowPasswordModal(false);
                setTimeout(() => logout(), 2000);
            } else {
                throw new Error(changeResponse.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Change password error:', error);
            showAlert('Error', error.message || error.response?.data?.message || 'Failed to change password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
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
                ]
            );
        }
    };

    const performLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
            const errorMsg = 'Failed to logout. Please try again.';
            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert('Error', errorMsg);
            }
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            <View style={styles.mainContainer}>
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <Feather name="arrow-left" size={22} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>My Profile</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Profile Card */}
                    <View style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity onPress={pickImage}>
                                {profileImage ? (
                                    <Image source={{ uri: profileImage }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}>
                                        <Feather name="user" size={40} color={COLORS.primary} />
                                    </View>
                                )}
                                <View style={styles.editBadge}>
                                    <Feather name="camera" size={14} color={COLORS.white} />
                                </View>
                            </TouchableOpacity>
                            {profileImage && (
                                <TouchableOpacity style={styles.deleteBadge} onPress={deletePhoto}>
                                    <Feather name="x" size={12} color={COLORS.white} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={styles.profileName}>
                            {formData.firstName} {formData.lastName}
                        </Text>
                        <View style={styles.roleBadge}>
                            <Feather name="briefcase" size={12} color={COLORS.primaryDark} />
                            <Text style={styles.roleText}>{user?.role || 'Employee'}</Text>
                        </View>
                        <Text style={styles.emailText}>{formData.email}</Text>
                    </View>

                    {/* Personal Info Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="user" size={18} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Personal Information</Text>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.halfInput}>
                                <InputField
                                    label="First Name"
                                    value={formData.firstName}
                                    onChangeText={(v) => handleInputChange('firstName', v)}
                                    placeholder="First name"
                                    icon="user"
                                />
                            </View>
                            <View style={styles.halfInput}>
                                <InputField
                                    label="Last Name"
                                    value={formData.lastName}
                                    onChangeText={(v) => handleInputChange('lastName', v)}
                                    placeholder="Last name"
                                    icon="user"
                                />
                            </View>
                        </View>

                        <InputField
                            label="Email Address"
                            value={formData.email}
                            placeholder="Email"
                            editable={false}
                            icon="mail"
                        />

                        <InputField
                            label="Phone Number"
                            value={formData.phone}
                            onChangeText={(v) => handleInputChange('phone', v)}
                            placeholder="+1 234 567 8900"
                            icon="phone"
                        />

                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                            onPress={handleSaveProfile}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Feather name="check" size={18} color={COLORS.white} />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Security Section */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.sectionHeaderButton}
                            onPress={handleChangePassword}
                        >
                            <View style={styles.sectionHeader}>
                                <Feather name="lock" size={18} color={COLORS.primary} />
                                <Text style={styles.sectionTitle}>Change Password</Text>
                            </View>
                            <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {/* Account Info */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Feather name="info" size={18} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>Account Details</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <Feather name="calendar" size={16} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Member Since</Text>
                                <Text style={styles.infoValue}>
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    }) : 'N/A'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconContainer}>
                                <Feather name="shield" size={16} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>Role</Text>
                                <Text style={styles.infoValue}>{user?.role || 'Employee'}</Text>
                            </View>
                        </View>

                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                            <View style={styles.infoIconContainer}>
                                <Feather name="hash" size={16} color={COLORS.textMuted} />
                            </View>
                            <View style={styles.infoContent}>
                                <Text style={styles.infoLabel}>User ID</Text>
                                <Text style={[styles.infoValue, { fontSize: 12 }]}>{user?._id || 'N/A'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* About Houseway */}
                    <TouchableOpacity
                        style={styles.aboutButton}
                        onPress={() => navigation.navigate('AboutHouseway')}
                    >
                        <Feather name="info" size={18} color={COLORS.primary} />
                        <Text style={styles.aboutButtonText}>About Houseway</Text>
                        <Feather name="chevron-right" size={18} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Feather name="log-out" size={18} color={COLORS.danger} />
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>

                    <View style={{ height: 100 }} />
                </ScrollView>
                <BottomNavBar navigation={navigation} activeTab="settings" />

                {/* OTP Password Reset Modal */}
                <Modal visible={otpStep > 0} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={styles.otpModal}>
                            <View style={styles.otpHeader}>
                                <Text style={styles.otpTitle}>
                                    {otpStep === 1 && 'Request OTP'}
                                    {otpStep === 2 && 'Verify OTP'}
                                    {otpStep === 3 && 'Set New Password'}
                                </Text>
                                <TouchableOpacity onPress={closeOtpModal} style={styles.closeButton}>
                                    <Feather name="x" size={24} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            </View>

                            {/* Step 1: Request OTP */}
                            {otpStep === 1 && (
                                <View>
                                    <Text style={styles.otpLabel}>Enter your email to receive OTP</Text>
                                    <TextInput
                                        style={styles.otpInput}
                                        value={otpEmail}
                                        onChangeText={setOtpEmail}
                                        placeholder="your@email.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor={COLORS.textMuted}
                                    />
                                    <TouchableOpacity
                                        style={styles.otpButton}
                                        onPress={requestOTP}
                                        disabled={otpLoading}
                                    >
                                        {otpLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.otpButtonText}>Send OTP</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Step 2: Verify OTP */}
                            {otpStep === 2 && (
                                <View>
                                    <Text style={styles.otpLabel}>Enter the 6-digit OTP sent to your email</Text>
                                    <TextInput
                                        style={[styles.otpInput, { letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
                                        value={otp}
                                        onChangeText={setOtp}
                                        placeholder="000000"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        placeholderTextColor={COLORS.textMuted}
                                    />
                                    <TouchableOpacity
                                        style={styles.otpButton}
                                        onPress={verifyOTP}
                                        disabled={otpLoading}
                                    >
                                        {otpLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.otpButtonText}>Verify OTP</Text>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={requestOTP} style={styles.resendLink}>
                                        <Text style={styles.resendText}>Resend OTP</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Step 3: Set New Password */}
                            {otpStep === 3 && (
                                <View>
                                    <Text style={styles.otpLabel}>Enter your new password</Text>
                                    <TextInput
                                        style={styles.otpInput}
                                        value={passwordData.newPassword}
                                        onChangeText={(val) => handlePasswordChange('newPassword', val)}
                                        placeholder="New Password"
                                        secureTextEntry
                                        placeholderTextColor={COLORS.textMuted}
                                    />
                                    <TextInput
                                        style={[styles.otpInput, { marginTop: 12 }]}
                                        value={passwordData.confirmPassword}
                                        onChangeText={(val) => handlePasswordChange('confirmPassword', val)}
                                        placeholder="Confirm Password"
                                        secureTextEntry
                                        placeholderTextColor={COLORS.textMuted}
                                    />
                                    <TouchableOpacity
                                        style={styles.otpButton}
                                        onPress={resetPasswordWithOTP}
                                        disabled={otpLoading}
                                    >
                                        {otpLoading ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <Text style={styles.otpButtonText}>Change Password</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </Modal>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFEF5',
    },
    mainContainer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },

    // Profile Card
    profileCard: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#F4D03F',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#F4D03F',
    },
    editBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F4D03F',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    deleteBadge: {
        position: 'absolute',
        top: 2,
        left: 2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.cardBg,
    },
    profileName: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.2)',
    },
    roleText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#E6BC00',
        textTransform: 'capitalize',
    },
    emailText: {
        fontSize: 14,
        color: COLORS.textMuted,
    },

    // Section Styles
    section: {
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#FFFEF5',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.15)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    sectionHeaderButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    halfInput: {
        flex: 1,
    },

    // Buttons
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4D03F',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        marginTop: 8,
        shadowColor: '#F4D03F',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.white,
    },
    passwordSection: {
        marginTop: 16,
    },
    changePasswordBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF9E6',
        padding: 16,
        borderRadius: 12,
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#F4D03F',
    },
    changePasswordText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E6BC00',
    },

    // Info Row
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 208, 63, 0.1)',
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        textTransform: 'capitalize',
    },

    // About Button
    aboutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: COLORS.primaryLight,
        borderWidth: 1,
        borderColor: COLORS.primary + '30',
    },
    aboutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
        marginLeft: 12,
    },

    // Logout Button
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(229, 57, 53, 0.3)',
        gap: 8,
    },
    logoutButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.danger,
    },

    // OTP Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    otpModal: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    otpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    otpTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeButton: {
        padding: 4,
    },
    otpLabel: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    otpInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: COLORS.text,
    },
    otpButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    otpButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    resendLink: {
        alignItems: 'center',
        marginTop: 16,
    },
    resendText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '500',
    },
    qrImage: {
        width: 200,
        height: 200,
        alignSelf: 'center',
        marginVertical: 12,
    },
});

export default ProfileScreen;
