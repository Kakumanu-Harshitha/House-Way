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
    Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { usersAPI, authAPI } from '../../utils/api';
import ToastMessage from '../../components/common/ToastMessage';
import theme from '../../styles/theme';
import ChangePasswordModal from '../../components/ChangePasswordModal';

export default function VendorTeamProfileScreen({ navigation }) {
    const { user, updateUser, syncUser, logout } = useAuth();
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
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            // Fetch latest user data from backend
            const response = await authAPI.getProfile();
            
            if (response.success && response.data) {
                const userData = response.data.user || response.data;
                
                // Add timestamp to profile image to bust cache globally
                if (userData.profileImage) {
                    const timestamp = new Date().getTime();
                    userData.profileImage = userData.profileImage.includes('?') 
                        ? `${userData.profileImage}&t=${timestamp}` 
                        : `${userData.profileImage}?t=${timestamp}`;
                }

                if (syncUser) {
                    await syncUser(userData);
                }
                setProfile({
                    name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
                    email: userData.email,
                    phone: userData.phone || 'Not provided',
                    role: userData.role || 'employee',
                    subRole: userData.subRole || 'vendorTeam',
                });
                setProfileImage(userData.profileImage || null);
            }
        } catch (error) {
            console.error('Refresh error:', error);
            showToast('Failed to refresh profile', 'error');
        } finally {
             setRefreshing(false);
        }
    };

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
                ...(profileImage ? [{
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

    const handleImageSelection = async (type) => {
        try {
            const permissionMethod = type === 'camera' 
                ? ImagePicker.requestCameraPermissionsAsync 
                : ImagePicker.requestMediaLibraryPermissionsAsync;
                
            const { status } = await permissionMethod();
            
            if (status !== 'granted') {
                showToast(`Permission to access ${type} was denied`, 'error');
                return;
            }

            const launchMethod = type === 'camera'
                ? ImagePicker.launchCameraAsync
                : ImagePicker.launchImageLibraryAsync;

            const result = await launchMethod({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                await uploadProfilePhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Image selection error:', error);
            showToast('Failed to select image', 'error');
        }
    };

    const uploadProfilePhoto = async (imageUri) => {
        try {
            setIsSaving(true);
            const formData = new FormData();
            const filename = imageUri.split('/').pop() || 'profile.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            if (Platform.OS === 'web') {
                try {
                    const response = await fetch(imageUri);
                    const blob = await response.blob();
                    formData.append('photo', blob, filename);
                } catch (fetchError) {
                    console.error('Error fetching image blob:', fetchError);
                    formData.append('photo', { uri: imageUri, name: filename, type });
                }
            } else {
                formData.append('photo', { uri: imageUri, name: filename, type });
            }

            const uploadResponse = await usersAPI.uploadProfilePhoto(formData);
            if (uploadResponse.success) {
                const timestamp = new Date().getTime();
                const newImage = uploadResponse.data.profileImage;
                const imageWithTimestamp = newImage.includes('?') ? `${newImage}&t=${timestamp}` : `${newImage}?t=${timestamp}`;

                setProfileImage(imageWithTimestamp);
                if (syncUser) {
                    syncUser({ ...user, profileImage: imageWithTimestamp });
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
                if (syncUser) {
                    syncUser({ ...user, profileImage: null });
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
                    <Text style={styles.sectionTitlhandleccouePicknrt</Text>
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

                {/* Securile={styles.secSe
                <MenuI      title="Change Password"
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

            <ChangePasswordModal 
                visible={showPasswordModal} 
                onClose={() => setShowPasswordModal(false)} 
            />
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
    },, color: theme.colors.text.secondary },
    dangerText: { color: theme.colors.error[600] },
    // OTP Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    otpModal: { backgroundColor: theme.colors.background.card, marginHorizontal: 24, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400 },
    otpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    otpTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text.primary },
    closeButton: { padding: 4 },
    otpLabel: { fontSize: 14,marginBottom: 12 ,
    otpInput: {
        backgroundColor: theme.colors.background.tertiary
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
});
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
