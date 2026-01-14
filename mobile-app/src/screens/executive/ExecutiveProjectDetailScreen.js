import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    TextInput,
    Modal,
    Alert,
    Platform,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { projectsAPI, usersAPI, filesAPI } from '../../utils/api';
import ExecutiveBottomNavBar from '../../components/common/ExecutiveBottomNavBar';
import * as ImagePicker from 'expo-image-picker';

// Premium White Theme with Gold Accents
const COLORS = {
    primary: '#D4AF37',
    primaryLight: 'rgba(184, 134, 11, 0.15)',
    background: '#FFFFFF',
    cardBg: '#FFFFFF',
    cardBorder: 'rgba(184, 134, 11, 0.1)',
    text: '#1A1A1A',
    textMuted: '#666666',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
};

// 5 Timeline Steps for Elevator Animation
const TIMELINE_STEPS = [
    { id: 1, name: 'Foundation', description: 'Site preparation and foundation work', icon: 'layers' },
    { id: 2, name: 'Structural Work', description: 'Walls, pillars, and structure', icon: 'grid' },
    { id: 3, name: 'Interior Work', description: 'Electrical, plumbing, interiors', icon: 'home' },
    { id: 4, name: 'Finishing', description: 'Painting, fixtures, final touches', icon: 'edit-3' },
    { id: 5, name: 'Handover', description: 'Final inspection and handover', icon: 'check-circle' },
];

