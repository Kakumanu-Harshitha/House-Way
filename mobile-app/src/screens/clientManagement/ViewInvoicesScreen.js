import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { invoicesAPI } from '../../utils/api';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import BottomNavBar from '../../components/common/BottomNavBar';

// Premium White Theme with Gold Accents
const COLORS = {
    primary: '#D4AF37',        // Dark Golden Rod
    primaryLight: 'rgba(184, 134, 11, 0.15)',
    background: '#FFFFFF',     // Clean White
    cardBg: '#FFFFFF',         // White cards
    cardBorder: 'rgba(184, 134, 11, 0.1)',
    text: '#1A1A1A',           // Dark text
    textMuted: '#666666',      // Muted text
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
};

const ViewInvoicesScreen = ({ navigation, route }) => {
    const { projectId } = route?.params || {};
    const { user, isAuthenticated } = useAuth();
    const { isCheckedIn } = useAttendance();

    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        // Protection: If employee is not checked in, redirect to Check-In screen
        if (isAuthenticated && user?.role === 'employee' && !isCheckedIn) {
            if (Platform.OS === 'web') {
                alert('⏳ Access Denied: You must be Checked-In to view invoices.');
            } else {
                Alert.alert('Check-In Required', 'You must be Checked-In to view invoices.');
            }
            navigation.replace('CheckIn');
            return;
        }

        loadInvoices();
    }, [projectId, isAuthenticated, user, isCheckedIn, navigation]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const response = await invoicesAPI.getProjectInvoices(projectId);
            if (response.success) {
                setInvoices(response.data.invoices);
            }
        } catch (error) {
            console.error('Error loading invoices:', error);
            Alert.alert('Error', 'Failed to load invoices');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadInvoices();
    };

    const getStatusColor = (status) => {
        const colors = {
            draft: COLORS.textMuted,
            sent: COLORS.warning,
            viewed: COLORS.primary,
            paid: COLORS.success,
            overdue: COLORS.danger,
        };
        return colors[status] || COLORS.textMuted;
    };

    const confirmDelete = (invoiceId) => {
        Alert.alert(
            'Delete Invoice',
            'Are you sure you want to delete this invoice? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => deleteInvoice(invoiceId)
                }
            ]
        );
    };

    const deleteInvoice = async (invoiceId) => {
        try {
            const response = await invoicesAPI.deleteInvoice(invoiceId);
            if (response.success) {
                setInvoices(invoices.filter(inv => inv._id !== invoiceId));
                Alert.alert('Success', 'Invoice deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete invoice');
        }
    };

    const generatePDF = async (invoice) => {
        try {
            const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #FFD700; padding-bottom: 20px; }
              .title { font-size: 30px; font-weight: bold; color: #333; }
              .status { font-size: 14px; text-transform: uppercase; color: #666; font-weight: bold; letter-spacing: 1px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
              .label { font-size: 12px; color: #888; text-transform: uppercase; margin-bottom: 5px; }
              .value { font-size: 16px; font-weight: 600; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { text-align: left; padding: 12px 8px; border-bottom: 1px solid #ddd; color: #555; text-transform: uppercase; font-size: 12px; }
              td { padding: 12px 8px; border-bottom: 1px solid #eee; }
              .total-row { display: flex; justify-content: flex-end; margin-bottom: 5px; }
              .total-label { margin-right: 20px; font-weight: 600; color: #666; }
              .total-value { font-weight: bold; width: 100px; text-align: right; }
              .grand-total { font-size: 20px; color: #000; margin-top: 10px; border-top: 2px solid #FFD700; padding-top: 10px; }
              .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #aaa; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">INVOICE</div>
                <div style="color: #FFD700; font-weight: bold; margin-top: 5px;">HOUSEWAY</div>
              </div>
              <div style="text-align: right;">
                <div class="value">#${invoice.invoiceNumber}</div>
                <div class="status">${invoice.status}</div>
              </div>
            </div>

            <div class="info-grid">
              <div>
                <div class="label">Billed To</div>
                <div class="value">${invoice.clientId?.firstName} ${invoice.clientId?.lastName}</div>
                <div>${invoice.clientId?.email || ''}</div>
              </div>
              <div style="text-align: right;">
                <div class="label">Dates</div>
                <div>Issued: ${new Date(invoice.issueDate).toLocaleDateString()}</div>
                <div>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.lineItems.map(item => `
                  <tr>
                    <td>${item.description}</td>
                    <td style="text-align: right;">${item.quantity}</td>
                    <td style="text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right;">₹${item.total.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-row">
              <span class="total-label">Subtotal</span>
              <span class="total-value">₹${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span class="total-label">Tax (${invoice.taxRate}%)</span>
              <span class="total-value">₹${invoice.taxAmount.toFixed(2)}</span>
            </div>
             <div class="total-row grand-total">
              <span class="total-label">Total</span>
              <span class="total-value">₹${invoice.totalAmount.toFixed(2)}</span>
            </div>

            <div class="footer">
              <p>${invoice.paymentTerms || 'Payment due on receipt.'}</p>
              <p>Thank you for your business!</p>
            </div>
          </body>
        </html>
      `;

            const { uri } = await Print.printToFileAsync({ html });
            console.log('File has been saved to:', uri);
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) {
            console.error('Error generating PDF:', error);
            Alert.alert('Error', 'Failed to generate PDF');
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                    <Text style={styles.date}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: getStatusColor(item.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.cardBody}>
                <View>
                    <Text style={styles.label}>Amount</Text>
                    <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>
                </View>
                <View style={styles.actions}>
                    {item.status === 'draft' && (
                        <TouchableOpacity style={styles.iconBtn} onPress={() => confirmDelete(item._id)}>
                            <Feather name="trash-2" size={20} color={COLORS.danger} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.iconBtn} onPress={() => generatePDF(item)}>
                        <Feather name="download" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => { /* Navigate to detail view if needed */ }}>
                        <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[COLORS.background, COLORS.background, COLORS.background]}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Invoices</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => navigation.navigate('CreateInvoice', { projectId })}
                    >
                        <Feather name="plus" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    bounces={Platform.OS !== 'web'}
                    scrollEventThrottle={16}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                >
                    {invoices.length > 0 ? (
                        invoices.map((item) => (
                            <View key={item._id}>
                                {renderItem({ item })}
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Feather name="file-text" size={48} color={COLORS.textMuted} />
                            <Text style={styles.emptyText}>No invoices found</Text>
                            <TouchableOpacity
                                style={styles.createBtn}
                                onPress={() => navigation.navigate('CreateInvoice', { projectId })}
                            >
                                <Text style={styles.createBtnText}>Create First Invoice</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
            <BottomNavBar navigation={navigation} activeTab="projects" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.primary,
    },
    addBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
        flexGrow: 1,
        paddingBottom: 100,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    invoiceNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    date: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.cardBorder,
        marginVertical: 12,
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
    },
    amount: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937', // Dark amount
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textMuted,
        marginTop: 16,
        marginBottom: 24,
    },
    createBtn: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    createBtnText: {
        color: '#1F2937', // Dark text on yellow button
        fontWeight: '700',
    }

});

export default ViewInvoicesScreen;
