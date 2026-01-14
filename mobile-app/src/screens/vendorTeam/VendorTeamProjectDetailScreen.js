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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI, materialRequestsAPI, usersAPI } from '../../utils/api';
import theme from '../../styles/theme';

const MATERIAL_CATEGORIES = [
    { value: 'cement', label: 'Cement' },
    { value: 'steel', label: 'Steel' },
    { value: 'wood', label: 'Wood' },
    { value: 'tiles', label: 'Tiles' },
    { value: 'paint', label: 'Paint' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'hardware', label: 'Hardware' },
    { value: 'other', label: 'Other' },
];

const UNITS = ['pcs', 'kg', 'lbs', 'sqft', 'sqm', 'cubic_ft', 'cubic_m', 'liters', 'gallons', 'meters', 'feet'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const showMessage = (title, message) => {
    const text = `${title}: ${message}`;
    if (Platform.OS === 'web') {
        // RN Web doesn't reliably implement Alert.alert
        // eslint-disable-next-line no-alert
        alert(text);
        return;
    }
    Alert.alert(title, message);
};

const formatYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseYYYYMMDDToISO = (value) => {
    const trimmed = String(value || '').trim();
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    if (Number.isNaN(utcDate.getTime())) return null;
    // Ensure input didn't overflow (e.g. 2026-02-31)
    if (utcDate.getUTCFullYear() !== year || utcDate.getUTCMonth() !== month - 1 || utcDate.getUTCDate() !== day) return null;
    return utcDate.toISOString();
};

const VendorTeamProjectDetailScreen = ({ navigation, route }) => {
    const { projectId } = route.params;
    const { user } = useAuth();

    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');

    // Material request state
    const [materialRequests, setMaterialRequests] = useState([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [requestForm, setRequestForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        requiredBy: '',
        materials: [{ name: '', quantity: '', unit: 'pcs', category: 'other' }],
        selectedVendor: null,
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [expandedVendor, setExpandedVendor] = useState(null);
    const [expandedRequest, setExpandedRequest] = useState(null);
    const [showRequiredByPicker, setShowRequiredByPicker] = useState(false);

    const tabs = ['Overview', 'Vendors', 'Material Requests'];

    useEffect(() => {
        loadProject();
        loadMaterialRequests();
        loadVendors();
    }, [projectId]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const response = await projectsAPI.getProject(projectId);
            if (response.success) {
                setProject(response.data.project);
            }
        } catch (error) {
            console.error('Error loading project:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMaterialRequests = async () => {
        try {
            const response = await materialRequestsAPI.getMaterialRequests({ projectId });
            if (response.success) {
                setMaterialRequests(response.data.materialRequests || []);
            }
        } catch (error) {
            console.error('Error loading material requests:', error);
        }
    };

    const loadVendors = async () => {
        try {
            // Fetch actual vendors (role: vendor)
            const response = await usersAPI.getUsers({ role: 'vendor', limit: 200 });
            if (response.success && response.data?.users) {
                setVendors(response.data.users);
            }
        } catch (error) {
            console.error('Error loading vendors:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadProject(), loadMaterialRequests()]);
        setRefreshing(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': case 'fulfilled': case 'approved': return theme.colors.success[600];
            case 'in-progress': case 'pending': return theme.colors.warning[600];
            case 'rejected': return theme.colors.error[600];
            default: return theme.colors.text.secondary;
        }
    };

    const addMaterial = () => {
        setRequestForm(prev => ({
            ...prev,
            materials: [...prev.materials, { name: '', quantity: '', unit: 'pcs', category: 'other' }]
        }));
    };

    const updateMaterial = (index, field, value) => {
        setRequestForm(prev => {
            const materials = [...prev.materials];
            materials[index] = { ...materials[index], [field]: value };
            return { ...prev, materials };
        });
    };

    const removeMaterial = (index) => {
        if (requestForm.materials.length > 1) {
            setRequestForm(prev => ({
                ...prev,
                materials: prev.materials.filter((_, i) => i !== index)
            }));
        }
    };

    const onRequiredByChange = (_event, selectedDate) => {
        // Android fires with undefined when dismissed
        setShowRequiredByPicker(Platform.OS === 'ios');
        if (!selectedDate) return;
        setRequestForm(prev => ({ ...prev, requiredBy: formatYYYYMMDD(selectedDate) }));
    };

    const submitMaterialRequest = async () => {
        const { title, materials, priority, requiredBy, selectedVendor } = requestForm;

        if (!title.trim()) {
            showMessage('Error', 'Please enter a title');
            return;
        }

        const validMaterials = (materials || [])
            .map((m) => ({
                name: String(m?.name || '').trim(),
                quantityRaw: String(m?.quantity || '').trim(),
                unit: m?.unit || 'pcs',
                category: m?.category || 'other',
            }))
            .filter((m) => m.name.length > 0 || m.quantityRaw.length > 0);

        if (validMaterials.length === 0) {
            showMessage('Error', 'Please add at least one material');
            return;
        }

        const hasInvalidMaterial = validMaterials.some((m) => {
            const qty = Number(m.quantityRaw);
            return !m.name || !Number.isFinite(qty) || qty <= 0;
        });

        if (hasInvalidMaterial) {
            showMessage('Error', 'Each material must have a name and quantity > 0');
            return;
        }

        const requiredByISO = parseYYYYMMDDToISO(requiredBy);
        if (!requiredByISO) {
            showMessage('Error', 'Required by date must be in YYYY-MM-DD format');
            return;
        }

        try {
            setSubmitting(true);

            const formattedMaterials = validMaterials.map((m) => ({
                name: m.name,
                quantity: Number(m.quantityRaw),
                unit: m.unit,
                category: m.category,
                requiredBy: requiredByISO,
            }));

            const requestData = {
                projectId: projectId,
                title: title.trim(),
                description: requestForm.description.trim(),
                priority,
                requiredBy: requiredByISO,
                materials: formattedMaterials,
                assignedVendors: selectedVendor ? [{ vendor: selectedVendor }] : [],
            };

            console.log('[VendorTeam] Submitting material request', requestData);

            const response = await materialRequestsAPI.createMaterialRequest(requestData);

            console.log('[VendorTeam] Material request API response', response);

            if (response.success) {
                setShowRequestModal(false);
                setRequestForm({
                    title: '',
                    description: '',
                    priority: 'medium',
                    requiredBy: '',
                    materials: [{ name: '', quantity: '', unit: 'pcs', category: 'other' }],
                    selectedVendor: null,
                });
                setSuccessMessage('Material request sent successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
                loadMaterialRequests();
            } else {
                throw new Error(response.message || 'Failed to create request');
            }
        } catch (error) {
            console.error('Error creating material request:', error);
            showMessage('Error', 'Failed to create request: ' + (error?.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    // Overview Tab
    const OverviewTab = () => (
        <View style={styles.tabContent}>
            {/* Progress Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Project Progress</Text>
                <View style={styles.progressRow}>
                    <View style={styles.progressBarLarge}>
                        <View style={[styles.progressFill, { width: `${project?.progress?.percentage || 0}%` }]} />
                    </View>
                    <Text style={styles.progressPercent}>{project?.progress?.percentage || 0}%</Text>
                </View>
                <Text style={styles.progressHint}>
                    Status: {project?.status?.replace('-', ' ').toUpperCase() || 'N/A'}
                </Text>
            </View>

            {/* Client Info */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Client Information</Text>
                {project?.client ? (
                    <>
                        <View style={styles.infoRow}>
                            <Feather name="user" size={16} color={theme.colors.text.secondary} />
                            <Text style={styles.infoText}>
                                {project.client.firstName} {project.client.lastName}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Feather name="mail" size={16} color={theme.colors.text.secondary} />
                            <Text style={styles.infoText}>{project.client.email}</Text>
                        </View>
                    </>
                ) : (
                    <Text style={styles.emptyText}>No client assigned</Text>
                )}
            </View>

            {/* Project Info */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Project Details</Text>
                <View style={styles.infoRow}>
                    <Feather name="calendar" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.infoText}>
                        Start: {project?.timeline?.startDate ? new Date(project.timeline.startDate).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>
                <View style={styles.infoRow}>
                    <Feather name="flag" size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.infoText}>
                        End: {project?.timeline?.expectedEndDate ? new Date(project.timeline.expectedEndDate).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>
            </View>

            {/* Team Working on Project */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Team Working</Text>

                {/* Executive */}
                {project?.assignedEmployees && project.assignedEmployees.length > 0 ? (
                    project.assignedEmployees.map((employee, index) => (
                        <View key={employee._id || index} style={styles.teamMember}>
                            <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
                                <Feather name="hard-hat" size={16} color={theme.colors.primary[600]} />
                            </View>
                            <View style={{ marginLeft: 10 }}>
                                <Text style={styles.memberName}>
                                    {employee.firstName} {employee.lastName}
                                </Text>
                                <Text style={styles.memberRole}>Executive</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.infoRow}>
                        <Feather name="user-x" size={16} color={theme.colors.text.secondary} />
                        <Text style={styles.infoText}>No executive assigned</Text>
                    </View>
                )}

                {/* Design Team */}
                {project?.designTeam && project.designTeam.length > 0 && (
                    <>
                        <View style={{ height: 8 }} />
                        {project.designTeam.map((designer, index) => (
                            <View key={designer._id || index} style={styles.teamMember}>
                                <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
                                    <Feather name="pen-tool" size={16} color={theme.colors.primary[600]} />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.memberName}>
                                        {designer.firstName} {designer.lastName}
                                    </Text>
                                    <Text style={styles.memberRole}>Designer</Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* Vendor Team */}
                {project?.assignedVendors && project.assignedVendors.length > 0 && (
                    <>
                        <View style={{ height: 8 }} />
                        {project.assignedVendors.map((vendor, index) => (
                            <View key={vendor._id || index} style={styles.teamMember}>
                                <View style={[styles.avatar, { backgroundColor: theme.colors.primary[100] }]}>
                                    <Feather name="truck" size={16} color={theme.colors.primary[600]} />
                                </View>
                                <View style={{ marginLeft: 10 }}>
                                    <Text style={styles.memberName}>
                                        {vendor.firstName} {vendor.lastName}
                                    </Text>
                                    <Text style={styles.memberRole}>Vendor Team</Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </View>
        </View>
    );

    // Team Tab
    const TeamTab = () => (
        <View style={styles.tabContent}>
            {/* Executive Team */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Executive Team</Text>
                {project?.assignedEmployee ? (
                    <View style={styles.teamMember}>
                        <View style={styles.avatar}>
                            <Feather name="hard-hat" size={20} color={theme.colors.primary[600]} />
                        </View>
                        <View style={styles.memberInfo}>
                            <Text style={styles.memberName}>
                                {project.assignedEmployee.firstName} {project.assignedEmployee.lastName}
                            </Text>
                            <Text style={styles.memberRole}>Executive</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.emptyText}>No executive assigned</Text>
                )}
            </View>

            {/* Design Team */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Design Team</Text>
                {project?.designTeam && project.designTeam.length > 0 ? (
                    project.designTeam.map((member, index) => (
                        <View key={index} style={styles.teamMember}>
                            <View style={styles.avatar}>
                                <Feather name="pen-tool" size={20} color={theme.colors.primary[600]} />
                            </View>
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>
                                    {member.firstName} {member.lastName}
                                </Text>
                                <Text style={styles.memberRole}>Designer</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No designers assigned</Text>
                )}
            </View>
        </View>
    );

    // Vendors Tab
    const VendorsTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Available Vendors</Text>
                {vendors.length > 0 ? (
                    vendors.map((vendor) => (
                        <View
                            key={vendor._id}
                            style={{
                                borderBottomWidth: 1,
                                borderBottomColor: theme.colors.primary[100],
                                paddingVertical: 12,
                            }}
                        >
                            <TouchableOpacity
                                style={styles.vendorItem}
                                onPress={() => setExpandedVendor(expandedVendor === vendor._id ? null : vendor._id)}
                            >
                                <View style={styles.avatar}>
                                    <Feather name="user" size={20} color={theme.colors.primary[600]} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.memberName}>
                                        {vendor.vendorDetails?.companyName || `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || 'Vendor'}
                                    </Text>
                                    <Text style={styles.memberRole}>{vendor.email || 'No email'}</Text>
                                </View>
                                <Feather
                                    name={expandedVendor === vendor._id ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color={theme.colors.text.secondary}
                                />
                            </TouchableOpacity>

                            {expandedVendor === vendor._id && (
                                <View
                                    style={{
                                        backgroundColor: theme.colors.primary[50],
                                        padding: 12,
                                        borderRadius: 8,
                                        marginTop: 8,
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Feather name="mail" size={14} color={theme.colors.primary[600]} />
                                        <Text style={{ marginLeft: 8, color: theme.colors.text.primary }}>{vendor.email || 'No email'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                        <Feather name="phone" size={14} color={theme.colors.primary[600]} />
                                        <Text style={{ marginLeft: 8, color: theme.colors.text.primary }}>{vendor.phone || 'No phone available'}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Feather name="briefcase" size={14} color={theme.colors.primary[600]} />
                                        <Text style={{ marginLeft: 8, color: theme.colors.text.primary }}>
                                            {vendor.vendorDetails?.specialization || 'Vendor'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No vendors available</Text>
                )}
            </View>
        </View>
    );

    // Material Requests Tab
    const MaterialRequestsTab = () => (
        <View style={styles.tabContent}>
            {/* New Request Button */}
            <TouchableOpacity
                style={styles.addRequestBtn}
                onPress={() => setShowRequestModal(true)}
            >
                <Feather name="plus" size={20} color="#FFFFFF" />
                <Text style={styles.addRequestBtnText}>Create Material Request</Text>
            </TouchableOpacity>

            {/* Sent Requests */}
            <Text style={styles.sectionTitle}>Sent Requests</Text>
            {materialRequests.length > 0 ? (
                materialRequests.map((request, index) => (
                    <View key={request._id || index}>
                        <TouchableOpacity
                            style={styles.requestCard}
                            onPress={() => setExpandedRequest(expandedRequest === request._id ? null : request._id)}
                        >
                            <View style={styles.requestHeader}>
                                <Text style={styles.requestTitle}>{request.title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) + '20' }]}>
                                        <Text style={[styles.statusBadgeText, { color: getStatusColor(request.status) }]}>
                                            {request.status?.toUpperCase()}
                                        </Text>
                                    </View>
                                    <Feather
                                        name={expandedRequest === request._id ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={theme.colors.text.secondary}
                                    />
                                </View>
                            </View>
                            <Text style={styles.requestMeta}>
                                {request.materials?.length || 0} materials • Priority: {request.priority}
                            </Text>
                            <Text style={styles.requestDate}>
                                Required by: {new Date(request.requiredBy).toLocaleDateString()}
                            </Text>
                        </TouchableOpacity>

                        {/* Expanded Details */}
                        {expandedRequest === request._id && (
                            <View style={{
                                backgroundColor: theme.colors.primary[100],
                                padding: 12,
                                marginHorizontal: 4,
                                marginBottom: 8,
                                borderRadius: 8,
                            }}>
                                {request.description && (
                                    <View style={{ marginBottom: 12 }}>
                                        <Text style={{ fontWeight: '600', color: theme.colors.text.primary, marginBottom: 4 }}>Description:</Text>
                                        <Text style={{ color: theme.colors.text.secondary }}>{request.description}</Text>
                                    </View>
                                )}
                                <Text style={{ fontWeight: '600', color: theme.colors.text.primary, marginBottom: 8 }}>Materials:</Text>
                                {request.materials?.map((material, mIndex) => (
                                    <View key={mIndex} style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        backgroundColor: '#FFFFFF',
                                        padding: 8,
                                        borderRadius: 6,
                                        marginBottom: 4,
                                    }}>
                                        <Text style={{ color: theme.colors.text.primary }}>{material.name}</Text>
                                        <Text style={{ color: theme.colors.primary[600], fontWeight: '600' }}>
                                            {material.quantity} {material.unit}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ))
            ) : (
                <View style={styles.emptyState}>
                    <Feather name="package" size={48} color={theme.colors.text.secondary} />
                    <Text style={styles.emptyText}>No material requests yet</Text>
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* Header */}
                <LinearGradient colors={[theme.colors.primary[500], theme.colors.primary[700]]} style={styles.header}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.projectTitle}>{project?.title || 'Project'}</Text>
                    <Text style={styles.projectSubtitle}>Vendor Team View</Text>
                </LinearGradient>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {tabs.map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tab, activeTab === tab && styles.activeTab]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Success Message Toast */}
                {successMessage ? (
                    <View style={{
                        backgroundColor: theme.colors.success[600],
                        padding: 12,
                        marginHorizontal: 16,
                        marginTop: 8,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <Feather name="check-circle" size={20} color={theme.colors.text.white} />
                        <Text style={{ color: theme.colors.text.white, marginLeft: 8, fontWeight: '600' }}>{successMessage}</Text>
                    </View>
                ) : null}

                {/* Tab Content */}
                {activeTab === 'Overview' && <OverviewTab />}
                {activeTab === 'Vendors' && <VendorsTab />}
                {activeTab === 'Material Requests' && <MaterialRequestsTab />}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Material Request Modal */}
            <Modal visible={showRequestModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>Create Material Request</Text>

                            <Text style={styles.inputLabel}>Title *</Text>
                            <TextInput
                                style={styles.input}
                                value={requestForm.title}
                                onChangeText={(text) => setRequestForm(prev => ({ ...prev, title: text }))}
                                placeholder="Enter request title"
                            />

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 80 }]}
                                value={requestForm.description}
                                onChangeText={(text) => setRequestForm(prev => ({ ...prev, description: text }))}
                                placeholder="Enter description"
                                multiline
                            />

                            <Text style={styles.inputLabel}>Priority</Text>
                            <View style={styles.priorityRow}>
                                {PRIORITIES.map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.priorityBtn, requestForm.priority === p && styles.priorityBtnActive]}
                                        onPress={() => setRequestForm(prev => ({ ...prev, priority: p }))}
                                    >
                                        <Text style={[styles.priorityBtnText, requestForm.priority === p && styles.priorityBtnTextActive]}>
                                            {p.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.inputLabel}>Required By Date *</Text>
                            {Platform.OS === 'web' ? (
                                <TextInput
                                    style={styles.input}
                                    value={requestForm.requiredBy}
                                    onChangeText={(text) => setRequestForm(prev => ({ ...prev, requiredBy: text }))}
                                    placeholder="YYYY-MM-DD"
                                />
                            ) : (
                                <TouchableOpacity activeOpacity={0.8} onPress={() => setShowRequiredByPicker(true)}>
                                    <View pointerEvents="none">
                                        <TextInput
                                            style={styles.input}
                                            value={requestForm.requiredBy}
                                            placeholder="Select date"
                                            editable={false}
                                        />
                                    </View>
                                </TouchableOpacity>
                            )}
                            <Text style={styles.inputHint}>Example: 2026-01-03</Text>

                            {showRequiredByPicker ? (
                                <DateTimePicker
                                    value={requestForm.requiredBy ? new Date(parseYYYYMMDDToISO(requestForm.requiredBy) || Date.now()) : new Date(Date.now() + 24 * 60 * 60 * 1000)}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                                    onChange={onRequiredByChange}
                                />
                            ) : null}

                            <Text style={styles.inputLabel}>Select Vendor</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vendorScroll}>
                                {vendors.map((v) => (
                                    <TouchableOpacity
                                        key={v._id}
                                        style={[styles.vendorChip, requestForm.selectedVendor === v._id && styles.vendorChipActive]}
                                        onPress={() => setRequestForm(prev => ({ ...prev, selectedVendor: v._id }))}
                                    >
                                        <Text style={[styles.vendorChipText, requestForm.selectedVendor === v._id && styles.vendorChipTextActive]}>
                                            {v.vendorDetails?.companyName || `${v.firstName || ''} ${v.lastName || ''}`.trim() || 'Vendor'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {requestForm.selectedVendor ? (
                                <TouchableOpacity
                                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                                    onPress={() => setRequestForm(prev => ({ ...prev, selectedVendor: null }))}
                                >
                                    <Text style={{ color: theme.colors.text.secondary }}>Clear vendor selection</Text>
                                </TouchableOpacity>
                            ) : null}

                            <Text style={styles.inputLabel}>Materials *</Text>
                            {requestForm.materials.map((material, index) => (
                                <View key={index} style={styles.materialCard}>
                                    <View style={styles.materialRowTop}>
                                        <TextInput
                                            style={[styles.input, { flex: 2 }]}
                                            value={material.name}
                                            onChangeText={(text) => updateMaterial(index, 'name', text)}
                                            placeholder="Material name"
                                        />
                                        <TextInput
                                            style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                            value={material.quantity}
                                            onChangeText={(text) => updateMaterial(index, 'quantity', text)}
                                            placeholder="Qty"
                                            keyboardType="numeric"
                                        />
                                        {index > 0 && (
                                            <TouchableOpacity onPress={() => removeMaterial(index)} style={styles.removeBtn}>
                                                <Feather name="x" size={18} color={theme.colors.error[600]} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <View style={styles.materialRowBottom}>
                                        <View style={styles.pickerContainer}>
                                            <Text style={styles.pickerLabel}>Category:</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {MATERIAL_CATEGORIES.map((cat) => (
                                                    <TouchableOpacity
                                                        key={cat.value}
                                                        style={[styles.categoryChip, material.category === cat.value && styles.categoryChipActive]}
                                                        onPress={() => updateMaterial(index, 'category', cat.value)}
                                                    >
                                                        <Text style={[styles.categoryChipText, material.category === cat.value && styles.categoryChipTextActive]}>
                                                            {cat.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                        <View style={styles.pickerContainer}>
                                            <Text style={styles.pickerLabel}>Unit:</Text>
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                {UNITS.map((u) => (
                                                    <TouchableOpacity
                                                        key={u}
                                                        style={[styles.unitChip, material.unit === u && styles.unitChipActive]}
                                                        onPress={() => updateMaterial(index, 'unit', u)}
                                                    >
                                                        <Text style={[styles.unitChipText, material.unit === u && styles.unitChipTextActive]}>
                                                            {u}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    </View>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addMaterialBtn} onPress={addMaterial}>
                                <Feather name="plus" size={16} color={theme.colors.primary[600]} />
                                <Text style={styles.addMaterialText}>Add Material</Text>
                            </TouchableOpacity>

                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setShowRequestModal(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                                    onPress={submitMaterialRequest}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Submit Request</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background.primary },
    scrollContent: { flexGrow: 1, paddingBottom: 20 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 30,
    },
    backBtn: { marginBottom: 16 },
    projectTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
    projectSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
    tabsContainer: {
        backgroundColor: theme.colors.background.card,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary[100],
    },
    tab: { paddingHorizontal: 20, paddingVertical: 8 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary[600] },
    tabText: { fontSize: 14, color: theme.colors.text.secondary },
    activeTabText: { color: theme.colors.primary[600], fontWeight: '600' },
    tabContent: { padding: 16 },
    card: {
        backgroundColor: theme.colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.primary[100],
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginBottom: 12 },
    progressRow: { flexDirection: 'row', alignItems: 'center' },
    progressBarLarge: { flex: 1, height: 10, backgroundColor: theme.colors.primary[100], borderRadius: 5 },
    progressFill: { height: '100%', backgroundColor: theme.colors.primary[600], borderRadius: 5 },
    progressPercent: { fontSize: 18, fontWeight: '700', color: theme.colors.primary[600], marginLeft: 12, width: 50 },
    progressHint: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 8 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    infoText: { fontSize: 14, color: theme.colors.text.primary, marginLeft: 10 },
    emptyText: { fontSize: 14, color: theme.colors.text.secondary, fontStyle: 'italic' },
    teamMember: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    vendorItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: theme.colors.primary[100],
        justifyContent: 'center', alignItems: 'center',
    },
    memberInfo: { marginLeft: 12 },
    memberName: { fontSize: 14, fontWeight: '600', color: theme.colors.text.primary },
    memberRole: { fontSize: 12, color: theme.colors.text.secondary },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text.primary, marginVertical: 12 },
    addRequestBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.colors.primary[600], borderRadius: 12, padding: 16,
    },
    addRequestBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    requestCard: {
        backgroundColor: theme.colors.background.card, borderRadius: 12, padding: 16, marginBottom: 12,
        borderWidth: 1, borderColor: theme.colors.primary[100],
    },
    requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    requestTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text.primary, flex: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusBadgeText: { fontSize: 10, fontWeight: '600' },
    requestMeta: { fontSize: 13, color: theme.colors.text.secondary, marginTop: 8 },
    requestDate: { fontSize: 12, color: theme.colors.text.secondary, marginTop: 4 },
    emptyState: { alignItems: 'center', padding: 40 },
    inputHint: {
        fontSize: 12,
        color: theme.colors.text.muted,
        marginTop: -6,
        marginBottom: 12,
    },
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.background.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, maxHeight: '85%',
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text.primary, marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: '500', color: theme.colors.text.primary, marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1, borderColor: theme.colors.primary[100], borderRadius: 8,
        padding: 12, fontSize: 14, backgroundColor: theme.colors.background.primary,
    },
    priorityRow: { flexDirection: 'row', flexWrap: 'wrap' },
    priorityBtn: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1, borderColor: theme.colors.primary[100], marginRight: 8, marginBottom: 8,
    },
    priorityBtnActive: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
    priorityBtnText: { fontSize: 12, color: theme.colors.text.secondary },
    priorityBtnTextActive: { color: '#FFFFFF' },
    vendorScroll: { marginVertical: 8 },
    vendorChip: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1, borderColor: theme.colors.primary[100], marginRight: 8,
    },
    vendorChipActive: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
    vendorChipText: { fontSize: 12, color: theme.colors.text.secondary },
    vendorChipTextActive: { color: '#FFFFFF' },
    materialCard: {
        backgroundColor: theme.colors.background.primary, borderRadius: 8, padding: 12,
        marginBottom: 12, borderWidth: 1, borderColor: theme.colors.primary[100],
    },
    materialRowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    materialRowBottom: { marginTop: 4 },
    materialRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    pickerContainer: { marginBottom: 8 },
    pickerLabel: { fontSize: 12, color: theme.colors.text.secondary, marginBottom: 4 },
    categoryChip: {
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
        borderWidth: 1, borderColor: theme.colors.primary[100], marginRight: 6,
        backgroundColor: theme.colors.background.card,
    },
    categoryChipActive: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
    categoryChipText: { fontSize: 11, color: theme.colors.text.secondary },
    categoryChipTextActive: { color: '#FFFFFF' },
    unitChip: {
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
        borderWidth: 1, borderColor: theme.colors.primary[100], marginRight: 6,
        backgroundColor: theme.colors.background.card,
    },
    unitChipActive: { backgroundColor: theme.colors.primary[600], borderColor: theme.colors.primary[600] },
    unitChipText: { fontSize: 10, color: theme.colors.text.secondary },
    unitChipTextActive: { color: '#FFFFFF' },
    removeBtn: { marginLeft: 8, padding: 8 },
    addMaterialBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderWidth: 1, borderColor: theme.colors.primary[600],
        borderStyle: 'dashed', borderRadius: 8,
    },
    addMaterialText: { color: theme.colors.primary[600], marginLeft: 8 },
    modalActions: { flexDirection: 'row', marginTop: 24 },
    cancelBtn: {
        flex: 1, paddingVertical: 14, alignItems: 'center',
        borderWidth: 1, borderColor: theme.colors.primary[100], borderRadius: 8, marginRight: 8,
    },
    cancelBtnText: { color: theme.colors.text.secondary, fontSize: 16 },
    submitBtn: {
        flex: 1, paddingVertical: 14, alignItems: 'center',
        backgroundColor: theme.colors.primary[600], borderRadius: 8,
    },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default VendorTeamProjectDetailScreen;
