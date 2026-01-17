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
    RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/api';
import BottomNavBar from '../../components/common/BottomNavBar';
import UserAvatar from '../../components/UserAvatar';
import { COLORS } from '../../styles/colors';
import ChangePasswordModal from '../../components/ChangePasswordModal';

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
    const { user, updateUser, syncUser, logout } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);

    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });

    const [refreshing, setRefreshing] = useState(false);

    const fetchUserData = async () => {
        if (!user?._id) return;
        try {
            const response = await usersAPI.getUserById(user._id);
            if (response.success) {
                const userData = response.data.user;

                setProfilePhoto(userData.profilePhoto || userData.profileImage || null);
                setFormData(prev => ({
                    ...prev,
                    firstName: userData.firstName || '',
                    lastName: userData.lastName || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                }));
                
                if (user.profilePhoto !== userData.profilePhoto || 
                    user.firstName !== userData.firstName || 
                    user.lastName !== userData.lastName) {
                    if (syncUser) {
                        syncUser(userData);
                    }
                }
            }
        } catch (error) {
            console.error('Fetch user error:', error);
        }
    };

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || '',
            });
            setProfilePhoto(user.profilePhoto || user.profileImage || null);
        }
    }, [user]);

    useEffect(() => {
        fetchUserData();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchUserData();
        setRefreshing(false);
    };

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

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleImagePicker = () => {
        if (Platform.OS === 'web') {
            // On web, directly open file picker as it handles both camera/gallery on mobile web
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

            // Mobile handling
            const { status } = source === 'camera' 
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            console.log('Permission status:', status);

            if (status !== 'granted') {
                showAlert('Permission Required', `Please allow access to ${source}`);
                return;
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
            setIsLoading(true);
            
            console.log('Sending API request...');
            const uploadResponse = await usersAPI.uploadProfilePhoto(formData);
            console.log('API response:', uploadResponse);

            if (uploadResponse.success) {
                const newImage = uploadResponse.data.profilePhoto;

                setProfilePhoto(newImage);
                if (syncUser) {
                    // Update both fields to ensure consistency across app
                    await syncUser({ ...user, profilePhoto: newImage, profileImage: newImage });
                }
                showAlert('Success', 'Profile photo updated successfully!');
            } else {
                showAlert('Error', uploadResponse.message || 'Failed to upload photo');
            }
        } catch (error) {
            console.error('Upload photo error:', error);
            showAlert('Error', 'Failed to upload profile photo');
        } finally {
            setIsLoading(false);
        }
    };

    const deletePhoto = async () => {
        if (!profilePhoto) {
            return;
        }

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
            setIsLoading(true);
            const response = await usersAPI.deleteProfilePhoto();
            console.log('Delete photo response:', response);

            if (response.success) {
                setProfilePhoto(null);
                if (syncUser) {
                    console.log('Syncing user with null profilePhoto');
                    await syncUser({ ...user, profilePhoto: null, profileImage: null });
                }
                showAlert('Success', 'Profile photo deleted');
            } else {
                console.error('Delete photo failed:', response);
                showAlert('Error', response.message || 'Failed to delete photo');
            }
        } catch (error) {
            console.error('Delete photo error:', error);
            showAlert('Error', 'Failed to delete photo');
        } finally {
            setIsLoading(false);
        }
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
                // profileImage is updated via separate endpoint
            };

            const response = await usersAPI.updateProfile(updateData);

            if (response.success) {
                if (syncUser) {
                    syncUser({ ...user, ...updateData });
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
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
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
                            <TouchableOpacity onPress={handleImagePicker}>
                                <UserAvatar 
                                    user={{ ...user, profilePhoto: profilePhoto }} 
                                    size={100} 
                                    style={styles.avatar} 
                                    backgroundColor="#FFF9E6"
                                    textColor={COLORS.primary}
                                    showInitials={true}
                                />
                                <View style={styles.editBadge}>
                                    <Feather name="camera" size={14} color={COLORS.white} />
                                </View>
                            </TouchableOpacity>
                            {profilePhoto && (
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
                            onPress={() => setShowPasswordModal(true)}
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

                <ChangePasswordModal 
                    visible={showPasswordModal} 
                    onClose={() => setShowPasswordModal(false)} 
                />
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
});

export default ProfileScreen;
