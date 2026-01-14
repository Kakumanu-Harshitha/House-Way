import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    Image,
    TextInput,
    Modal,
    RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, authAPI } from '../../utils/api';
import ToastMessage from '../../components/common/ToastMessage';
import theme from '../../styles/theme';

export default function VendorTeamProfileScreen({ navigation }) {
    const { user, updateUser, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profileImage, setProfileImage] = useState(user?.profileImage || null);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        role: '',
        subRole: '',
    });

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const [passwordData, setPasswordData] = useState({
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });

    const [otpModalVisible, setOtpModalVisible] = useState(false);
    const [otpLoading, setOtpLoading] = useState(false);

    const [qrState, setQrState] = useState({
        loading: false,
        qrCodeDataUrl: '',
        error: '',
        otpVerified: false,
    });

    useEffect(() => {
        if (user) {
            setProfile({
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
                email: user.email,
                phone: user.phone || 'Not provided',
                role: user.role || 'employee',
                subRole: user.subRole || 'vendorTeam',
            });
            setProfileImage(user.profileImage || null);
        }
    }, [user]);

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                showToast('Please allow access to photos', 'error');
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
            console.error('Image picker error:', error);
            showToast('Failed to pick image', 'error');
        }
    };

    const uploadProfilePhoto = async (imageUri) => {
        try {
            setIsSaving(true);
            const formData = new FormData();
            const filename = imageUri.split('/').pop() || 'profile.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            if (Platform.OS === 'web') {
                const response = await fetch(imageUri);
                const blob = await response.blob();
                formData.append('photo', blob, filename);
            } else {
                formData.append('photo', { uri: imageUri, name: filename, type });
            }

            const uploadResponse = await usersAPI.uploadProfilePhoto(formData);
            if (uploadResponse.success) {
                setProfileImage(uploadResponse.data.profileImage);
                if (updateUser) {
                    updateUser({ ...user, profileImage: uploadResponse.data.profileImage });
                }
                showToast('Profile photo updated!', 'success');
            } else {
                showToast(uploadResponse.message || 'Failed to upload photo', 'error');
            }
        } catch (error) {
            console.error('Upload photo error:', error);
            showToast('Failed to upload photo', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const deletePhoto = async () => {
        try {
            setIsSaving(true);
            const response = await usersAPI.deleteProfilePhoto();
            if (response.success) {
                setProfileImage(null);
                if (updateUser) {
                    updateUser({ ...user, profileImage: null });
                }
                showToast('Profile photo removed', 'success');
            } else {
                showToast(response.message || 'Failed to delete photo', 'error');
            }
        } catch (error) {
            console.error('Delete photo error:', error);
            showToast('Failed to delete photo', 'error');
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
                setOtpModalVisible(true);
            } else {
                setQrState({
                    loading: false,
                    qrCodeDataUrl: '',
                    error: response.message || 'Failed to generate QR code',
                    otpVerified: false,
                });
                showToast(response.message || 'Failed to generate QR code', 'error');
            }
        } catch (error) {
            setQrState({
                loading: false,
                qrCodeDataUrl: '',
                error: error.message || 'Failed to generate QR code',
                otpVerified: false,
            });
            showToast(error.message || 'Failed to generate QR code', 'error');
        }
    };

    const handlePasswordChangeSubmit = async () => {
        const { otp, newPassword, confirmPassword } = passwordData;

        if (!otp || otp.length !== 6) {
            showToast('Please enter the 6-digit OTP from Microsoft Authenticator', 'error');
            return;
        }
        if (!newPassword || !confirmPassword) {
            showToast('Please fill in all password fields', 'error');
            return;
        }
        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        try {
            setOtpLoading(true);

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
                showToast('Password changed successfully!', 'success');
                closeOtpModal();
                setTimeout(() => logout(), 2000);
            } else {
                throw new Error(changeResponse.message || 'Failed to change password');
            }
        } catch (error) {
            showToast(error.message || 'Failed to change password', 'error');
        } finally {
            setOtpLoading(false);
        }
    };

    const closeOtpModal = () => {
        setOtpModalVisible(false);
        setPasswordData({ otp: '', newPassword: '', confirmPassword: '' });
        setQrState({
            loading: false,
            qrCodeDataUrl: '',
            error: '',
            otpVerified: false,
        });
    };

    const performLogout = async () => {
        try {
            setLoading(true);
            await logout();
        } catch (error) {
            showToast('Failed to logout', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        showToast('Logging out...', 'info');
        setTimeout(() => performLogout(), 1000);
    };

    const MenuItem = ({ icon, title, subtitle, onPress, danger }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, danger && styles.dangerIconContainer]}>
                <Feather name={icon} size={22} color={danger ? theme.colors.error[600] : theme.colors.primary[600]} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[styles.menuTitle, danger && styles.dangerText]}>{title}</Text>
                {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.text.muted} />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                <Text style={styles.loadingText}>Logging out...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={22} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={pickImage} disabled={isSaving}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {profile.name.split(' ').map(n => n[0]).join('').toUpperCase() || 'V'}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={theme.colors.text.white} />
                                ) : (
                                    <Feather name="camera" size={14} color={theme.colors.text.white} />
                                )}
                            </View>
                        </TouchableOpacity>
                        {profileImage && !isSaving && (
                            <TouchableOpacity style={styles.deleteBadge} onPress={deletePhoto}>
                                <Feather name="x" size={12} color={theme.colors.text.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.profileName}>{profile.name || 'User'}</Text>
                    <Text style={styles.profileEmail}>{profile.email}</Text>
                    <View style={styles.roleBadge}>
                        <Feather name="package" size={14} color={theme.colors.primary[600]} />
                        <Text style={styles.roleText}>Vendor Team</Text>
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.menuContainer}>
                        <MenuItem
                            icon="user"
                            title="Edit Profile"
                            subtitle="Update your personal information"
                            onPress={() => showToast('Edit profile coming soon', 'info')}
                        />
                        <MenuItem
                            icon="phone"
                            title="Phone Number"
                            subtitle={profile.phone}
                            onPress={() => { }}
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
                            onPress={handleChangePassword}
                        />
                    </View>
                </View>

                {/* More Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>More</Text>
                    <View style={styles.menuContainer}>
                        <MenuItem
                            icon="info"
                            title="About Houseway"
                            subtitle="Learn more about us"
                            onPress={() => navigation.navigate('AboutHouseway')}
                        />
                        <MenuItem
                            icon="help-circle"
                            title="Help & Support"
                            subtitle="Get help with your account"
                            onPress={() => showToast('Contact: support@houseway.co.in', 'info')}
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

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* OTP Password Reset Modal */}
            <Modal visible={otpModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.otpModal}>
                        <View style={styles.otpHeader}>
                            <Text style={styles.otpTitle}>Change Password</Text>
                            <TouchableOpacity onPress={closeOtpModal} style={styles.closeButton}>
                                <Feather name="x" size={24} color={theme.colors.text.muted} />
                            </TouchableOpacity>
                        </View>

                        {qrState.loading ? (
                            <View>
                                <Text style={styles.otpLabel}>Generating QR code...</Text>
                            </View>
                        ) : (
                            <>
                                {qrState.qrCodeDataUrl ? (
                                    <View>
                                        <Text style={styles.otpLabel}>Scan this QR using Microsoft Authenticator</Text>
                                        <Image
                                            source={{ uri: qrState.qrCodeDataUrl }}
                                            style={styles.qrImage}
                                            resizeMode="contain"
                                        />
                                    </View>
                                ) : null}

                                <View>
                                    <Text style={styles.otpLabel}>OTP (6-digit)</Text>
                                    <TextInput
                                        style={[styles.otpInput, { letterSpacing: 8, textAlign: 'center', fontSize: 20 }]}
                                        value={passwordData.otp}
                                        onChangeText={(val) => setPasswordData(prev => ({ ...prev, otp: val }))}
                                        placeholder="000000"
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        placeholderTextColor={theme.colors.text.muted}
                                    />
                                </View>

                                <View>
                                    <Text style={styles.otpLabel}>Enter your new password</Text>
                                    <TextInput
                                        style={styles.otpInput}
                                        value={passwordData.newPassword}
                                        onChangeText={(val) => setPasswordData(prev => ({ ...prev, newPassword: val }))}
                                        placeholder="New Password"
                                        secureTextEntry
                                        placeholderTextColor={theme.colors.text.muted}
                                    />
                                    <TextInput
                                        style={[styles.otpInput, { marginTop: 12 }]}
                                        value={passwordData.confirmPassword}
                                        onChangeText={(val) => setPasswordData(prev => ({ ...prev, confirmPassword: val }))}
                                        placeholder="Confirm Password"
                                        secureTextEntry
                                        placeholderTextColor={theme.colors.text.muted}
                                    />
                                    <TouchableOpacity 
                                        style={[
                                            styles.otpButton,
                                            (otpLoading || 
                                             !passwordData.otp || 
                                             passwordData.otp.length !== 6 || 
                                             !passwordData.newPassword || 
                                             !passwordData.confirmPassword ||
                                             passwordData.newPassword !== passwordData.confirmPassword
                                            ) && { opacity: 0.6 }
                                        ]} 
                                        onPress={handlePasswordChangeSubmit} 
                                        disabled={otpLoading || !passwordData.otp || passwordData.otp.length !== 6 || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword}
                                    >
                                        {otpLoading ? <ActivityIndicator color={theme.colors.text.white} /> : <Text style={styles.otpButtonText}>Change Password</Text>}
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    scrollContent: { flexGrow: 1, paddingBottom: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background.primary },
    loadingText: { marginTop: 12, fontSize: 16, color: theme.colors.text.secondary },
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
        backgroundColor: theme.colors.background.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary[100],
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text.primary },
    profileCard: {
        backgroundColor: theme.colors.background.card,
        margin: 16,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary[100],
    },
    avatarContainer: { marginBottom: 16, position: 'relative' },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 36, fontWeight: '700', color: theme.colors.text.white },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.primary[600],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.colors.background.card,
    },
    deleteBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.error[600],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.background.card,
    },
    profileName: { fontSize: 24, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 4 },
    profileEmail: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 12 },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary[100],
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 8,
    },
    roleText: { fontSize: 14, color: theme.colors.primary[600], fontWeight: '500', marginLeft: 6 },
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text.secondary,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    menuContainer: {
        backgroundColor: theme.colors.background.card,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.primary[100],
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary[100],
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    dangerIconContainer: { backgroundColor: theme.colors.error[50] },
    menuContent: { flex: 1 },
    menuTitle: { fontSize: 16, fontWeight: '500', color: theme.colors.text.primary, marginBottom: 2 },
    menuSubtitle: { fontSize: 13, color: theme.colors.text.secondary },
    dangerText: { color: theme.colors.error[600] },
    // OTP Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    otpModal: { backgroundColor: theme.colors.background.card, marginHorizontal: 24, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400 },
    otpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    otpTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text.primary },
    closeButton: { padding: 4 },
    otpLabel: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 12 },
    otpInput: {
        backgroundColor: theme.colors.background.tertiary,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.colors.text.primary,
        borderWidth: 1,
        borderColor: theme.colors.primary[100],
    },
    otpButton: {
        backgroundColor: theme.colors.primary[600],
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    otpButtonText: { fontSize: 16, fontWeight: '600', color: theme.colors.text.white },
    resendLink: { alignItems: 'center', marginTop: 16 },
    resendText: { fontSize: 14, color: theme.colors.primary[600], fontWeight: '500' },
    qrImage: {
        width: 200,
        height: 200,
        alignSelf: 'center',
        marginVertical: 12,
    },
});
