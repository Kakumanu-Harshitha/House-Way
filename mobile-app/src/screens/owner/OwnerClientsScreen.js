import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Modal,
    ScrollView,
    ActivityIndicator,
    Linking,
    TextInput,
    Alert,
    RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

// Client List Item Component
const ClientListItem = ({ client, onPress }) => {
    const [clientProjects, setClientProjects] = useState([]);
    const [totalValue, setTotalValue] = useState(0);

    useEffect(() => {
        // Fetch projects for this client
        const fetchClientProjects = async () => {
            try {
                const allProjects = await api.getProjects();
                const filtered = allProjects.filter(p => p.client === client._id);
                setClientProjects(filtered);
                
                // Calculate total value
                const total = filtered.reduce((sum, p) => sum + (p.budget?.estimated || 0), 0);
                setTotalValue(total);
            } catch (error) {
                console.error('Error fetching client projects:', error);
            }
        };
        fetchClientProjects();
    }, [client._id]);

    const activeProjects = clientProjects.filter(p => p.status === 'in-progress' || p.status === 'planning');

    return (
        <TouchableOpacity style={styles.listItem} onPress={onPress}>
            <View style={styles.listContent}>
                <Text style={styles.listTitle}>
                    {client.firstName} {client.lastName}
                </Text>
                <Text style={styles.listSubtitle}>
                    {client.clientDetails?.propertyType || 'Residential'}
                </Text>
            </View>
            <View style={styles.listRightContent}>
                <Text style={styles.listTitle}>
                    ${(totalValue / 1000).toFixed(1)}k
                </Text>
                <Text style={styles.listSubtitle}>
                    {activeProjects.length} Active
                </Text>
            </View>
        </TouchableOpacity>
    );
};

