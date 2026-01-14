import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

const ProjectsHubScreen = ({ navigation }) => {
    const [stats, setStats] = useState({
        onTrack: 0,
        atRisk: 0,
        active: 0,
        pending: 0,
        completed: 0
    });
    const [recentUpdates, setRecentUpdates] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [projects, updates] = await Promise.all([
                    // Backend defaults to `limit=10`; hub stats should reflect all projects.
                    api.getProjects({ limit: 1000 }),
                api.getRecentProjectTimelineUpdates(10).catch(() => []),
            ]);
            
            const onTrack = projects.filter(p => p.status === 'in-progress' && p.priority !== 'high').length;
            const atRisk = projects.filter(p => p.priority === 'high').length;
            
            const active = projects.filter(p => p.status === 'in-progress').length;
            const pending = projects.filter(p => p.status === 'planning').length;
            const completed = projects.filter(p => p.status === 'completed').length;

            setStats({ onTrack, atRisk, active, pending, completed });
            setRecentUpdates(Array.isArray(updates) ? updates : []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatUpdateMeta = (update) => {
        const createdAt = update?.createdAt ? new Date(update.createdAt) : null;
        const createdBy = update?.createdBy ? `${update.createdBy.firstName || ''} ${update.createdBy.lastName || ''}`.trim() : '';
        const timeText = createdAt ? createdAt.toLocaleString() : '';
        const metaParts = [createdBy, timeText].filter(Boolean);
        return metaParts.join(' • ');
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#333" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Projects Hub" navigation={navigation} />

            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="menu" size={24} color="#333" style={{ marginRight: 16 }} />
                    <Text style={styles.headerTitle}>Projects</Text>
                </View>
                <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('CreateProject')}>
                    <Text style={styles.newBtnText}>+ New ⚡</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Search */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <Text style={styles.searchPlaceholder}>Find Project...</Text>
                </View>

                {/* Health Check */}
                <Text style={styles.sectionTitle}>HEALTH CHECK</Text>
                <View style={styles.healthGrid}>
                    <View style={[styles.healthCard, { backgroundColor: '#E8F5E9' }]}>
                        <Text style={styles.healthEmoji}>🟢</Text>
                        <Text style={styles.healthCount}>{stats.onTrack}</Text>
                        <Text style={[styles.healthLabel, { color: '#2E7D32' }]}>On Track</Text>
                    </View>
                    <View style={[styles.healthCard, { backgroundColor: '#FFEBEE' }]}>
                        <Text style={styles.healthEmoji}>🔴</Text>
                        <Text style={styles.healthCount}>{stats.atRisk}</Text>
                        <Text style={[styles.healthLabel, { color: '#C62828' }]}>At Risk</Text>
                    </View>
                </View>

                {/* Project Status List */}
                <Text style={styles.sectionTitle}>PROJECT STATUS</Text>

                <TouchableOpacity style={styles.statusRow} onPress={() => navigation.navigate('ProjectList')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, marginRight: 12 }}>📂</Text>
                        <Text style={styles.statusText}>Active Projects</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.statusCount}>{stats.active}</Text>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                    </View>
                </TouchableOpacity>

                <View style={styles.statusRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, marginRight: 12 }}>⏳</Text>
                        <Text style={styles.statusText}>Pending / On Hold</Text>
                    </View>
                    <Text style={styles.statusCount}>{stats.pending}</Text>
                </View>

                <View style={styles.statusRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, marginRight: 12 }}>✅</Text>
                        <Text style={styles.statusText}>Completed History</Text>
                    </View>
                    <Text style={styles.statusCount}>{stats.completed}</Text>
                </View>

                {/* Critical Alerts */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>⚠️ CRITICAL ALERTS</Text>
                <View style={styles.alertCard}>
                    <Text style={styles.alertItem}>🔴 App MVP: Deadline missed (2d)</Text>
                    <View style={styles.divider} />
                    <Text style={styles.alertItem}>🟡 Website: Budget exceeded 10%</Text>
                </View>

                {/* Recent Updates */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>RECENT UPDATES</Text>
                {recentUpdates.length === 0 ? (
                    <View style={styles.emptyUpdatesCard}>
                        <Text style={styles.emptyUpdatesText}>No recent project updates yet.</Text>
                    </View>
                ) : (
                    <View style={styles.updatesCard}>
                        {recentUpdates.slice(0, 10).map((u) => {
                            const project = u?.projectId;
                            const projectTitle = project?.title || 'Project';
                            const title = u?.title || 'Update';
                            const description = u?.description || '';
                            return (
                                <TouchableOpacity
                                    key={u._id}
                                    style={styles.updateRow}
                                    onPress={() => {
                                        if (project?._id) navigation.navigate('ProjectDetails', { projectId: project._id });
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.updateTitle} numberOfLines={1}>
                                            {projectTitle}: {title}
                                        </Text>
                                        {!!description && (
                                            <Text style={styles.updateDesc} numberOfLines={2}>
                                                {description}
                                            </Text>
                                        )}
                                        <Text style={styles.updateMeta} numberOfLines={1}>
                                            {formatUpdateMeta(u)}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#ccc" />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee'
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333'
    },
    newBtn: {
        backgroundColor: '#333',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    newBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
    content: {
        padding: 16
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#eee'
    },
    searchPlaceholder: {
        marginLeft: 8,
        color: '#999',
        fontSize: 15
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 12,
        letterSpacing: 1
    },
    healthGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24
    },
    healthCard: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center'
    },
    healthEmoji: {
        fontSize: 24,
        marginBottom: 8
    },
    healthCount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4
    },
    healthLabel: {
        fontSize: 12,
        fontWeight: 'bold'
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4
    },
    statusText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333'
    },
    statusCount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8
    },
    alertCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F'
    },
    alertItem: {
        fontSize: 14,
        color: '#D32F2F',
        fontWeight: '500',
        paddingVertical: 8
    },
    divider: {
        height: 1,
        backgroundColor: '#eee'
    },
    updatesCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee'
    },
    updateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1'
    },
    updateTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
        marginBottom: 2
    },
    updateDesc: {
        fontSize: 13,
        color: '#555',
        marginBottom: 6
    },
    updateMeta: {
        fontSize: 12,
        color: '#888'
    },
    emptyUpdatesCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#eee'
    },
    emptyUpdatesText: {
        fontSize: 13,
        color: '#888'
    }
});

export default ProjectsHubScreen;
