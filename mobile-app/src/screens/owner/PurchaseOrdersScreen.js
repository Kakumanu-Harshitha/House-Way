import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    TextInput,
    ActivityIndicator,
    StatusBar
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersAPI } from '../../utils/api';
import AdminNavbar from '../../components/AdminNavbar';

const PurchaseOrdersScreen = ({ navigation, route }) => {
    const targetOrderId = route?.params?.orderId;
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchData = async () => {
        try {
            const response = await purchaseOrdersAPI.getPurchaseOrders();
            // Handle the response properly
            const data = response.success 
                ? (response.data?.purchaseOrders || response.data || [])
                : [];
            // Normalize data to handle both formats
            const normalizedOrders = (data || []).map(order => ({
                ...order,
                id: order._id || order.id,
                poNumber: order.purchaseOrderNumber || order.poNumber,
                vendorName: order.vendor?.vendorDetails?.companyName || 
                           `${order.vendor?.firstName || ''} ${order.vendor?.lastName || ''}`.trim() ||
                           order.vendorName || 'Unknown Vendor',
                items: order.items?.length ? `${order.items.length} items` : order.items,
                amount: order.totalAmount || order.finalAmount || order.amount || 0,
            }));
            setOrders(normalizedOrders);

            // Apply initial filtering if targetOrderId is present
            if (targetOrderId) {
                const filtered = normalizedOrders.filter(o => o.id === targetOrderId || o._id === targetOrderId);
                if (filtered.length > 0) {
                    setFilteredOrders(filtered);
                } else {
                    setFilteredOrders(normalizedOrders);
                }
            } else {
                setFilteredOrders(normalizedOrders);
            }
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

    const getDisplayList = () => {
        // If we have a target order and haven't cleared it, show only that
        if (targetOrderId && filteredOrders.length === 1 && orders.length > 1) {
            return filteredOrders;
        }

        return orders.filter(item => 
            (item.poNumber || '').toLowerCase().includes(search.toLowerCase()) ||
            (item.vendorName || '').toLowerCase().includes(search.toLowerCase())
        );
    };

    const renderItem = ({ item }) => {
        // Map delivery tracking status to display status
        const deliveryStatus = item.deliveryTracking?.status || 'not_started';
        const isShipped = ['packed', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered'].includes(deliveryStatus);
        const isArriving = ['in_transit', 'out_for_delivery', 'delivered'].includes(deliveryStatus);
        const isDelivered = deliveryStatus === 'delivered';
        
        return (
            <TouchableOpacity 
                style={styles.card}
                onPress={() => navigation.navigate('NegotiationChat', { orderId: item.id || item._id, userRole: 'owner' })}
                activeOpacity={0.7}
            >
                <View style={styles.headerRow}>
                    <Text style={styles.poNum}>{item.poNumber} <Text style={styles.vendor}>• {item.vendorName}</Text></Text>
                </View>
                <Text style={styles.items}>{item.items}</Text>
                <Text style={styles.amount}>₹{(item.amount || 0).toLocaleString()}</Text>

                <View style={styles.statusContainer}>
                    <Text style={styles.statusLabel}>Status: {item.status}</Text>

                    {/* Visual Steps */}
                    <View style={styles.steps}>
                        <View style={styles.stepItem}>
                            <View style={[styles.dot, styles.activeDot]} />
                            <Text style={styles.stepText}>Ordered</Text>
                        </View>
                        <View style={[styles.line, isShipped && styles.activeLine]} />

                        <View style={styles.stepItem}>
                            <View style={[styles.dot, isShipped ? styles.activeDot : styles.inactiveDot]} />
                            <Text style={styles.stepText}>Shipped</Text>
                        </View>
                        <View style={[styles.line, isArriving && styles.activeLine]} />

                    <View style={styles.stepItem}>
                        <View style={[styles.dot, isArriving ? styles.activeDot : styles.inactiveDot]} />
                        <Text style={styles.stepText}>Arriving</Text>
                        {isArriving && !isDelivered && <Text style={styles.eta}>(Soon)</Text>}
                    </View>
                </View>
            </View>
            
            <View style={styles.cardAction}>
                <Text style={styles.cardActionText}>Tap to view details</Text>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </View>
        </TouchableOpacity>
        );
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#333" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Purchase Orders" navigation={navigation} />

            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#999" />
                <TextInput 
                    placeholder="Search PO Number or Vendor..." 
                    style={styles.searchInput} 
                    value={search}
                    onChangeText={setSearch}
                />
            </View>

            {targetOrderId && filteredOrders.length === 1 && orders.length > 1 && (
                <View style={styles.filterBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="filter" size={16} color="#92400E" />
                        <Text style={styles.filterBannerText}>Showing specific order</Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => setFilteredOrders(orders)}
                        style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
                    >
                        <Text style={styles.clearFilterText}>Show All</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                data={getDisplayList()}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: '#999' }}>No orders found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },

    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
    searchInput: { flex: 1, marginLeft: 8 },

    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
    headerRow: { marginBottom: 4 },
    poNum: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    vendor: { fontWeight: 'normal', color: '#666' },
    items: { fontSize: 13, color: '#444', marginBottom: 2 },
    amount: { fontSize: 15, fontWeight: 'bold', marginBottom: 16, color: '#333' },

    statusContainer: { borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 12 },
    statusLabel: { fontSize: 12, color: '#999', marginBottom: 8 },
    
    steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    stepItem: { alignItems: 'center', width: 60 },
    dot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4 },
    activeDot: { backgroundColor: '#4CAF50' },
    inactiveDot: { backgroundColor: '#eee' },
    line: { flex: 1, height: 2, backgroundColor: '#eee', marginBottom: 14 },
    activeLine: { backgroundColor: '#4CAF50' },
    stepText: { fontSize: 10, color: '#666' },
    eta: { fontSize: 10, color: '#D32F2F', fontWeight: 'bold' },
    cardAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    cardActionText: { fontSize: 12, color: '#9CA3AF', marginRight: 4 },
    filterBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FDE68A',
    },
    filterBannerText: {
        fontSize: 13,
        color: '#92400E',
        fontWeight: '500',
    },
    clearFilterText: {
        fontSize: 13,
        color: '#3B82F6',
        fontWeight: '600',
    },
});

export default PurchaseOrdersScreen;
