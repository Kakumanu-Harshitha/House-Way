import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    Platform,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

const PayablesScreen = ({ navigation }) => {
    const [payables, setPayables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('urgent'); // urgent, all

    const fetchData = async () => {
        try {
            const data = await api.getPayables();
            setPayables(data);
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

    const filteredBills = payables.filter(item => {
        if (activeTab === 'urgent') return item.status === 'urgent';
        return true;
    });

    const renderItem = ({ item }) => (
        <View style={[styles.card, item.status === 'urgent' && styles.urgentCard]}>
            <View style={styles.row}>
                <View>
                    <Text style={styles.vendorName}>{item.vendorName} <Text style={styles.cat}>({item.category})</Text></Text>
                    <Text style={styles.billId}>{item._id.toUpperCase()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>${item.amount.toLocaleString()}</Text>
                    <Text style={[styles.date, item.status === 'urgent' && { color: '#D32F2F' }]}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                    </Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={[styles.statusPill, item.approvalStatus === 'approved' && { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.statusText, item.approvalStatus === 'approved' && { color: '#2E7D32' }]}>
                        {item.approvalStatus === 'pending' ? 'Pending Approval' : 'Scheduled'}
                    </Text>
                </View>
                {item.status === 'urgent' && (
                    <TouchableOpacity style={styles.payBtn}>
                        <Text style={styles.payBtnText}>Slide to Pay</Text>
                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#333" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Payables" navigation={navigation} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payables</Text>
                <TouchableOpacity>
                    <Ionicons name="filter" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'urgent' && styles.activeTab]}
                    onPress={() => setActiveTab('urgent')}
                >
                    <Text style={[styles.tabText, activeTab === 'urgent' && styles.activeTabText]}>Urgent</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                    onPress={() => setActiveTab('all')}
                >
                    <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All Bills</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredBills}
                keyExtractor={item => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: '#999' }}>No bills found</Text>
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
    tabs: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 0
    },
    tab: {
        marginRight: 24,
        paddingBottom: 12
    },
    activeTab: {
        borderBottomWidth: 2,
        borderColor: '#D32F2F'
    },
    tabText: {
        fontSize: 16,
        color: '#888',
        fontWeight: '500'
    },
    activeTabText: {
        color: '#D32F2F',
        fontWeight: 'bold'
    },
    listContent: {
        padding: 16
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    urgentCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    vendorName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    cat: {
        fontSize: 12,
        color: '#888',
        fontWeight: 'normal'
    },
    billId: {
        fontSize: 12,
        color: '#999',
        marginTop: 2
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    date: {
        fontSize: 12,
        color: '#666',
        marginTop: 2
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5'
    },
    statusPill: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    statusText: {
        fontSize: 10,
        color: '#F57C00',
        fontWeight: 'bold'
    },
    payBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D32F2F',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    payBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 4
    }
});

export default PayablesScreen;