// Client Details Modal
const ClientDetailsModal = ({ visible, client, onClose }) => {
    const [clientProjects, setClientProjects] = useState([]);
    const [clientVendors, setClientVendors] = useState([]);
    const [financialData, setFinancialData] = useState({
        totalBilled: 0,
        outstanding: 0,
        avgPayTime: 0,
        onTimeRate: 0
    });
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && client) {
            fetchClientDetails();
        }
    }, [visible, client]);

    const fetchClientDetails = async () => {
        try {
            setLoading(true);
            const [projects, invoices, allVendors] = await Promise.all([
                api.getProjects(),
                api.getInvoices(),
                api.getUsers('vendor')
            ]);

            // Filter projects for this client
            const filtered = projects.filter(p => p.client === client._id);
            setClientProjects(filtered);

            // Get unique vendors from these projects
            const vendorIds = [...new Set(filtered.flatMap(p => p.assignedVendors || []))];
            const relevantVendors = allVendors.filter(v => vendorIds.includes(v._id));
            setClientVendors(relevantVendors);

            // Calculate financial data
            const clientInvoices = invoices.filter(inv => inv.client === client._id);
            const totalBilled = filtered.reduce((sum, p) => sum + (p.budget?.estimated || 0), 0);
            const paid = clientInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0);
            const outstanding = totalBilled - paid;

            // Calculate average payment time (simplified)
            const paidInvoices = clientInvoices.filter(inv => inv.status === 'paid' && inv.paidDate);
            const avgPayTime = paidInvoices.length > 0 
                ? paidInvoices.reduce((sum, inv) => {
                    const created = new Date(inv.createdAt);
                    const paid = new Date(inv.paidDate);
                    return sum + Math.ceil((paid - created) / (1000 * 60 * 60 * 24));
                }, 0) / paidInvoices.length
                : 15;

            // Calculate on-time rate
            const onTimePayments = paidInvoices.filter(inv => {
                const created = new Date(inv.createdAt);
                const paid = new Date(inv.paidDate);
                const dueDate = new Date(inv.dueDate);
                return paid <= dueDate;
            });
            const onTimeRate = paidInvoices.length > 0 
                ? (onTimePayments.length / paidInvoices.length) * 100 
                : 95;

            setFinancialData({
                totalBilled,
                outstanding,
                avgPayTime: Math.round(avgPayTime),
                onTimeRate: Math.round(onTimeRate)
            });

            // Build timeline
            const events = [];
            filtered.forEach(project => {
                events.push({
                    date: project.timeline.startDate,
                    event: `Project Started: ${project.title}`,
                    type: 'project'
                });
            });
            clientInvoices.forEach(inv => {
                events.push({
                    date: inv.createdAt,
                    event: `Invoice #${inv.invoiceNumber} Sent`,
                    type: 'invoice'
                });
                if (inv.paidDate) {
                    events.push({
                        date: inv.paidDate,
                        event: `Payment Received: $${inv.amount.toLocaleString()}`,
                        type: 'payment'
                    });
                }
            });

            // Sort by date
            events.sort((a, b) => new Date(b.date) - new Date(a.date));
            setTimeline(events.slice(0, 10)); // Latest 10 events

        } catch (error) {
            console.error('Error fetching client details:', error);
            Alert.alert('Error', 'Failed to load client details. Please check your connection.');
            setClientProjects([]);
            setClientVendors([]);
            setFinancialData({ totalBilled: 0, outstanding: 0, avgPayTime: 0, onTimeRate: 0 });
            setTimeline([]);
        } finally {
            setLoading(false);
        }
    };

    if (!client) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        {client.firstName} {client.lastName}
                    </Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffc107" />
                    </View>
                ) : (
                    <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                        {/* Projects Overview */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>PROJECTS OVERVIEW</Text>
                            {clientProjects.length > 0 ? (
                                clientProjects.map(project => (
                                    <View key={project._id} style={styles.projectItem}>
                                        <View style={styles.projectLeft}>
                                            <Text style={styles.projectName}>{project.title}</Text>
                                            <Text style={styles.projectType}>
                                                {project.status === 'in-progress' ? 'Active' : project.status}
                                            </Text>
                                        </View>
                                        <View style={[styles.badge, 
                                            project.status === 'in-progress' ? styles.badgeSuccess : 
                                            project.status === 'completed' ? styles.badgeInfo : styles.badgeWarning]}>
                                            <Text style={styles.badgeText}>
                                                {project.status === 'in-progress' ? 'In Progress' :
                                                 project.status === 'completed' ? 'Completed' : 'Planning'}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No projects found</Text>
                            )}
                        </View>

                        {/* Vendor Assignments */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>VENDOR ASSIGNMENTS</Text>
                            {clientVendors.length > 0 ? (
                                clientVendors.map(vendor => (
                                    <View key={vendor._id} style={styles.vendorItem}>
                                        <View style={styles.vendorLeft}>
                                            <Text style={styles.vendorName}>
                                                {vendor.vendorDetails?.companyName || `${vendor.firstName} ${vendor.lastName}`}
                                            </Text>
                                            <Text style={styles.vendorStatus}>Active</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No vendors assigned</Text>
                            )}
                        </View>

                        {/* Financial Summary */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>FINANCIAL SUMMARY</Text>
                            <View style={styles.statsGrid}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Total Billed</Text>
                                    <Text style={styles.statValue}>
                                        ${(financialData.totalBilled / 1000).toFixed(1)}k
                                    </Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Outstanding</Text>
                                    <Text style={styles.statValue}>
                                        ${(financialData.outstanding / 1000).toFixed(1)}k
                                    </Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>Avg Pay Time</Text>
                                    <Text style={styles.statValue}>{financialData.avgPayTime} days</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>On-Time Rate</Text>
                                    <Text style={styles.statValue}>{financialData.onTimeRate}%</Text>
                                </View>
                            </View>
                        </View>

                        {/* Communication Timeline */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>COMMUNICATION TIMELINE</Text>
                            {timeline.length > 0 ? (
                                timeline.map((item, index) => (
                                    <View key={index} style={styles.timelineItem}>
                                        <View style={[styles.timelineDot, 
                                            item.type === 'payment' ? styles.dotGreen :
                                            item.type === 'invoice' ? styles.dotOrange : styles.dotBlue]} />
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineEvent}>{item.event}</Text>
                                            <Text style={styles.timelineDate}>
                                                {new Date(item.date).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>No timeline events</Text>
                            )}
                        </View>

                        {/* Contact Actions */}
                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>CONTACT</Text>
                            <TouchableOpacity 
                                style={styles.contactButton}
                                onPress={() => Linking.openURL(`tel:${client.phone}`)}
                            >
                                <Ionicons name="call" size={20} color="#fff" />
                                <Text style={styles.contactButtonText}>Call {client.phone}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.contactButton, { backgroundColor: '#25D366' }]}
                                onPress={() => Linking.openURL(`mailto:${client.email}`)}
                            >
                                <Ionicons name="mail" size={20} color="#fff" />
                                <Text style={styles.contactButtonText}>{client.email}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}
            </SafeAreaView>
        </Modal>
    );
};

// Main Screen Component
const OwnerClientsScreen = ({ navigation }) => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchClients = async () => {
        try {
            const data = await api.getUsers('client');
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            Alert.alert('Error', 'Failed to load clients. Please check your connection.');
            setClients([]);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchClients();
        }, [])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchClients();
        setRefreshing(false);
    }, []);

    const filteredClients = clients.filter(client => {
        if (!searchQuery) return true;
        const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
        const email = client.email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
    });

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffc107" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Manage Clients" />
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Clients</Text>
                <TouchableOpacity onPress={fetchClients}>
                    <Ionicons name="refresh" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#666" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Client List */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>CLIENT LIST</Text>
                <FlatList
                    data={filteredClients}
                    keyExtractor={item => item._id}
                    renderItem={({ item }) => (
                        <ClientListItem 
                            client={item}
                            onPress={() => setSelectedClient(item)}
                        />
                    )}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No clients found</Text>
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Client Details Modal */}
            <ClientDetailsModal
                visible={!!selectedClient}
                client={selectedClient}
                onClose={() => setSelectedClient(null)}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#212529',
    },
    searchContainer: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        color: '#212529',
    },
    card: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
        flex: 1,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 12,
    },
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        marginBottom: 8,
        borderRadius: 8,
    },
    listContent: {
        flex: 1,
    },
    listRightContent: {
        alignItems: 'flex-end',
    },
    listTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 2,
    },
    listSubtitle: {
        fontSize: 12,
        color: '#6c757d',
    },
    emptyText: {
        textAlign: 'center',
        color: '#6c757d',
        fontSize: 14,
        paddingVertical: 20,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212529',
    },
    modalBody: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6c757d',
        marginBottom: 12,
    },
    projectItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    projectLeft: {
        flex: 1,
    },
    projectName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 4,
    },
    projectType: {
        fontSize: 12,
        color: '#6c757d',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeSuccess: {
        backgroundColor: '#28a745',
    },
    badgeWarning: {
        backgroundColor: '#ffc107',
    },
    badgeInfo: {
        backgroundColor: '#17a2b8',
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    vendorItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    vendorLeft: {
        flex: 1,
    },
    vendorName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#212529',
        marginBottom: 4,
    },
    vendorStatus: {
        fontSize: 12,
        color: '#6c757d',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        flex: 1,
        minWidth: '45%',
    },
    statLabel: {
        fontSize: 12,
        color: '#6c757d',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#212529',
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
        marginRight: 12,
    },
    dotGreen: {
        backgroundColor: '#28a745',
    },
    dotOrange: {
        backgroundColor: '#ffc107',
    },
    dotBlue: {
        backgroundColor: '#007bff',
    },
    timelineContent: {
        flex: 1,
    },
    timelineEvent: {
        fontSize: 14,
        color: '#212529',
        marginBottom: 2,
    },
    timelineDate: {
        fontSize: 12,
        color: '#6c757d',
    },
    contactButton: {
        backgroundColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 8,
        marginBottom: 12,
    },
    contactButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default OwnerClientsScreen;
