import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Platform,
    TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import WaveHeader from '../../components/clientManagement/WaveHeader';
import { projectsAPI } from '../../utils/api';
import ExecutiveBottomNavBar from '../../components/common/ExecutiveBottomNavBar';
import { useFocusEffect } from '@react-navigation/native';

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

const ExecutiveProjectListScreen = ({ navigation, route }) => {
    const { action } = route.params || {}; // 'upload' or 'timeline' from dashboard
    const { user, isAuthenticated } = useAuth();
    const { isCheckedIn } = useAttendance();
    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTab, setSelectedTab] = useState('active');

    useFocusEffect(
        React.useCallback(() => {
            if (isAuthenticated && user?.role === 'employee' && !isCheckedIn) {
                if (Platform.OS === 'web') {
                    alert('⏳ Access Denied: You must be Checked-In to access projects.');
                } else {
                    Alert.alert('Check-In Required', 'You must be Checked-In to access projects.');
                }
                navigation.replace('CheckIn');
                return;
            }

            if (isAuthenticated && user) {
                loadProjects();
            } else {
                setLoading(false);
            }
        }, [isAuthenticated, user, isCheckedIn, navigation])
    );

    useEffect(() => {
        filterProjects();
    }, [projects, searchQuery, selectedTab]);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await projectsAPI.getProjects({ limit: 50 });

            if (response.success) {
                const allProjects = response.data.projects || [];

                // Filter to show only projects assigned to this executive
                const assignedProjects = allProjects.filter(project => {
                    // Check if current user is in assignedEmployees array
                    const isAssigned = project.assignedEmployees?.some(
                        emp => emp._id === user?._id || emp === user?._id
                    );
                    return isAssigned;
                });

                setProjects(assignedProjects);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterProjects = () => {
        let filtered = projects;

        // Filter by tab (active vs past)
        if (selectedTab === 'active') {
            filtered = filtered.filter(p => p.status === 'in-progress' || p.status === 'planning');
        } else {
            filtered = filtered.filter(p => p.status === 'completed' || p.status === 'on-hold' || p.status === 'cancelled');
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(project =>
                project.title?.toLowerCase().includes(query) ||
                project.description?.toLowerCase().includes(query) ||
                project.client?.firstName?.toLowerCase().includes(query) ||
                project.client?.lastName?.toLowerCase().includes(query) ||
                project.client?.email?.toLowerCase().includes(query) ||
                project.client?.phone?.includes(query)
            );
        }

        setFilteredProjects(filtered);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadProjects();
        setRefreshing(false);
    };

    const handleProjectPress = (project) => {
        navigation.navigate('ExecutiveProjectDetail', {
            projectId: project._id,
            initialTab: action === 'upload' ? 'Media' : action === 'timeline' ? 'Timeline' : 'Overview'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            planning: COLORS.warning,
            'in-progress': COLORS.primary,
            'on-hold': COLORS.textMuted,
            completed: COLORS.success,
            cancelled: COLORS.danger,
        };
        return colors[status] || COLORS.textMuted;
    };

    const activeCount = projects.filter(p => p.status === 'in-progress' || p.status === 'planning').length;
    const pastCount = projects.filter(p => p.status === 'completed' || p.status === 'on-hold' || p.status === 'cancelled').length;

    const renderProjectCard = ({ item }) => (
        <TouchableOpacity
            style={styles.projectCard}
            onPress={() => handleProjectPress(item)}
            activeOpacity={0.8}
        >
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
            <View style={styles.projectContent}>
                <View style={styles.projectHeader}>
                    <Text style={styles.projectTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {item.status?.replace('-', ' ')}
                        </Text>
                    </View>
                </View>

                <Text style={styles.projectDescription} numberOfLines={2}>
                    {item.description || 'No description available'}
                </Text>

                <View style={styles.projectInfo}>
                    <View style={styles.infoItem}>
                        <Feather name="calendar" size={12} color={COLORS.textMuted} />
                        <Text style={styles.infoText}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                    {item.progress && (
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoText, { color: COLORS.primary, fontWeight: '700' }]}>
                                {item.progress.percentage || 0}% Complete
                            </Text>
                        </View>
                    )}
                </View>

                {/* Client Details Section */}
                {item.client && (
                    <View style={{
                        backgroundColor: COLORS.primaryLight,
                        padding: 10,
                        borderRadius: 8,
                        marginTop: 8
                    }}>
                        <View style={styles.clientRow}>
                            <Feather name="user" size={14} color={COLORS.primary} />
                            <Text style={[styles.clientName, { color: COLORS.text, fontWeight: '600' }]}>
                                {item.client.firstName} {item.client.lastName}
                            </Text>
                        </View>
                        {item.client.phone && (
                            <View style={[styles.clientRow, { marginTop: 4 }]}>
                                <Feather name="phone" size={12} color={COLORS.textMuted} />
                                <Text style={styles.clientName}>{item.client.phone}</Text>
                            </View>
                        )}
                        {item.client.email && (
                            <View style={[styles.clientRow, { marginTop: 4 }]}>
                                <Feather name="mail" size={12} color={COLORS.textMuted} />
                                <Text style={styles.clientName} numberOfLines={1}>{item.client.email}</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
    );

    if (loading && projects.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <WaveHeader
                    title="Projects"
                    subtitle="Loading..."
                    height={180}
                    showBackButton
                    backButtonPress={() => navigation.goBack()}
                />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading projects...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredProjects}
                renderItem={renderProjectCard}
                keyExtractor={(item) => item._id}
                ListHeaderComponent={
                    <>
                        <WaveHeader
                            title="My Projects"
                            subtitle={`${projects.length} project${projects.length !== 1 ? 's' : ''} assigned`}
                            height={180}
                            showBackButton
                            backButtonPress={() => navigation.goBack()}
                        />

                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Feather name="search" size={18} color={COLORS.textMuted} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search projects or clients..."
                                placeholderTextColor={COLORS.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Feather name="x" size={18} color={COLORS.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Tab Buttons */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tabButton, selectedTab === 'active' && styles.tabButtonActive]}
                                onPress={() => setSelectedTab('active')}
                            >
                                <Feather name="play-circle" size={16} color={selectedTab === 'active' ? COLORS.primary : COLORS.textMuted} />
                                <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
                                    Active ({activeCount})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabButton, selectedTab === 'past' && styles.tabButtonActive]}
                                onPress={() => setSelectedTab('past')}
                            >
                                <Feather name="check-circle" size={16} color={selectedTab === 'past' ? COLORS.primary : COLORS.textMuted} />
                                <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
                                    Past ({pastCount})
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Feather name="folder" size={64} color={COLORS.textMuted} />
                        <Text style={styles.emptyStateTitle}>No projects found</Text>
                        <Text style={styles.emptyStateText}>
                            {searchQuery ? 'Try adjusting your search' : 'No projects match the selected filter'}
                        </Text>
                    </View>
                }
            />

            <ExecutiveBottomNavBar navigation={navigation} activeTab="projects" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -180,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: COLORS.primary,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 150,
        flexGrow: 1,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        marginHorizontal: 20,
        marginTop: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        paddingVertical: 0,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginTop: 16,
        gap: 12,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        gap: 8,
    },
    tabButtonActive: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.primary,
    },
    projectCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.cardBg,
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        alignItems: 'center',
        overflow: 'hidden',
    },
    statusIndicator: {
        width: 4,
        height: '100%',
    },
    projectContent: {
        flex: 1,
        padding: 16,
    },
    projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    projectTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    projectDescription: {
        fontSize: 13,
        color: COLORS.textMuted,
        lineHeight: 18,
        marginBottom: 10,
    },
    projectInfo: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    infoText: {
        fontSize: 12,
        color: COLORS.textMuted,
        fontWeight: '500',
    },
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clientName: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 60,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
        marginTop: 20,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
    },
});

export default ExecutiveProjectListScreen;
