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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

const InvoicesScreen = ({ navigation }) => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All'); // All, Draft, Sent, Paid

    const fetchData = async () => {
        try {
            const data = await api.getInvoices();
            setInvoices(data);
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

    const filteredList = invoices.filter(item => {
        if (filter === 'All') return true;
        return item.status.toLowerCase() === filter.toLowerCase();
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return '#4CAF50';
            case 'sent': return '#FFC107';
            case 'overdue': return '#D32F2F';
            default: return '#9E9E9E';
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.invId}>{item.id}</Text>
                <Text style={styles.amount}>${item.amount.toLocaleString()}</Text>
            </View>
            <Text style={styles.client}>Client: {item.clientName}</Text>
            <Text style={styles.date}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>

            <View style={styles.footer}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status === 'paid' ? '✅ Paid' : item.status === 'sent' ? '⏳ Sent' : item.status === 'overdue' ? '🔴 Overdue' : '📝 Draft'}
                    </Text>
                </View>
                {item.status === 'paid' && (
                    <TouchableOpacity style={styles.pdfBtn}>
                        <Ionicons name="document-text-outline" size={14} color="#666" />
                        <Text style={styles.pdfText}>PDF</Text>
                    </TouchableOpacity>
                )}
                {item.status === 'sent' && (
                    <TouchableOpacity style={styles.pdfBtn}>
                        <Ionicons name="mail-outline" size={14} color="#666" />
                        <Text style={styles.pdfText}>Resend</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#333" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <AdminNavbar title="Invoices" navigation={navigation} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Invoices</Text>
                <TouchableOpacity style={styles.addBtn}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filterContainer}>
                {['All', 'Paid', 'Sent', 'Draft'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.activeFilterChip]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredList}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Text style={{ color: '#999' }}>No invoices found</Text>
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
    addBtn: {
        backgroundColor: '#333',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 8
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#eee'
    },
    activeFilterChip: {
        backgroundColor: '#333',
        borderColor: '#333'
    },
    filterText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500'
    },
    activeFilterText: {
        color: '#fff'
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
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    invId: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333'
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
    },
    client: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2
    },
    date: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5',
        paddingTop: 12
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold'
    },
    pdfBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 4
    },
    pdfText: {
        fontSize: 12,
        color: '#666',
        marginLeft: 4,
        fontWeight: '500'
    }
});

export default InvoicesScreen;