const ExecutiveProjectDetailScreen = ({ navigation, route }) => {
    const { projectId, initialTab = 'Overview' } = route?.params || {};
    const { user } = useAuth();
    const { isCheckedIn } = useAttendance();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);

    // Timeline state
    const [showTimelineModal, setShowTimelineModal] = useState(false);
    const [selectedStep, setSelectedStep] = useState(null);
    const [timelineForm, setTimelineForm] = useState({ title: '', description: '', status: 'in-progress', startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null); // For editing existing events

    // Media state
    const [uploading, setUploading] = useState(false);
    const [mediaFiles, setMediaFiles] = useState([]); // For fetched media files from API

    // Vendor assignment state
    const [showVendorModal, setShowVendorModal] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [assigningVendor, setAssigningVendor] = useState(false);

    // Progress update state
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [updatingProgress, setUpdatingProgress] = useState(false);

    const tabs = ['Overview', 'Timeline', 'Media', 'Team'];

    // State for timeline events fetched from API
    const [timelineEvents, setTimelineEvents] = useState([]);

    // Update activeTab when initialTab changes (e.g., when navigating from dashboard with action)
    useEffect(() => {
        if (initialTab && initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    useEffect(() => {
        if (!isCheckedIn) {
            navigation.replace('CheckIn');
            return;
        }
        loadProject();
    }, [isCheckedIn, projectId]);

    const loadProject = async () => {
        try {
            setLoading(true);
            // Fetch project, timeline events, and media files together
            const [projectResponse, timelineResponse, filesResponse] = await Promise.all([
                projectsAPI.getProject(projectId),
                projectsAPI.getTimeline(projectId),
                filesAPI.getProjectFiles(projectId).catch(() => ({ success: false, data: { files: [] } }))
            ]);

            if (projectResponse.success) {
                setProject(projectResponse.data.project);
            }

            if (timelineResponse.success) {
                setTimelineEvents(timelineResponse.data.events || []);
            }

            if (filesResponse.success || filesResponse.data) {
                // Filter for images/videos only
                const mediaOnly = (filesResponse.data?.files || []).filter(f =>
                    f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/')
                );
                setMediaFiles(mediaOnly);
            }
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadProject();
        setRefreshing(false);
    };

    const getStatusColor = (status) => {
        const colors = {
            planning: COLORS.warning,
            'in-progress': COLORS.primary,
            'on-hold': COLORS.textMuted,
            completed: COLORS.success,
        };
        return colors[status] || COLORS.textMuted;
    };
    // Helper to get step status based on timeline events
    const getStepStatusFromEvents = (stepName) => {
        const stepEvents = timelineEvents.filter(event =>
            event.title?.toLowerCase().includes(stepName.toLowerCase())
        );
        if (stepEvents.length > 0) {
            const hasCompleted = stepEvents.some(e => e.status === 'completed');
            if (hasCompleted) return 'completed';
            return 'in-progress';
        }
        return 'pending';
    };

    // Timeline Functions
    const openTimelineModal = (step) => {
        const stepIndex = TIMELINE_STEPS.findIndex(s => s.id === step.id);

        // Check if previous step is completed (except for first step)
        if (stepIndex > 0) {
            const prevStep = TIMELINE_STEPS[stepIndex - 1];
            const prevStepStatus = getStepStatusFromEvents(prevStep.name);

            if (prevStepStatus !== 'completed') {
                const message = `You must complete "${prevStep.name}" before updating "${step.name}"`;
                Platform.OS === 'web'
                    ? alert(message)
                    : Alert.alert('Sequential Order Required', message);
                return;
            }
        }

        setSelectedStep(step);
        setTimelineForm({ title: step.name, description: '', status: 'in-progress' });
        setShowTimelineModal(true);
    };

    const saveTimelineEvent = async () => {
        if (!timelineForm.description.trim()) {
            Platform.OS === 'web'
                ? alert('Please enter a description')
                : Alert.alert('Error', 'Please enter a description');
            return;
        }

        try {
            setSaving(true);
            const eventData = {
                eventType: 'milestone',
                title: `${selectedStep.name} - ${timelineForm.title}`,
                description: timelineForm.description,
                status: timelineForm.status,
                visibility: 'public',
            };

            // Add dates if provided
            if (timelineForm.startDate) {
                eventData.startDate = new Date(timelineForm.startDate).toISOString();
            }
            if (timelineForm.endDate) {
                eventData.endDate = new Date(timelineForm.endDate).toISOString();
            }

            const response = await projectsAPI.addTimelineEvent(projectId, eventData);

            if (response.success) {
                setShowTimelineModal(false);
                setTimelineForm({ title: '', description: '', status: 'in-progress', startDate: '', endDate: '' });
                setSelectedStep(null);

                // Check if all 5 steps are completed after this event
                await loadProject(); // Reload to get updated timeline events

                // Fetch timeline events to check completion status
                const timelineRes = await projectsAPI.getTimeline(projectId);
                if (timelineRes.success) {
                    const events = timelineRes.data?.events || [];

                    // Check if all 5 steps have at least one 'completed' event
                    const stepNames = ['Foundation', 'Structural', 'MEP', 'Finishing', 'Handover'];
                    const completedSteps = stepNames.filter(stepName =>
                        events.some(e =>
                            e.title?.toLowerCase().includes(stepName.toLowerCase()) &&
                            e.status === 'completed'
                        )
                    );

                    // If all 5 steps are completed, mark project as completed
                    if (completedSteps.length >= 5) {
                        try {
                            await projectsAPI.updateProject(projectId, { status: 'completed' });
                            Platform.OS === 'web'
                                ? alert('🎉 All steps completed! Project moved to Past Projects.')
                                : Alert.alert('🎉 Project Complete!', 'All 5 steps are done. Project has been moved to Past Projects.');
                        } catch (err) {
                            console.log('Could not auto-complete project:', err);
                        }
                    } else {
                        Platform.OS === 'web'
                            ? alert('Timeline event added successfully!')
                            : Alert.alert('Success', 'Timeline event added successfully!');
                    }
                }
            }
        } catch (error) {
            console.error('Error adding timeline event:', error);
            Platform.OS === 'web'
                ? alert('Failed to add timeline event')
                : Alert.alert('Error', 'Failed to add timeline event');
        } finally {
            setSaving(false);
        }
    };

    // Media Functions
    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera roll permission is needed to upload photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsEditing: false,
                quality: 0.8,
                allowsMultipleSelection: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                await uploadMedia(result.assets);
            }
        } catch (error) {
            console.error('Error picking image:', error);
        }
    };

    const uploadMedia = async (assets) => {
        try {
            setUploading(true);

            for (const asset of assets) {
                const formData = new FormData();
                const filename = asset.uri.split('/').pop() || 'image.jpg';
                const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';

                // Determine MIME type based on extension
                let type = 'image/jpeg'; // default
                if (['jpg', 'jpeg'].includes(ext)) type = 'image/jpeg';
                else if (ext === 'png') type = 'image/png';
                else if (ext === 'gif') type = 'image/gif';
                else if (ext === 'mp4') type = 'video/mp4';
                else if (['mov', 'quicktime'].includes(ext)) type = 'video/quicktime';
                else if (ext === 'avi') type = 'video/x-msvideo';
                else if (ext === 'webm') type = 'video/webm';
                else if (ext === 'wmv') type = 'video/x-ms-wmv';

                if (Platform.OS === 'web') {
                    // For web, we need to fetch the URI and create a Blob
                    try {
                        const response = await fetch(asset.uri);
                        const blob = await response.blob();
                        formData.append('file', blob, filename);
                    } catch (fetchError) {
                        console.error('Error fetching file for web upload:', fetchError);
                        // Fallback: try with file object if available
                        if (asset.file) {
                            formData.append('file', asset.file, filename);
                        } else {
                            throw new Error('Unable to process file for upload');
                        }
                    }
                } else {
                    // For React Native mobile
                    formData.append('file', {
                        uri: asset.uri,
                        name: filename,
                        type,
                    });
                }

                formData.append('category', 'images'); // For GCS organization
                formData.append('projectId', projectId);

                await projectsAPI.uploadImages(projectId, formData);
            }

            Platform.OS === 'web'
                ? alert('Media uploaded successfully!')
                : Alert.alert('Success', 'Media uploaded successfully!');
            loadProject();
        } catch (error) {
            console.error('Error uploading media:', error);
            Platform.OS === 'web'
                ? alert('Failed to upload media: ' + error.message)
                : Alert.alert('Error', 'Failed to upload media');
        } finally {
            setUploading(false);
        }
    };

    // Delete Media (soft delete - only removes from database, not GCS)
    const deleteMedia = async (fileId, fileName) => {
        const confirmDelete = Platform.OS === 'web'
            ? window.confirm(`Delete "${fileName}"? This will hide it from executives but clients can still view it.`)
            : await new Promise((resolve) => {
                Alert.alert(
                    'Delete Media',
                    `Delete "${fileName}"? This will hide it from executives but clients can still view it.`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Delete', style: 'destructive', onPress: () => resolve(true) }
                    ]
                );
            });

        if (!confirmDelete) return;

        try {
            // Soft delete by updating the file record to mark as hidden/deleted
            await filesAPI.deleteFile(fileId);
            Platform.OS === 'web'
                ? alert('Media removed successfully')
                : Alert.alert('Success', 'Media removed successfully');
            loadProject(); // Refresh the list
        } catch (error) {
            console.error('Error deleting media:', error);
            Platform.OS === 'web'
                ? alert('Failed to delete media')
                : Alert.alert('Error', 'Failed to delete media');
        }
    };

    // Vendor Team Employee Functions
    const loadVendors = async () => {
        try {
            setLoadingVendors(true);
            // Fetch vendorTeam employees (role: employee, subRole: vendorTeam)
            const response = await usersAPI.getUsers({ role: 'employee', subRole: 'vendorTeam' });
            if (response.data?.users) {
                // Filter out already assigned vendors
                const assignedIds = project?.assignedVendors?.map(v => v._id) || [];
                const availableVendors = response.data.users.filter(
                    vendor => !assignedIds.includes(vendor._id)
                );
                setVendors(availableVendors);
            }
        } catch (error) {
            console.error('Error loading vendor team employees:', error);
        } finally {
            setLoadingVendors(false);
        }
    };

    const handleAssignVendor = async (vendorId) => {
        try {
            setAssigningVendor(true);
            const response = await projectsAPI.assignVendor(project._id, vendorId);
            if (response.success) {
                Platform.OS === 'web'
                    ? alert('Vendor assigned successfully!')
                    : Alert.alert('Success', 'Vendor assigned successfully!');
                setShowVendorModal(false);
                loadProject();
            }
        } catch (error) {
            console.error('Error assigning vendor:', error);
            Platform.OS === 'web'
                ? alert('Failed to assign vendor')
                : Alert.alert('Error', 'Failed to assign vendor');
        } finally {
            setAssigningVendor(false);
        }
    };

    const openVendorModal = () => {
        loadVendors();
        setShowVendorModal(true);
    };

    // Progress Update Functions
    const openProgressModal = () => {
        setProgressValue(project?.progress?.percentage || 0);
        setShowProgressModal(true);
    };

    const updateProgress = async () => {
        try {
            setUpdatingProgress(true);
            const response = await projectsAPI.updateProgress(projectId, {
                percentage: progressValue,
            });

            if (response.success) {
                Platform.OS === 'web'
                    ? alert('Progress updated successfully!')
                    : Alert.alert('Success', 'Progress updated successfully!');
                setShowProgressModal(false);
                loadProject();
            }
        } catch (error) {
            console.error('Error updating progress:', error);
            Platform.OS === 'web'
                ? alert('Failed to update progress')
                : Alert.alert('Error', 'Failed to update progress');
        } finally {
            setUpdatingProgress(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading project...</Text>
            </View>
        );
    }

    if (!project) {
        return (
            <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={64} color={COLORS.danger} />
                <Text style={styles.errorText}>Project not found</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <LinearGradient colors={[COLORS.background, COLORS.background]} style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
                            <Feather name="arrow-left" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.projectTitle}>{project.title}</Text>
                    {project.projectId && (
                        <Text style={styles.projectIdText}>ID: {project.projectId}</Text>
                    )}

                    <View style={styles.statusBadge}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
                        <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                            {project.status?.replace('-', ' ').toUpperCase()}
                        </Text>
                    </View>

                    {project.client && (
                        <View style={styles.clientInfo}>
                            <Feather name="user" size={14} color={COLORS.textMuted} />
                            <Text style={styles.clientName}>
                                {project.client.firstName} {project.client.lastName}
                            </Text>
                        </View>
                    )}
                </LinearGradient>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.activeTab]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Tab Content */}
                <View style={styles.tabContent}>
                    {activeTab === 'Overview' && <OverviewTab project={project} onUpdateProgress={openProgressModal} />}
                    {activeTab === 'Timeline' && (
                        <TimelineTab
                            steps={TIMELINE_STEPS}
                            onAddEvent={openTimelineModal}
                            project={project}
                            timelineEvents={timelineEvents}
                        />
                    )}
                    {activeTab === 'Media' && (
                        <MediaTab
                            project={project}
                            mediaFiles={mediaFiles}
                            onUpload={pickImage}
                            uploading={uploading}
                            onDelete={deleteMedia}
                        />
                    )}
                    {activeTab === 'Team' && (
                        <VendorTab
                            project={project}
                            onAssign={openVendorModal}
                        />
                    )}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            <ExecutiveBottomNavBar navigation={navigation} activeTab="projects" />

            {/* Timeline Event Modal */}
            <Modal visible={showTimelineModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Timeline Update</Text>

                        {selectedStep && (
                            <View style={styles.stepInfo}>
                                <Feather name={selectedStep.icon} size={24} color={COLORS.primary} />
                                <View style={styles.stepDetails}>
                                    <Text style={styles.stepName}>{selectedStep.name}</Text>
                                    <Text style={styles.stepDesc}>{selectedStep.description}</Text>
                                </View>
                            </View>
                        )}

                        <Text style={styles.modalLabel}>Update Title</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={timelineForm.title}
                            onChangeText={(v) => setTimelineForm(prev => ({ ...prev, title: v }))}
                            placeholder="e.g. Foundation Complete"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.modalLabel}>Description</Text>
                        <TextInput
                            style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                            value={timelineForm.description}
                            onChangeText={(v) => setTimelineForm(prev => ({ ...prev, description: v }))}
                            placeholder="Describe the progress made..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                        />

                        {/* Date Fields - Use native date inputs for web */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>Start Date</Text>
                                {Platform.OS === 'web' ? (
                                    <input
                                        type="date"
                                        value={timelineForm.startDate}
                                        onChange={(e) => setTimelineForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: 12,
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.cardBorder}`,
                                            backgroundColor: COLORS.cardBg,
                                            fontSize: 14,
                                            color: COLORS.text,
                                        }}
                                    />
                                ) : (
                                    <TextInput
                                        style={styles.modalInput}
                                        value={timelineForm.startDate}
                                        onChangeText={(v) => setTimelineForm(prev => ({ ...prev, startDate: v }))}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={COLORS.textMuted}
                                    />
                                )}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalLabel}>End Date</Text>
                                {Platform.OS === 'web' ? (
                                    <input
                                        type="date"
                                        value={timelineForm.endDate}
                                        onChange={(e) => setTimelineForm(prev => ({ ...prev, endDate: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            padding: 12,
                                            borderRadius: 8,
                                            border: `1px solid ${COLORS.cardBorder}`,
                                            backgroundColor: COLORS.cardBg,
                                            fontSize: 14,
                                            color: COLORS.text,
                                        }}
                                    />
                                ) : (
                                    <TextInput
                                        style={styles.modalInput}
                                        value={timelineForm.endDate}
                                        onChangeText={(v) => setTimelineForm(prev => ({ ...prev, endDate: v }))}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={COLORS.textMuted}
                                    />
                                )}
                            </View>
                        </View>

                        {/* Status Selection */}
                        <Text style={styles.modalLabel}>Status</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 12,
                                    borderRadius: 10,
                                    borderWidth: 2,
                                    borderColor: timelineForm.status === 'in-progress' ? COLORS.primary : COLORS.cardBorder,
                                    backgroundColor: timelineForm.status === 'in-progress' ? COLORS.primaryLight : COLORS.cardBg,
                                    gap: 8,
                                }}
                                onPress={() => setTimelineForm(prev => ({ ...prev, status: 'in-progress' }))}
                            >
                                <Feather
                                    name="loader"
                                    size={18}
                                    color={timelineForm.status === 'in-progress' ? COLORS.primary : COLORS.textMuted}
                                />
                                <Text style={{
                                    fontWeight: '600',
                                    color: timelineForm.status === 'in-progress' ? COLORS.primary : COLORS.textMuted,
                                }}>In Progress</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 12,
                                    borderRadius: 10,
                                    borderWidth: 2,
                                    borderColor: timelineForm.status === 'completed' ? COLORS.success : COLORS.cardBorder,
                                    backgroundColor: timelineForm.status === 'completed' ? 'rgba(56, 142, 60, 0.15)' : COLORS.cardBg,
                                    gap: 8,
                                }}
                                onPress={() => setTimelineForm(prev => ({ ...prev, status: 'completed' }))}
                            >
                                <Feather
                                    name="check-circle"
                                    size={18}
                                    color={timelineForm.status === 'completed' ? COLORS.success : COLORS.textMuted}
                                />
                                <Text style={{
                                    fontWeight: '600',
                                    color: timelineForm.status === 'completed' ? COLORS.success : COLORS.textMuted,
                                }}>Completed</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalCancelBtn}
                                onPress={() => {
                                    setShowTimelineModal(false);
                                    setTimelineForm({ title: '', description: '', status: 'in-progress' });
                                    setSelectedStep(null);
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={saveTimelineEvent}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Assign Vendor Team Modal */}
            <Modal visible={showVendorModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign Vendor Team Employee</Text>

                        {loadingVendors ? (
                            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
                        ) : vendors.length === 0 ? (
                            <View style={{ alignItems: 'center', padding: 20 }}>
                                <Feather name="users" size={40} color={COLORS.textMuted} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>
                                    No vendor team employees available
                                </Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 300 }}>
                                {vendors.map((vendor) => (
                                    <TouchableOpacity
                                        key={vendor._id}
                                        style={styles.vendorCard}
                                        onPress={() => handleAssignVendor(vendor._id)}
                                        disabled={assigningVendor}
                                    >
                                        <View style={styles.vendorAvatar}>
                                            <Feather name="user" size={20} color={COLORS.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.vendorName}>{vendor.firstName} {vendor.lastName}</Text>
                                            <Text style={styles.vendorEmail}>Vendor Team • {vendor.email}</Text>
                                        </View>
                                        <Feather name="plus-circle" size={20} color={COLORS.success} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[styles.modalCancelBtn, { marginTop: 16 }]}
                            onPress={() => setShowVendorModal(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Progress Update Modal */}
            <Modal visible={showProgressModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Progress</Text>

                        <View style={{ alignItems: 'center', marginVertical: 20 }}>
                            {/* Editable Progress Input */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <TextInput
                                    style={{
                                        fontSize: 48,
                                        fontWeight: 'bold',
                                        color: COLORS.primary,
                                        textAlign: 'center',
                                        minWidth: 120,
                                        borderBottomWidth: 2,
                                        borderBottomColor: COLORS.primaryLight,
                                        paddingBottom: 4,
                                    }}
                                    value={String(progressValue)}
                                    onChangeText={(text) => {
                                        const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
                                        if (!isNaN(num)) {
                                            setProgressValue(Math.min(100, Math.max(0, num)));
                                        } else if (text === '') {
                                            setProgressValue(0);
                                        }
                                    }}
                                    keyboardType="numeric"
                                    maxLength={3}
                                />
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginLeft: 4 }}>%</Text>
                            </View>
                            {/* Progress Bar */}
                            <View style={[styles.progressBar, { width: '100%', height: 12 }]}>
                                <View style={[styles.progressFill, { width: `${progressValue}%` }]} />
                            </View>
                            <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>
                                Tap the number above to enter directly, or use buttons below
                            </Text>
                        </View>

                        {/* Quick Adjust Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                            <TouchableOpacity
                                style={[styles.progressBtn, { backgroundColor: COLORS.danger }]}
                                onPress={() => setProgressValue(Math.max(0, progressValue - 10))}
                            >
                                <Text style={styles.progressBtnText}>-10</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.progressBtn, { backgroundColor: COLORS.warning }]}
                                onPress={() => setProgressValue(Math.max(0, progressValue - 5))}
                            >
                                <Text style={styles.progressBtnText}>-5</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.progressBtn, { backgroundColor: COLORS.success }]}
                                onPress={() => setProgressValue(Math.min(100, progressValue + 5))}
                            >
                                <Text style={styles.progressBtnText}>+5</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.progressBtn, { backgroundColor: COLORS.primary }]}
                                onPress={() => setProgressValue(Math.min(100, progressValue + 10))}
                            >
                                <Text style={styles.progressBtnText}>+10</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick Preset Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            {[0, 25, 50, 75, 100].map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        backgroundColor: progressValue === val ? COLORS.primary : COLORS.cardBg,
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: COLORS.cardBorder,
                                    }}
                                    onPress={() => setProgressValue(val)}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: progressValue === val ? '#FFFFFF' : COLORS.text,
                                    }}>{val}%</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowProgressModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalSaveBtn}
                                onPress={updateProgress}
                                disabled={updatingProgress}
                            >
                                {updatingProgress ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.modalSaveText}>Save Progress</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// Overview Tab Component
const OverviewTab = ({ project, onUpdateProgress }) => (
    <View style={styles.overviewContainer}>
        <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Project Details</Text>

            <View style={styles.infoRow}>
                <Feather name="file-text" size={16} color={COLORS.textMuted} />
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{project.description || 'No description'}</Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <Feather name="map-pin" size={16} color={COLORS.textMuted} />
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Location</Text>
                    <Text style={styles.infoValue}>
                        {project.location?.city || 'Not specified'}
                    </Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <Feather name="dollar-sign" size={16} color={COLORS.textMuted} />
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Budget</Text>
                    <Text style={styles.infoValue}>
                        ₹{(project.budget?.estimated || 0).toLocaleString()}
                    </Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <Feather name="calendar" size={16} color={COLORS.textMuted} />
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Timeline</Text>
                    <Text style={styles.infoValue}>
                        {project.timeline?.startDate
                            ? new Date(project.timeline.startDate).toLocaleDateString()
                            : 'Not set'} → {project.timeline?.expectedEndDate
                                ? new Date(project.timeline.expectedEndDate).toLocaleDateString()
                                : 'Not set'}
                    </Text>
                </View>
            </View>

            <View style={styles.infoRow}>
                <Feather name="bar-chart-2" size={16} color={COLORS.textMuted} />
                <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Progress</Text>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[styles.progressFill, { width: `${project.progress?.percentage || 0}%` }]}
                            />
                        </View>
                        <Text style={styles.progressText}>{project.progress?.percentage || 0}%</Text>
                    </View>
                </View>
            </View>

            {/* Update Progress Button */}
            <TouchableOpacity
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.primaryLight,
                    paddingVertical: 12,
                    borderRadius: 8,
                    marginTop: 16,
                }}
                onPress={onUpdateProgress}
            >
                <Feather name="edit-2" size={16} color={COLORS.primary} />
                <Text style={{ color: COLORS.primary, fontWeight: '600', marginLeft: 8 }}>
                    Update Progress
                </Text>
            </TouchableOpacity>
        </View>
    </View>
);

// Timeline Tab Component with Step Status
const TimelineTab = ({ steps, onAddEvent, project, timelineEvents = [] }) => {
    const progressPercent = project?.progress?.percentage || 0;

    // Find events for each step based on step name in the title
    const getStepEvents = (stepName) => {
        return timelineEvents.filter(event =>
            event.title?.toLowerCase().includes(stepName.toLowerCase())
        );
    };

    // Determine step status based on the LATEST timeline event for that step
    const getStepStatus = (step, index) => {
        const stepEvents = getStepEvents(step.name);

        if (stepEvents.length > 0) {
            // Sort by createdAt descending to get the latest event first
            const sortedEvents = [...stepEvents].sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );

            // Use the latest event's status
            const latestEvent = sortedEvents[0];
            return latestEvent.status || 'in-progress';
        }

        return 'pending';
    };

    // Calculate current step index based on actual status
    const getCurrentStepIndex = () => {
        for (let i = steps.length - 1; i >= 0; i--) {
            const status = getStepStatus(steps[i], i);
            if (status === 'completed' || status === 'in-progress') {
                return i;
            }
        }
        return 0;
    };

    const currentStepIndex = getCurrentStepIndex();

    const getStepStatusColor = (status) => {
        switch (status) {
            case 'completed': return COLORS.success;
            case 'in-progress': return COLORS.primary;
            default: return COLORS.textMuted;
        }
    };

    const getStepStatusLabel = (status) => {
        switch (status) {
            case 'completed': return 'COMPLETED';
            case 'in-progress': return 'IN PROGRESS';
            default: return 'PENDING';
        }
    };
    // Count completed steps for elevator position
    const completedStepsCount = steps.filter((step, idx) => getStepStatus(step, idx) === 'completed').length;
    const currentStepName = steps[currentStepIndex]?.name || 'Foundation';
    const currentStatus = getStepStatus(steps[currentStepIndex], currentStepIndex);

    return (
        <View style={styles.timelineContainer}>
            {/* Elevator Progress Indicator */}
            <View style={{
                backgroundColor: COLORS.cardBg,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: COLORS.cardBorder,
            }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: currentStatus === 'completed' ? COLORS.success : COLORS.primary,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <Feather
                            name={currentStatus === 'completed' ? "check-circle" : "arrow-up"}
                            size={22}
                            color="#FFFFFF"
                        />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>
                            Project Elevator
                        </Text>
                        <Text style={{ fontSize: 13, color: COLORS.textMuted }}>
                            Currently at: <Text style={{ fontWeight: '600', color: COLORS.primary }}>{currentStepName}</Text>
                        </Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.primary }}>
                            {completedStepsCount}/{steps.length}
                        </Text>
                        <Text style={{ fontSize: 10, color: COLORS.textMuted }}>FLOORS</Text>
                    </View>
                </View>

                {/* Visual Elevator Shaft */}
                <View style={{
                    flexDirection: 'row',
                    height: 120,
                    backgroundColor: 'rgba(184, 134, 11, 0.08)',
                    borderRadius: 12,
                    overflow: 'hidden',
                }}>
                    {/* Building floors on left */}
                    <View style={{ width: 50, borderRightWidth: 2, borderRightColor: 'rgba(184, 134, 11, 0.2)' }}>
                        {[...steps].reverse().map((step, idx) => {
                            const actualIndex = steps.length - 1 - idx;
                            const status = getStepStatus(step, actualIndex);
                            const isCurrentFloor = actualIndex === currentStepIndex;
                            return (
                                <View
                                    key={step.id}
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderBottomWidth: idx < steps.length - 1 ? 1 : 0,
                                        borderBottomColor: 'rgba(184, 134, 11, 0.15)',
                                        backgroundColor: status === 'completed' ? 'rgba(56, 142, 60, 0.15)' :
                                            isCurrentFloor ? 'rgba(184, 134, 11, 0.2)' : 'transparent',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '700',
                                        color: status === 'completed' ? COLORS.success :
                                            isCurrentFloor ? COLORS.primary : COLORS.textMuted,
                                    }}>
                                        {steps.length - idx}F
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    {/* Elevator shaft with car */}
                    <View style={{ flex: 1, position: 'relative' }}>
                        {/* Floor labels */}
                        {[...steps].reverse().map((step, idx) => {
                            const actualIndex = steps.length - 1 - idx;
                            const status = getStepStatus(step, actualIndex);
                            return (
                                <View
                                    key={step.id}
                                    style={{
                                        flex: 1,
                                        justifyContent: 'center',
                                        paddingLeft: 12,
                                        borderBottomWidth: idx < steps.length - 1 ? 1 : 0,
                                        borderBottomColor: 'rgba(184, 134, 11, 0.1)',
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 11,
                                        color: status === 'completed' ? COLORS.success : COLORS.textMuted,
                                        fontWeight: status === 'completed' ? '600' : '400',
                                    }}>
                                        {status === 'completed' ? '✓ ' : ''}{step.name}
                                    </Text>
                                </View>
                            );
                        })}

                        {/* Elevator Car - positioned based on current step */}
                        <View style={{
                            position: 'absolute',
                            right: 10,
                            top: `${((steps.length - 1 - currentStepIndex) / steps.length) * 100}%`,
                            width: 36,
                            height: `${100 / steps.length}%`,
                            backgroundColor: currentStatus === 'completed' ? COLORS.success : COLORS.primary,
                            borderRadius: 6,
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 3,
                        }}>
                            <Feather name="box" size={16} color="#FFFFFF" />
                        </View>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginTop: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Progress</Text>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.primary }}>
                            {Math.round((completedStepsCount / steps.length) * 100)}%
                        </Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(184, 134, 11, 0.2)', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{
                            height: '100%',
                            width: `${(completedStepsCount / steps.length) * 100}%`,
                            backgroundColor: COLORS.success,
                            borderRadius: 3
                        }} />
                    </View>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Construction Progress (5 Steps)</Text>
            <Text style={styles.sectionSubtitle}>Complete steps in order to progress</Text>

            {steps.map((step, index) => {
                const status = getStepStatus(step, index);
                const statusColor = getStepStatusColor(status);
                const isCompleted = status === 'completed';
                const isInProgress = status === 'in-progress';

                // Check if step is locked (previous step not completed)
                const prevStepStatus = index > 0 ? getStepStatus(steps[index - 1], index - 1) : 'completed';
                const isLocked = index > 0 && prevStepStatus !== 'completed' && status === 'pending';

                return (
                    <TouchableOpacity
                        key={step.id}
                        style={[styles.timelineStep, isLocked && { opacity: 0.5 }]}
                        onPress={() => onAddEvent(step)}
                        disabled={isLocked}
                    >
                        <View style={styles.stepNumberContainer}>
                            <View style={[
                                styles.stepNumber,
                                {
                                    backgroundColor: isLocked ? COLORS.textMuted : statusColor,
                                    borderWidth: isInProgress ? 3 : 0,
                                    borderColor: isInProgress ? COLORS.primaryLight : 'transparent',
                                }
                            ]}>
                                {isLocked ? (
                                    <Feather name="lock" size={14} color="#FFFFFF" />
                                ) : isCompleted ? (
                                    <Feather name="check" size={16} color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.stepNumberText}>{step.id}</Text>
                                )}
                            </View>
                            {index < steps.length - 1 && (
                                <View style={[
                                    styles.stepLine,
                                    { backgroundColor: isCompleted ? COLORS.success : COLORS.primaryLight }
                                ]} />
                            )}
                        </View>

                        <View style={[
                            styles.stepCard,
                            isInProgress && { borderColor: COLORS.primary, borderWidth: 2 }
                        ]}>
                            <View style={styles.stepHeader}>
                                <Feather name={step.icon} size={20} color={statusColor} />
                                <Text style={styles.stepTitle}>{step.name}</Text>
                                {/* Status Badge */}
                                <View style={{
                                    marginLeft: 'auto',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    backgroundColor: status === 'completed'
                                        ? 'rgba(56, 142, 60, 0.15)'
                                        : status === 'in-progress'
                                            ? 'rgba(184, 134, 11, 0.15)'
                                            : 'rgba(102, 102, 102, 0.15)',
                                    borderRadius: 12,
                                }}>
                                    <Text style={{
                                        fontSize: 10,
                                        fontWeight: '700',
                                        color: statusColor,
                                        letterSpacing: 0.5,
                                    }}>{getStepStatusLabel(status)}</Text>
                                </View>
                            </View>
                            <Text style={styles.stepDescription}>{step.description}</Text>
                            <View style={styles.addUpdateBtn}>
                                <Feather name="plus" size={14} color={COLORS.primary} />
                                <Text style={styles.addUpdateText}>Add Update</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

// Media Tab Component with Fullscreen Image Viewer
const MediaTab = ({ project, mediaFiles = [], onUpload, uploading, onDelete }) => {
    const [viewerVisible, setViewerVisible] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Combine project images and uploaded media files
    const allMedia = [
        ...(project?.images || []).map(img => ({ ...img, isProjectImage: true })),
        ...mediaFiles.map(f => ({
            url: f.url || f.downloadUrl || f.path,
            name: f.originalName || f.filename,
            type: f.mimeType,
            uploadedAt: f.createdAt,
            fileId: f._id, // Keep the file ID for deletion
            isProjectImage: false
        }))
    ];

    // Filter only images for slideshow (exclude videos)
    const imageOnlyMedia = allMedia.filter(m => !m.type?.startsWith('video/'));

    const openImageViewer = (index) => {
        // Find the index in imageOnlyMedia
        const imageIndex = imageOnlyMedia.findIndex(img => img.url === allMedia[index].url);
        if (imageIndex >= 0) {
            setCurrentImageIndex(imageIndex);
            setViewerVisible(true);
        }
    };

    const goToPrev = () => {
        setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : imageOnlyMedia.length - 1));
    };

    const goToNext = () => {
        setCurrentImageIndex(prev => (prev < imageOnlyMedia.length - 1 ? prev + 1 : 0));
    };

    return (
        <View style={styles.mediaContainer}>
            <TouchableOpacity
                style={styles.uploadBtn}
                onPress={onUpload}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                    <>
                        <Feather name="upload-cloud" size={24} color="#FFFFFF" />
                        <Text style={styles.uploadBtnText}>Upload Photos / Videos</Text>
                    </>
                )}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.sectionTitle}>Project Gallery</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
                    {allMedia.length} {allMedia.length === 1 ? 'file' : 'files'}
                </Text>
            </View>

            {allMedia.length > 0 ? (
                <View style={styles.galleryGrid}>
                    {allMedia.map((media, index) => (
                        <View key={index} style={styles.galleryItem}>
                            <TouchableOpacity
                                style={{ position: 'relative' }}
                                onPress={() => !media.type?.startsWith('video/') && openImageViewer(index)}
                            >
                                {media.type?.startsWith('video/') ? (
                                    <View style={[styles.galleryImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
                                        <Feather name="play-circle" size={32} color="#FFFFFF" />
                                        <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>Video</Text>
                                    </View>
                                ) : (
                                    <Image source={{ uri: media.url }} style={styles.galleryImage} />
                                )}

                                {/* Delete button - only for uploaded files, not project images */}
                                {!media.isProjectImage && media.fileId && onDelete && (
                                    <TouchableOpacity
                                        style={{
                                            position: 'absolute',
                                            top: 5,
                                            right: 5,
                                            backgroundColor: 'rgba(211, 47, 47, 0.9)',
                                            borderRadius: 12,
                                            padding: 4,
                                        }}
                                        onPress={(e) => {
                                            e.stopPropagation && e.stopPropagation();
                                            onDelete(media.fileId, media.name);
                                        }}
                                    >
                                        <Feather name="trash-2" size={14} color="#FFFFFF" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.galleryLabel} numberOfLines={1}>
                                {media.name || `Photo ${index + 1}`}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.emptyGallery}>
                    <Feather name="image" size={48} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>No photos yet</Text>
                    <Text style={styles.emptySubtext}>Upload site progress photos</Text>
                </View>
            )}

            {/* Fullscreen Image Viewer Modal */}
            <Modal
                visible={viewerVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.95)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    {/* Close Button */}
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            top: Platform.OS === 'ios' ? 50 : 30,
                            right: 20,
                            zIndex: 10,
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            borderRadius: 20,
                            padding: 10,
                        }}
                        onPress={() => setViewerVisible(false)}
                    >
                        <Feather name="x" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    {/* Image Counter */}
                    <View style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? 55 : 35,
                        left: 20,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 15,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                            {currentImageIndex + 1} / {imageOnlyMedia.length}
                        </Text>
                    </View>

                    {/* Main Image */}
                    {imageOnlyMedia.length > 0 && (
                        <Image
                            source={{ uri: imageOnlyMedia[currentImageIndex]?.url }}
                            resizeMode="contain"
                            style={{
                                width: '90%',
                                height: '70%',
                            }}
                        />
                    )}

                    {/* Image Name */}
                    <Text style={{
                        color: '#fff',
                        fontSize: 14,
                        marginTop: 15,
                        textAlign: 'center',
                        paddingHorizontal: 20,
                    }}>
                        {imageOnlyMedia[currentImageIndex]?.name || `Image ${currentImageIndex + 1}`}
                    </Text>

                    {/* Navigation Buttons */}
                    {imageOnlyMedia.length > 1 && (
                        <>
                            {/* Previous Button */}
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    left: 10,
                                    top: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: 25,
                                    padding: 12,
                                }}
                                onPress={goToPrev}
                            >
                                <Feather name="chevron-left" size={28} color="#FFFFFF" />
                            </TouchableOpacity>

                            {/* Next Button */}
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: '50%',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    borderRadius: 25,
                                    padding: 12,
                                }}
                                onPress={goToNext}
                            >
                                <Feather name="chevron-right" size={28} color="#FFFFFF" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
};

// Vendor/Team Tab Component for Executive
const VendorTab = ({ project, onAssign }) => (
    <View style={styles.mediaContainer}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>Assigned Vendor Team</Text>
            <TouchableOpacity
                style={[styles.addUpdateBtn, { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }]}
                onPress={onAssign}
            >
                <Feather name="user-plus" size={14} color={COLORS.primary} />
                <Text style={styles.addUpdateText}>Assign</Text>
            </TouchableOpacity>
        </View>

        {project.assignedVendors && project.assignedVendors.length > 0 ? (
            project.assignedVendors.map((vendor, index) => (
                <View key={vendor._id || index} style={styles.vendorCard}>
                    <View style={styles.vendorAvatar}>
                        <Feather name="user" size={20} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.vendorName}>{vendor.firstName} {vendor.lastName}</Text>
                        <Text style={styles.vendorEmail}>{vendor.email || 'Vendor Team Employee'}</Text>
                    </View>
                    <View style={styles.vendorBadge}>
                        <Text style={styles.vendorBadgeText}>VENDOR TEAM</Text>
                    </View>
                </View>
            ))
        ) : (
            <View style={styles.emptyGallery}>
                <Feather name="users" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No vendor team assigned</Text>
                <Text style={styles.emptySubtext}>Tap "Assign" to add vendor team employees</Text>
            </View>
        )}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.textMuted,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    errorText: {
        fontSize: 18,
        color: COLORS.danger,
        marginTop: 16,
    },
    backBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 8,
    },
    backBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerBackBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    projectTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    projectIdText: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clientName: {
        fontSize: 14,
        color: COLORS.textMuted,
    },
    tabsContainer: {
        backgroundColor: COLORS.background,
        paddingTop: 8,
    },
    tabsScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    tab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginRight: 8,
    },
    activeTab: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    tabContent: {
        padding: 20,
    },

    // Overview Tab
    overviewContainer: {},
    infoCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(184, 134, 11, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.primary,
    },

    // Timeline Tab
    timelineContainer: {},
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 20,
    },
    timelineStep: {
        flexDirection: 'row',
        marginBottom: 0,
    },
    stepNumberContainer: {
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumberText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 14,
    },
    stepLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.primaryLight,
        marginVertical: 4,
    },
    stepCard: {
        flex: 1,
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 12,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    stepDescription: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginBottom: 12,
    },
    addUpdateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    addUpdateText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },

    // Media Tab
    mediaContainer: {},
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 10,
        marginBottom: 24,
    },
    uploadBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    galleryItem: {
        width: '31%',
    },
    galleryImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
    },
    galleryLabel: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 4,
        textAlign: 'center',
    },
    emptyGallery: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 4,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 20,
    },
    stepInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        gap: 12,
    },
    stepDetails: {
        flex: 1,
    },
    stepName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    stepDesc: {
        fontSize: 13,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        color: COLORS.text,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    modalSaveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
    },
    modalSaveText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    // Vendor Tab Styles
    vendorCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    vendorAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    vendorName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    vendorEmail: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 2,
    },
    vendorBadge: {
        backgroundColor: COLORS.primaryLight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    vendorBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.primary,
        letterSpacing: 0.5,
    },
    // Progress Button Styles
    progressBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ExecutiveProjectDetailScreen;

