import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI } from '../../utils/api';
import theme from '../../styles/theme';

const VendorTeamDashboardScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        totalProjects: 0,
        activeProjects: 0,
        pendingRequests: 0,
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Backend now filters by assignedVendors for vendorTeam employees
            const response = await projectsAPI.getProjects({ limit: 100 });

            if (response.success) {
                const assignedProjects = response.data.projects || [];
                console.log('[VendorTeamDashboard] Projects from API:', assignedProjects.length);

                setProjects(assignedProjects);

                // Calculate stats
                const active = assignedProjects.filter(p => p.status === 'in-progress').length;
                setStats({
                    totalProjects: assignedProjects.length,
                    activeProjects: active,
                    pendingRequests: 0,
                });
            }
        } catch (error) {
            console.error('Error loading vendor team data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return theme.colors.success[600];
            case 'in-progress': return theme.colors.primary[600];
            case 'on-hold': return theme.colors.warning[600];
            case 'cancelled': return theme.colors.error[600];
            default: return theme.colors.text.secondary;
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary[600]} />
                <Text style={styles.loadingText}>Loading projects...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.welcomeText}>
                            Welcome, {user?.firstName || 'Vendor Team'}
                        </Text>
                        <Text style={styles.roleText}>Vendor Employee</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Feather name="briefcase" size={24} color={theme.colors.primary[600]} />
                        <Text style={styles.statValue}>{stats.totalProjects}</Text>
                        <Text style={styles.statLabel}>Total Projects</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Feather name="activity" size={24} color={theme.colors.success[600]} />
                        <Text style={styles.statValue}>{stats.activeProjects}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Feather name="package" size={24} color={theme.colors.warning[600]} />
                        <Text style={styles.statValue}>{stats.pendingRequests}</Text>
                        <Text style={styles.statLabel}>Pending Requests</Text>
                    </View>
                </View>

                {/* Projects List */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Projects</Text>

                    {projects.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Feather name="inbox" size={48} color={theme.colors.text.secondary} />
                            <Text style={styles.emptyText}>No projects found</Text>
                        </View>
                    ) : (
                        projects.map((project) => (
                            <TouchableOpacity
                                key={project._id}
                                style={styles.projectCard}
                                onPress={() => navigation.navigate('VendorTeamProjectDetail', { projectId: project._id })}
                            >
                                <View style={styles.projectHeader}>
                                    <Text style={styles.projectTitle} numberOfLines={1}>
                                        {project.title || project.name}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
                                            {project.status?.replace('-', ' ').toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                {/* Client Info (limited) */}
                                {project.client && (
                                    <View style={styles.clientInfo}>
                                        <Feather name="user" size={14} color={theme.colors.text.secondary} />
                                        <Text style={styles.clientName}>
                                            {project.client.firstName} {project.client.lastName}
                                        </Text>
                                    </View>
                                )}

                                {/* Progress */}
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[styles.progressFill, { width: `${project.progress?.percentage || 0}%` }]}
                                        />
                                    </View>
                                    <Text style={styles.progressText}>{project.progress?.percentage || 0}%</Text>
                                </View>

                                {/* Meta Info */}
                                <View style={styles.metaRow}>
                                    <View style={styles.metaItem}>
                                        <Feather name="calendar" size={12} color={theme.colors.text.secondary} />
                                        <Text style={styles.metaText}>{formatDate(project.timeline?.startDate)}</Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={theme.colors.text.secondary} />
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.primary,
    },
    scrollContent: { flexGrow: 1, paddingBottom: 20 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.primary,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
    header: {
        backgroundColor: theme.colors.background.card,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.primary[100],
    },
    headerContent: {
        flex: 1,
    },
    welcomeText: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text.primary,
    },
    roleText: {
        fontSize: 14,
        color: theme.colors.primary[600],
        fontWeight: '500',
        marginTop: 4,
    },
    backButton: {
        padding: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 4,
        alignItems: 'center',
        shadowColor: theme.colors.neutral[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.text.muted,
        marginTop: 4,
        textAlign: 'center',
    },
    sectionContainer: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.text.primary,
        marginBottom: 16,
    },
    projectCard: {
        backgroundColor: theme.colors.background.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.primary[100],
    },
    projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    projectTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text.primary,
        flex: 1,
        marginRight: 8,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    clientName: {
        fontSize: 14,
        color: theme.colors.text.secondary,
        marginLeft: 6,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressBar: {
        flex: 1,
        height: 6,
        backgroundColor: theme.colors.primary[100],
        borderRadius: 3,
        marginRight: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.primary[600],
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary[600],
        width: 35,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        fontSize: 12,
        color: theme.colors.text.secondary,
        marginLeft: 4,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: theme.colors.text.secondary,
    },
});

export default VendorTeamDashboardScreen;
