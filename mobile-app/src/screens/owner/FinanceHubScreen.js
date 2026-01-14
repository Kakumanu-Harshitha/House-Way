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
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

const FinanceHubScreen = ({ navigation }) => {
    const [stats, setStats] = useState({
        receivables: 0,
        payables: 0,
        invoices: 0,
        orders: 0
    });
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [rec, pay, inv, pos] = await Promise.all([
                api.getReceivables(),
                api.getPayables(),
                api.getInvoices(),
                api.getPurchaseOrders()
            ]);

            const overdueRec = rec.filter(r => r.status === 'overdue').length;
            const urgentPay = pay.filter(p => p.status === 'urgent').length;
            const unpaidInv = inv.filter(i => i.status === 'sent' || i.status === 'overdue').length;
            const pendingPO = pos.filter(p => p.status === 'ordered' || p.status === 'shipped').length;

            setStats({
                receivables: overdueRec,
                payables: urgentPay,
                invoices: unpaidInv,
                orders: pendingPO
            });

            // Generate dynamic alerts
            const newAlerts = [];
            if (overdueRec > 0) newAlerts.push({ type: 'error', text: `${overdueRec} Invoices are overdue` });
            if (urgentPay > 0) newAlerts.push({ type: 'warning', text: `${urgentPay} Urgent bills to pay` });
            const arrivingPO = pos.find(p => p.status === 'arriving');
            if (arrivingPO) newAlerts.push({ type: 'info', text: `${arrivingPO.poNumber} delivery expected today` });

            setAlerts(newAlerts);

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

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#333" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Finance Hub" navigation={navigation} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Search Bar Placeholder */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#999" />
                    <Text style={styles.searchPlaceholder}>Global Search...</Text>
                </View>

                {/* Quick Access Grid */}
                <Text style={styles.sectionTitle}>QUICK ACCESS</Text>
                <View style={styles.gridContainer}>
                    <TouchableOpacity
                        style={styles.gridCard}
                        onPress={() => navigation.navigate('Receivables')}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardEmoji}>💰</Text>
                            <Ionicons name="arrow-forward" size={16} color="#ccc" />
                        </View>
                        <Text style={styles.cardTitle}>Receivables</Text>
                        <Text style={styles.cardSub}>{stats.receivables} Overdue</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridCard}
                        onPress={() => navigation.navigate('Payables')}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardEmoji}>💸</Text>
                            <Ionicons name="arrow-forward" size={16} color="#ccc" />
                        </View>
                        <Text style={styles.cardTitle}>Payables</Text>
                        <Text style={styles.cardSub}>{stats.payables} Urgent Bills</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridCard}
                        onPress={() => navigation.navigate('Invoices')}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardEmoji}>📄</Text>
                            <Ionicons name="arrow-forward" size={16} color="#ccc" />
                        </View>
                        <Text style={styles.cardTitle}>Invoices</Text>
                        <Text style={styles.cardSub}>{stats.invoices} Unpaid</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.gridCard}
                        onPress={() => navigation.navigate('PurchaseOrders')}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardEmoji}>📦</Text>
                            <Ionicons name="arrow-forward" size={16} color="#ccc" />
                        </View>
                        <Text style={styles.cardTitle}>Orders (PO)</Text>
                        <Text style={styles.cardSub}>{stats.orders} Active</Text>
                    </TouchableOpacity>
                </View>

                {/* Notifications */}
                <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
                <View style={styles.notificationCard}>
                    {alerts.length > 0 ? (
                        alerts.map((alert, index) => (
                            <View key={index}>
                                <View style={styles.notificationItem}>
                                    <Ionicons 
                                        name="notifications" 
                                        size={20} 
                                        color={alert.type === 'error' ? '#D32F2F' : alert.type === 'warning' ? '#FF9800' : '#2196F3'} 
                                        style={{ marginRight: 12 }} 
                                    />
                                    <Text style={styles.notificationText}>{alert.text}</Text>
                                </View>
                                {index < alerts.length - 1 && <View style={styles.divider} />}
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: '#999', padding: 16, textAlign: 'center' }}>No new notifications</Text>
                    )}
                </View>

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
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24
    },
    gridCard: {
        width: '48%',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    cardEmoji: {
        fontSize: 24
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4
    },
    cardSub: {
        fontSize: 12,
        color: '#666'
    },
    notificationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12
    },
    notificationText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500'
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginLeft: 44
    }
});

export default FinanceHubScreen;
