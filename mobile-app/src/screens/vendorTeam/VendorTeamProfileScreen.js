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
    const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);

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
            setProfilePhoto(user.profilePhoto || user.profileImage || null);
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
                setProfilePhoto(userData.profilePhoto || userData.profileImage || null);
            }
        } catch (error) {
            console.error('Refresh error:', error);
            showToast('Failed to refresh profile', 'error');
        } finally {
             setRefreshing(false);
        }
    };

    const handleImagePicker = () => {
        if (Platform.OS === 'web') {
            // On web, directly open file picker
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

    const handleImageSelection = async (type) => {
        console.log('handleImageSelection called with type:', type);
        try {
            if (Platform.OS === 'web') {
                // Web file input handling
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';

                if (type === 'camera') {
                    input.capture = 'environment'; // Use camera
                }

                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;

                    // Validate file type
                    if (!file.type.startsWith('image/')) {
                        showToast('Please select an image file', 'error');
                        return;
                    }

                    // Validate file size (5MB limit)
                    if (file.size > 5 * 1024 * 1024) {
                        showToast('Image size should be less than 5MB', 'error');
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
                const permissionMethod = type === 'camera' 
                    ? ImagePicker.requestCameraPermissionsAsync 
                    : ImagePicker.requestMediaLibraryPermissionsAsync;
                    
                const { status } = await permissionMethod();
                console.log('Permission status:', status);
                
                if (status !== 'granted') {
                    showToast(`Permission to access ${type} was denied`, 'error');
                    return;
                }
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

            console.log('ImagePicker result:', result);

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                const localUri = asset.uri;
                const filename = localUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const fileType = match ? `image/${match[1]}` : `image`;
                
                const formData = new FormData();
                formData.append('photo', { uri: localUri, name: filename, type: fileType });
                
                console.log('Uploading photo from mobile:', localUri);
                await uploadProfilePhoto(formData);
            }
        } catch (error) {
            console.error('Image selection error:', error);
            showToast('Failed to select image', 'error');
        }
    };

    const uploadProfilePhoto = async (formData) => {
        console.log('uploadProfilePhoto start');
        try {
            setIsSaving(true);
            
            console.log('Sending API request...');
            const uploadResponse = await usersAPI.uploadProfilePhoto(formData);
            console.log('API response:', uploadResponse);

            if (uploadResponse.success) {
                const newImage = uploadResponse.data.profilePhoto;

                setProfilePhoto(newImage);
                if (syncUser) {
                    await syncUser({ ...user, profilePhoto: newImage, profileImage: newImage });
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
                    }
                ]
            );
        }
    };

    const performDeletePhoto = async () => {
        try {
            console.log('Deleting profile photo...');
            setIsSaving(true);
            const response = await usersAPI.deleteProfilePhoto();
            console.log('Delete photo response:', response);
            
            if (response.success) {
                setProfilePhoto(null);
                if (syncUser) {
                    console.log('Syncing user with null profilePhoto');
                    await syncUser({ ...user, profilePhoto: null, profileImage: null });
                }
                showToast('Profile photo removed', 'success');
            } else {
                console.error('Delete photo failed:', response);
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
                    }
                ]
            );
        }
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
                        <TouchableOpacity onPress={handleImagePicker} disabled={isSaving}>
                            <UserAvatar
                                user={{ ...profile, profilePhoto: profilePhoto }}
                                size={100}
                                style={styles.avatar}
                                backgroundColor={theme.colors.primary[100]}
                                textColor={theme.colors.primary[600]}
                                showInitials={true}
                            />
                            <View style={styles.editBadge}>
                                {isSaving ? (
                                    <ActivityIndicator size="small" color={theme.colors.text.white} />
                                ) : (
                                    <Feather name="camera" size={14} color={theme.colors.text.white} />
                                )}
                            </View>
                        </TouchableOpacity>
                        {profilePhoto && !isSaving && (
                            <TouchableOpacity style={styles.deleteBadge} onPress={deletePhoto}>
                                <Feather name="x" size={12} color={theme.colors.text.white} />
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.profileName}>{profile.name || 'User'}</Text>
                    <Text style={styles.profileEmail}>{profile.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                            {(profile.subRole || profile.role).replace(/([A-Z])/g, ' $1').trim()}
                        </Text>
                    </View>
                </View>

                {/* Menu Items */}
                <View style={styles.menuContainer}>
                    <MenuItem 
                        icon="user" 
                        title="Edit Profile" 
                        subtitle="Update personal details"
                        onPress={() => showToast('Feature coming soon!', 'info')}
                    />
                    
                    <MenuItem 
                        icon="lock" 
                        title="Change Password" 
                        subtitle="Update your password"
                        onPress={() => setShowPasswordModal(true)}
                    />

                    <MenuItem 
                        icon="bell" 
                        title="Notifications" 
                        subtitle="Manage notification preferences"
                        onPress={() => navigation.navigate('NotificationsScreen')}
                    />

                    <MenuItem 
                        icon="help-circle" 
                        title="Help & Support" 
                        subtitle="Contact support or view FAQs"
                        onPress={() => navigation.navigate('HelpScreen')}
                    />

                    <View style={styles.divider} />

                    <MenuItem 
                        icon="log-out" 
                        title="Logout" 
                        danger
                        onPress={handleLogout}
                    />
                </View>
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
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    loadingText: {
        marginTop: 10,
        color: theme.colors.text.secondary,
        fontSize: 16,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    backBtn: {
        padding: 8,
    },
    profileCard: {
        backgroundColor: theme.colors.surface,
        margin: 20,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: theme.colors.background,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: theme.colors.background,
    },
    avatarText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: theme.colors.primary[600],
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary[600],
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.colors.surface,
    },
    deleteBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: theme.colors.error[500],
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginBottom: 12,
    },
    roleBadge: {
        backgroundColor: theme.colors.primary[50],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    roleText: {
        color: theme.colors.primary[700],
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    menuContainer: {
        backgroundColor: theme.colors.surface,
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 8,
        ...theme.shadows.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.colors.primary[50],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    dangerIconContainer: {
        backgroundColor: theme.colors.error[50],
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
        color: theme.colors.text.muted,
    },
    dangerText: {
        color: theme.colors.error[600],
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: 8,
        marginHorizontal: 16,
    },
});