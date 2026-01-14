import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usersAPI, purchaseOrdersAPI, vendorInvoicesAPI } from '../../utils/api';
import AdminNavbar from '../../components/AdminNavbar';

const getId = (value) => (typeof value === 'string' ? value : value?._id);
const getInvoiceAmount = (invoice) => Number(invoice?.totalAmount ?? invoice?.amount ?? 0);
const getOrderFinalAmount = (order) => Number(order?.negotiation?.finalAmount ?? order?.finalAmount ?? order?.totalAmount ?? 0);

// Vendor List Item
const VendorListItem = ({ vendor, onPress, pendingCount, ordersCount }) => (
  <TouchableOpacity style={styles.listItem} onPress={onPress}>
    <View style={styles.vendorAvatar}>
      <Text style={styles.avatarText}>
        {vendor.vendorDetails?.companyName?.[0] || vendor.firstName?.[0] || '?'}
      </Text>
    </View>
    <View style={styles.listContent}>
      <Text style={styles.listTitle}>
        {vendor.vendorDetails?.companyName || `${vendor.firstName} ${vendor.lastName}`}
      </Text>
      <Text style={styles.listSubtitle}>
        {ordersCount > 0 ? `${ordersCount} active order${ordersCount !== 1 ? 's' : ''} • ` : ''}
        {pendingCount} pending action{pendingCount !== 1 ? 's' : ''}
      </Text>
    </View>
    <View style={styles.pendingBadge}>
      <Text style={styles.pendingText}>{pendingCount} ⚡</Text>
    </View>
  </TouchableOpacity>
);

