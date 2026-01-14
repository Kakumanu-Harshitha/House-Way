import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    TextInput,
    LayoutAnimation,
    Platform,
    UIManager,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';
import { COLORS } from '../../styles/colors';

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const ReceivablesScreen = ({ navigation }) => {
    const [receivables, setReceivables] = useState([]);
    const [filteredReceivables, setFilteredReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [filterType, setFilterType] = useState('all'); // all, overdue, pending

    const fetchData = async () => {
        try {
            const data = await api.getReceivables();
            // Sort by due date (earliest first for overdue/pending)
            const sortedData = [...data].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
            setReceivables(sortedData);
            setFilteredReceivables(sortedData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        let result = receivables;

        // Search Filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(item => 
                item.projectName.toLowerCase().includes(lowerSearch) ||
                item.clientName.toLowerCase().includes(lowerSearch) ||
                (item.installmentName && item.installmentName.toLowerCase().includes(lowerSearch))
            );
        }

        // Status Filter
        if (filterType !== 'all') {
            result = result.filter(item => item.status === filterType);
        }

        setFilteredReceivables(result);
    }, [search, filterType, receivables]);

    const toggleExpand = (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const totalOutstanding = receivables
        .filter(r => r.status !== 'paid')
        .reduce((acc, curr) => acc + curr.amount, 0);
        
    const totalOverdue = receivables
        .filter(r => r.status === 'overdue')
        .reduce((acc, curr) => acc + curr.amount, 0);

    const renderItem = ({ item, index }) => {
        const isExpanded = expandedId === item._id;
        const isOverdue = item.status === 'overdue';
        const isPaid = item.status === 'paid';
        const isSchedule = item._id.startsWith('sched-');

        return (
            <View style={[styles.card, isOverdue && styles.cardOverdue]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item._id)}>
                    <View style={styles.scheduleLeft}>
                        <View style={[
                            styles.numberCircle, 
                            isPaid ? styles.circlePaid : (isOverdue ? styles.circleOverdue : styles.circlePending)
                        ]}>
                            <Text style={styles.numberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.scheduleInfo}>
                            <TouchableOpacity onPress={() => navigation.navigate('ProjectPayments', { projectId: item.projectId })}>
                                <Text style={[styles.prjTitle, { color: COLORS.primary, textDecorationLine: 'underline' }]} numberOfLines={1}>
                                    {item.projectName}
                                </Text>
                            </TouchableOpacity>
                            <Text style={styles.installmentName}>
                                {isSchedule ? (item.installmentName || `Installment ${index + 1}`) : `Invoice ${item.invoiceNumber}`}
                            </Text>
                            <View style={styles.dueDateRow}>
                                <Feather name="calendar" size={12} color="#666" />
                                <Text style={styles.dueDateText}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.scheduleRight}>
                        <View style={[
                            styles.statusBadge, 
                            isPaid ? styles.badgePaid : (isOverdue ? styles.badgeOverdue : styles.badgePending)
                        ]}>
                            <Text style={[
                                styles.statusText, 
                                isPaid ? styles.textPaid : (isOverdue ? styles.textOverdue : styles.textPending)
                            ]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.amountText}>₹{item.amount.toLocaleString()}</Text>
                    </View>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.cardDetails}>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Client:</Text>
                            <Text style={styles.detailValue}>{item.clientName}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Reference ID:</Text>
                            <Text style={styles.detailValue}>{item._id.split('-').pop().toUpperCase()}</Text>
                        </View>
                        
                        <View style={styles.actionButtons}>
                            <TouchableOpacity 
                                style={styles.actionBtn}
                                onPress={() => navigation.navigate('ProjectPayments', { projectId: item.projectId })}
                            >
                                <Ionicons name="calendar-outline" size={18} color="#333" />
                                <Text style={styles.actionText}>Schedule</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Ionicons name="call-outline" size={18} color="#333" />
                                <Text style={styles.actionText}>Call</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtn}>
                                <Ionicons name="mail-outline" size={18} color="#333" />
                                <Text style={styles.actionText}>Remind</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
                                onPress={() => {
                                    if (isSchedule) {
                                        navigation.navigate('CreateInvoice', { 
                                            projectId: item.projectId,
                                            amount: item.amount,
                                            installmentName: item.installmentName
                                        });
                                    } else {
                                        // View existing invoice
                                    }
                                }}
                            >
                                <Text style={[styles.actionText, { color: '#000' }]}>
                                    {isSchedule ? 'Create Invoice' : 'View Invoice'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#333" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Receivables" navigation={navigation} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Receivables</Text>
                <TouchableOpacity onPress={() => {
                    // Cycle filters for demo
                    if (filterType === 'all') setFilterType('overdue');
                    else if (filterType === 'overdue') setFilterType('pending');
                    else setFilterType('all');
                }}>
                    <Ionicons name="filter" size={24} color={filterType !== 'all' ? '#D32F2F' : '#333'} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search Client or Project..."
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>TOTAL OUTSTANDING</Text>
                    <Text style={styles.summaryValue}>${totalOutstanding.toLocaleString()}</Text>
                </View>
                <View style={styles.verticalDivider} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: '#D32F2F' }]}>OVERDUE</Text>
                    <Text style={[styles.summaryValue, { color: '#D32F2F' }]}>${totalOverdue.toLocaleString()}</Text>
                </View>
            </View>

            {/* List */}
            <FlatList
                data={filteredReceivables}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: '#999' }}>No receivables found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    searchInput: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 15
    },
    summaryContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center'
    },
    verticalDivider: {
        width: 1,
        backgroundColor: '#eee'
    },
    summaryLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#888',
        marginBottom: 4,
        letterSpacing: 0.5
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.1)',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    cardOverdue: {
        borderColor: 'rgba(211, 47, 47, 0.2)',
        backgroundColor: '#FFFBFB'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16
    },
    scheduleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12
    },
    numberCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0'
    },
    circlePaid: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
    circleOverdue: { backgroundColor: 'rgba(211, 47, 47, 0.15)' },
    circlePending: { backgroundColor: 'rgba(244, 208, 63, 0.2)' },
    numberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333'
    },
    scheduleInfo: {
        flex: 1
    },
    prjTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 2
    },
    installmentName: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
        marginBottom: 4
    },
    dueDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dueDateText: {
        fontSize: 11,
        color: '#888'
    },
    scheduleRight: {
        alignItems: 'flex-end',
        gap: 6
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    badgePaid: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    badgeOverdue: { backgroundColor: 'rgba(211, 47, 47, 0.1)' },
    badgePending: { backgroundColor: 'rgba(244, 208, 63, 0.15)' },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold'
    },
    textPaid: { color: '#22C55E' },
    textOverdue: { color: '#D32F2F' },
    textPending: { color: '#B8860B' },
    amountText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primaryDark || '#B8860B'
    },
    cardDetails: {
        padding: 16,
        paddingTop: 0,
        backgroundColor: '#fafafa',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12
    },
    detailLabel: {
        fontSize: 14,
        color: '#888'
    },
    detailValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500'
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 8
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        flex: 1
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#333',
        marginLeft: 4
    }
});

export default ReceivablesScreen;