// Vendor Projects Modal - shows orders and invoices for a single vendor
const VendorProjectsModal = ({ visible, vendor, onClose, onSelectInvoice, onSelectOrder }) => {
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    if (visible && vendor) {
      fetchVendorData();
    }
  }, [visible, vendor]);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      // Get vendor invoices
      const invoicesRes = await vendorInvoicesAPI.getVendorInvoices();
      const invoiceList = invoicesRes?.data?.invoices || [];
      const vendorInvoices = invoiceList.filter((inv) => getId(inv.vendor) === vendor._id);
      setInvoices(vendorInvoices);

      // Get vendor orders
      const ordersResponse = await purchaseOrdersAPI.getPurchaseOrders({ vendorId: vendor._id });
      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = Array.isArray(ordersResponse.data)
          ? ordersResponse.data
          : ordersResponse.data.purchaseOrders || [];
        const activeOrders = ordersData.filter((o) => o.status !== 'draft');
        setOrders(activeOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      setInvoices([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getOrderStatusConfig = (status) => {
    const configs = {
      sent: { color: '#3B82F6', bgColor: '#DBEAFE', label: 'New' },
      in_negotiation: { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Negotiating' },
      accepted: { color: '#10B981', bgColor: '#D1FAE5', label: 'Accepted' },
      rejected: { color: '#EF4444', bgColor: '#FEE2E2', label: 'Rejected' },
      completed: { color: '#059669', bgColor: '#D1FAE5', label: 'Completed' },
    };
    return configs[status] || { color: '#6B7280', bgColor: '#F3F4F6', label: status };
  };

  if (!vendor) return null;

  const vendorName = vendor.vendorDetails?.companyName || `${vendor.firstName} ${vendor.lastName}`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{vendorName}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'orders' && styles.tabButtonActive]}
            onPress={() => setActiveTab('orders')}
          >
            <MaterialCommunityIcons
              name="clipboard-text-outline"
              size={18}
              color={activeTab === 'orders' ? '#3B82F6' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
              Orders ({orders.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'invoices' && styles.tabButtonActive]}
            onPress={() => setActiveTab('invoices')}
          >
            <Ionicons
              name="receipt-outline"
              size={18}
              color={activeTab === 'invoices' ? '#3B82F6' : '#6B7280'}
            />
            <Text style={[styles.tabText, activeTab === 'invoices' && styles.tabTextActive]}>
              Invoices ({invoices.length})
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <ScrollView style={styles.modalBody}>
            {activeTab === 'orders' ? (
              <>
                {orders.map((order) => {
                  const statusConfig = getOrderStatusConfig(order.status);
                  return (
                    <TouchableOpacity
                      key={order._id}
                      style={styles.orderItem}
                      onPress={() => onSelectOrder(order)}
                    >
                      <View style={styles.orderHeader}>
                        <Text style={styles.orderNumber}>{order.orderNumber || order.purchaseOrderNumber}</Text>
                        <View
                          style={[styles.orderStatusBadge, { backgroundColor: statusConfig.bgColor }]}
                        >
                          <Text style={[styles.orderStatusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.orderTitle} numberOfLines={1}>
                        {order.title}
                      </Text>

                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <View style={styles.orderMaterialsBlock}>
                          <Text style={styles.orderMaterialsLabel}>Materials</Text>
                          {order.items.slice(0, 3).map((item, idx) => (
                            <View key={idx} style={styles.orderMaterialRow}>
                              <MaterialCommunityIcons name="circle-small" size={16} color="#6B7280" />
                              <Text style={styles.orderMaterialName} numberOfLines={1}>
                                {(item.materialName || item.name || 'Item').trim()}
                              </Text>
                              <Text style={styles.orderMaterialQty}>
                                {item.quantity} {item.unit || ''}
                              </Text>
                            </View>
                          ))}
                          {order.items.length > 3 && (
                            <Text style={styles.orderMoreMaterials}>
                              +{order.items.length - 3} more items
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={styles.orderFooter}>
                        <Text style={styles.orderProject}>{order.project?.title || 'Project'}</Text>
                        {getOrderFinalAmount(order) > 0 && (
                          <Text style={styles.orderAmount}>
                            ₹{getOrderFinalAmount(order).toLocaleString()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.orderAction}>
                        <Text style={styles.orderActionText}>
                          {order.status === 'sent'
                            ? 'Pending vendor quotation'
                            : order.status === 'in_negotiation'
                              ? 'Tap to negotiate'
                              : 'Tap to view details'}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {orders.length === 0 && (
                  <View style={styles.emptyOrdersContainer}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={50} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No orders sent to this vendor</Text>
                    <Text style={styles.emptySubtext}>Create an order to start negotiations</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {invoices.map((invoice) => (
                  <TouchableOpacity
                    key={invoice._id}
                    style={styles.invoiceItem}
                    onPress={() => onSelectInvoice(invoice)}
                  >
                    <View style={styles.invoiceLeft}>
                      <Text style={styles.invoiceName}>Invoice #{invoice.invoiceNumber}</Text>
                      <Text style={styles.invoiceProject}>{invoice.project?.title || 'Project'}</Text>
                    </View>
                    <View style={styles.invoiceRight}>
                      <View
                        style={[
                          styles.badge,
                          invoice.status === 'pending'
                            ? styles.badgeWarning
                            : invoice.status === 'paid'
                              ? styles.badgeSuccess
                              : invoice.status === 'approved'
                                ? styles.badgeInfo
                                : styles.badgeNeutral,
                        ]}
                      >
                        <Text style={styles.badgeText}>
                          {invoice.status === 'pending'
                            ? 'Negotiation'
                            : invoice.status === 'approved'
                              ? 'Under Review'
                              : invoice.status}
                        </Text>
                      </View>
                      <Text style={styles.invoiceAmount}>
                        ₹{getInvoiceAmount(invoice).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {invoices.length === 0 && <Text style={styles.emptyText}>No invoices found</Text>}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// Main Screen Component
const OwnerVendorsScreen = ({ navigation }) => {
  const [vendors, setVendors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('vendors');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      const [vendorsRes, invoicesRes, ordersResponse] = await Promise.all([
        usersAPI.getUsers({ role: 'vendor' }),
        vendorInvoicesAPI.getVendorInvoices(),
        purchaseOrdersAPI.getPurchaseOrders(),
      ]);

      // Handle vendors response
      const vendorsData = vendorsRes.data?.users || vendorsRes || [];
      setVendors(vendorsData);
      
      // Handle invoices response
      const invoicesData = invoicesRes?.data?.invoices || [];
      setInvoices(invoicesData);
      
      // Handle orders response
      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = Array.isArray(ordersResponse.data)
          ? ordersResponse.data
          : ordersResponse.data.purchaseOrders || [];
        setOrders(ordersData.filter(o => o.status !== 'draft'));
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load vendor data. Please check your connection and try again.');
      setVendors([]);
      setInvoices([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleVendorPress = (vendor) => {
    setSelectedVendor(vendor);
    setShowProjectsModal(true);
  };

  const handleInvoiceSelect = (invoice) => {
    setShowProjectsModal(false);
    const orderId = invoice?.purchaseOrder?._id || invoice?.purchaseOrder;
    if (orderId) {
      navigation.navigate('NegotiationChat', {
        orderId,
        userRole: 'owner',
      });
    } else {
      Alert.alert('Missing data', 'Purchase order not found for this invoice.');
    }
  };

  const handleOrderSelect = (order) => {
    setShowProjectsModal(false);
    navigation.navigate('NegotiationChat', {
      orderId: order._id,
      userRole: 'owner',
    });
  };

  const getVendorPendingCount = (vendorId) => {
    // Count pending invoices + orders in_negotiation (have pending quotations)
    const pendingInvoiceCount = (Array.isArray(invoices) ? invoices : []).filter(
      (inv) => getId(inv.vendor) === vendorId && inv.status === 'pending'
    ).length;
    const pendingQuotationsCount = orders.filter((ord) => {
      const orderVendorId = typeof ord.vendor === 'string' ? ord.vendor : ord.vendor?._id;
      return orderVendorId === vendorId && ord.status === 'in_negotiation';
    }).length;
    return pendingInvoiceCount + pendingQuotationsCount;
  };

  const getVendorOrdersCount = (vendorId) => {
    if (!Array.isArray(orders)) return 0;
    return orders.filter((ord) => {
      const orderVendorId = typeof ord.vendor === 'string' ? ord.vendor : ord.vendor?._id;
      return orderVendorId === vendorId && ['sent', 'in_negotiation'].includes(ord.status);
    }).length;
  };
  
  // Get count of orders with pending quotations (for notification)
  const getPendingQuotationsTotal = () => {
    if (!Array.isArray(orders)) return 0;
    return orders.filter(ord => ord.status === 'in_negotiation').length;
  };

  const acceptedInvoices = (Array.isArray(invoices) ? invoices : []).filter(
    (inv) => inv.status === 'approved' || inv.status === 'paid'
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading vendors...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AdminNavbar title="Manage Vendors" navigation={navigation} />

      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Vendors</Text>
          {getPendingQuotationsTotal() > 0 && (
            <View style={styles.pendingBadgeHeader}>
              <Text style={styles.pendingBadgeHeaderText}>
                {getPendingQuotationsTotal()} pending
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.deliveryButton}
            onPress={() => navigation.navigate('AdminDeliveryTracking')}
          >
            <MaterialCommunityIcons name="truck-delivery" size={20} color="#3B82F6" />
            <Text style={styles.deliveryButtonText}>Track Deliveries</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={fetchData}>
            <Ionicons name="refresh" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'vendors' && styles.toggleButtonActive]}
          onPress={() => setViewMode('vendors')}
        >
          <Text style={[styles.toggleText, viewMode === 'vendors' && styles.toggleTextActive]}>
            Vendors
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'accepted' && styles.toggleButtonActive]}
          onPress={() => setViewMode('accepted')}
        >
          <Text style={[styles.toggleText, viewMode === 'accepted' && styles.toggleTextActive]}>
            Accepted Invoices
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - Fix 27 */}
      {viewMode === 'vendors' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors by name or company..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'vendors' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>VENDOR DIRECTORY</Text>
            {vendors
              .filter(vendor => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                const vendorName = `${vendor.firstName || ''} ${vendor.lastName || ''}`.toLowerCase();
                const companyName = (vendor.vendorDetails?.companyName || '').toLowerCase();
                return vendorName.includes(query) || companyName.includes(query);
              })
              .map((vendor) => (
              <VendorListItem
                key={vendor._id}
                vendor={vendor}
                pendingCount={getVendorPendingCount(vendor._id)}
                ordersCount={getVendorOrdersCount(vendor._id)}
                onPress={() => handleVendorPress(vendor)}
              />
            ))}
            {vendors.length === 0 && <Text style={styles.emptyText}>No vendors found</Text>}
            {vendors.length > 0 && searchQuery.trim() && vendors.filter(v => {
              const query = searchQuery.toLowerCase();
              const vendorName = `${v.firstName || ''} ${v.lastName || ''}`.toLowerCase();
              const companyName = (v.vendorDetails?.companyName || '').toLowerCase();
              return vendorName.includes(query) || companyName.includes(query);
            }).length === 0 && (
              <Text style={styles.emptyText}>No vendors match "{searchQuery}"</Text>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>ACCEPTED INVOICES OVERVIEW</Text>
            {acceptedInvoices.map((invoice) => {
              const invoiceVendorId = getId(invoice.vendor);
              const vendor = vendors.find((v) => v._id === invoiceVendorId);
              const vendorName =
                vendor?.vendorDetails?.companyName || `${vendor?.firstName || ''} ${vendor?.lastName || ''}` ||
                'Unknown Vendor';

              return (
                <View key={invoice._id} style={styles.acceptedInvoiceItem}>
                  <View style={styles.invoiceLeft}>
                    <Text style={styles.invoiceName}>{vendorName}</Text>
                    <Text style={styles.invoiceProject}>Invoice #{invoice.invoiceNumber}</Text>
                  </View>
                  <View style={styles.invoiceRight}>
                    <View style={[styles.badge, styles.badgeSuccess]}>
                      <Text style={styles.badgeText}>✓ Accepted</Text>
                    </View>
                    <Text style={styles.invoiceAmount}>
                      ₹{getInvoiceAmount(invoice).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
            {acceptedInvoices.length === 0 && <Text style={styles.emptyText}>No accepted invoices yet</Text>}
          </View>
        )}
      </ScrollView>

      <VendorProjectsModal
        visible={showProjectsModal}
        vendor={selectedVendor}
        onClose={() => {
          setShowProjectsModal(false);
          setSelectedVendor(null);
        }}
        onSelectInvoice={handleInvoiceSelect}
        onSelectOrder={handleOrderSelect}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
  },
  pendingBadgeHeader: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingBadgeHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  deliveryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffc107',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  toggleTextActive: {
    color: '#212529',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
    borderRadius: 8,
  },
  vendorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffc107',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
  },
  listContent: {
    flex: 1,
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
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fff3cd',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    paddingVertical: 20,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  emptyOrdersContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  orderStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  orderMaterialsBlock: {
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderMaterialsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  orderMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderMaterialName: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  orderMaterialQty: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  orderMoreMaterials: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderProject: {
    fontSize: 12,
    color: '#6B7280',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  orderAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderActionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
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
    fontSize: 16,
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  acceptedInvoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  invoiceLeft: {
    flex: 1,
  },
  invoiceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  invoiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  invoiceProject: {
    fontSize: 12,
    color: '#6c757d',
  },
  invoiceAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
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
  badgeNeutral: {
    backgroundColor: '#6c757d',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#111827',
  },
});

export default OwnerVendorsScreen;
