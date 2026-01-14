/**
 * VendorDeliveryScreen
 * 
 * Allows vendors to update delivery status for their accepted orders.
 * Only shows orders with status 'accepted' or 'acknowledged'.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersAPI } from '../../utils/api';
import DeliveryCard from '../../components/common/DeliveryCard';
import { useAuth } from '../../context/AuthContext';
import socket from '../../utils/socket';

// Array version for vendor status selector modal
const DELIVERY_STATUSES = [
  { value: 'not_started', label: 'Not Started', icon: 'clipboard-outline', color: '#9CA3AF' },
  { value: 'preparing', label: 'Preparing', icon: 'hammer-outline', color: '#3B82F6' },
  { value: 'packed', label: 'Packed', icon: 'cube-outline', color: '#6366F1' },
  { value: 'dispatched', label: 'Dispatched', icon: 'rocket-outline', color: '#F59E0B' },
  { value: 'in_transit', label: 'In Transit', icon: 'car-outline', color: '#8B5CF6' },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle-outline', color: '#7C3AED' },
  { value: 'delivered', label: 'Delivered', icon: 'checkmark-circle', color: '#10B981' },
  { value: 'partially_delivered', label: 'Partially Delivered', icon: 'alert-circle-outline', color: '#F97316' },
];

// Date options for expected arrival picker
const getDateOptions = () => {
  const options = [];
  const today = new Date();
  for (let i = 0; i <= 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    options.push({
      value: date.toISOString().split('T')[0],
      label: label,
    });
  }
  return options;
};

const VendorDeliveryScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const vendorId = user?._id;
  const targetOrderId = route?.params?.orderId;
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    status: '',
    trackingNumber: '',
    carrier: '',
    expectedArrival: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('[VendorDelivery] Fetching orders...');
      const response = await purchaseOrdersAPI.getMyOrders();
      
      if (response.success && response.data) {
        // Handle both response formats: array or object with purchaseOrders property
        const ordersList = Array.isArray(response.data) 
          ? response.data 
          : (response.data.purchaseOrders || []);
        
        console.log('[VendorDelivery] All orders:', ordersList.length);
        
        // Show orders that are accepted or in delivery phases
        const deliverableOrders = ordersList.filter(order => 
          ['accepted', 'in_progress', 'acknowledged', 'partially_delivered', 'completed'].includes(order.status)
        );
        
        console.log('[VendorDelivery] Deliverable orders:', deliverableOrders.length);
        setOrders(deliverableOrders);

        // Apply filtering if targetOrderId is present
        if (targetOrderId) {
          const filtered = deliverableOrders.filter(o => o._id === targetOrderId);
          setFilteredOrders(filtered.length > 0 ? filtered : deliverableOrders);
        } else {
          setFilteredOrders(deliverableOrders);
        }
      } else {
        console.log('[VendorDelivery] No success response:', response);
        setOrders([]);
        setFilteredOrders([]);
      }
    } catch (error) {
      console.error('[VendorDelivery] Failed to fetch orders:', error);
      Alert.alert('Error', 'Failed to load orders');
      setOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load and socket listeners
  React.useEffect(() => {
    fetchOrders();

    // Join vendor room for real-time updates
    if (vendorId) {
      socket.emit('joinRoom', `vendor_${vendorId}`);
      console.log('[VendorDelivery] Joined room:', `vendor_${vendorId}`);
    }

    // Listen for order updates
    const handleOrderUpdated = (data) => {
      console.log('[VendorDelivery] Order updated:', data);
      fetchOrders();
    };

    const handleQuotationAccepted = (data) => {
      console.log('[VendorDelivery] Quotation accepted:', data);
      fetchOrders();
    };

    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('quotationAccepted', handleQuotationAccepted);

    return () => {
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('quotationAccepted', handleQuotationAccepted);
    };
  }, [vendorId]);

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const openDeliveryModal = (order) => {
    setSelectedOrder(order);
    setDeliveryForm({
      status: order.deliveryTracking?.status || 'not_started',
      trackingNumber: order.deliveryTracking?.trackingNumber || '',
      carrier: order.deliveryTracking?.carrier || '',
      expectedArrival: order.deliveryTracking?.expectedArrival 
        ? new Date(order.deliveryTracking.expectedArrival).toISOString().split('T')[0]
        : '',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleUpdateDelivery = async () => {
    if (!deliveryForm.status || deliveryForm.status === 'not_started') {
      Alert.alert('Error', 'Please select a delivery status');
      return;
    }

    // Confirm if marking as delivered
    if (deliveryForm.status === 'delivered') {
      Alert.alert(
        'Confirm Delivery',
        'Are you sure you want to mark this order as delivered? This will complete the order.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Delivery', onPress: submitDeliveryUpdate, style: 'default' }
        ]
      );
      return;
    }

    await submitDeliveryUpdate();
  };

  const submitDeliveryUpdate = async () => {
    try {
      setSubmitting(true);
      const response = await purchaseOrdersAPI.updateDeliveryStatus(
        selectedOrder._id,
        deliveryForm
      );

      if (response.success) {
        const statusLabel = DELIVERY_STATUSES.find(s => s.value === deliveryForm.status)?.label || 'updated';
        Alert.alert(
          'Success', 
          deliveryForm.status === 'delivered' 
            ? 'Order marked as delivered and completed!' 
            : `Delivery status updated to ${statusLabel}`
        );
        setModalVisible(false);
        fetchOrders();
      } else {
        Alert.alert('Error', response.message || 'Failed to update delivery status');
      }
    } catch (error) {
      console.error('Update delivery error:', error);
      Alert.alert('Error', 'Failed to update delivery status');
    } finally {
      setSubmitting(false);
    }
  };

  const getLocalStatusConfig = (status) => {
    return DELIVERY_STATUSES.find(s => s.value === status) || DELIVERY_STATUSES[0];
  };

  const renderOrderItem = ({ item: order }) => {
    return (
      <DeliveryCard
        order={order}
        showVendor={false}
        showAmount={true}
        onPress={() => openDeliveryModal(order)}
      />
    );
  };

  // Update form field helper
  const updateFormField = (field, value) => {
    setDeliveryForm(prev => ({ ...prev, [field]: value }));
  };

  // Select date helper
  const selectDate = (dateValue) => {
    setDeliveryForm(prev => ({ ...prev, expectedArrival: dateValue }));
    setDatePickerVisible(false);
  };

  // Get formatted date label
  const getDateLabel = () => {
    if (!deliveryForm.expectedArrival) return 'Select expected arrival date';
    const options = getDateOptions();
    const selected = options.find(o => o.value === deliveryForm.expectedArrival);
    if (selected) return selected.label;
    return new Date(deliveryForm.expectedArrival).toLocaleDateString('en-IN', { 
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Tracking</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Delivery Tracking</Text>
          <Text style={styles.headerSubtitle}>{orders.length} active {orders.length === 1 ? 'order' : 'orders'}</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Active Deliveries</Text>
          <Text style={styles.emptySubtitle}>
            Accepted orders will appear here for delivery tracking
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
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
            data={filteredOrders}
            keyExtractor={(item) => item._id}
            renderItem={renderOrderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        </View>
      )}

      {/* Delivery Update Modal - Inline to prevent re-renders */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Delivery Status</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalScrollView} 
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.orderInfoText}>
                {selectedOrder?.purchaseOrderNumber} - {selectedOrder?.title}
              </Text>

              <Text style={styles.inputLabel}>Delivery Status *</Text>
              <View style={styles.statusOptions}>
                {DELIVERY_STATUSES.slice(1).map((status) => (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.statusOption,
                      deliveryForm.status === status.value && styles.statusOptionActive,
                    ]}
                    onPress={() => updateFormField('status', status.value)}
                  >
                    <Ionicons
                      name={status.icon}
                      size={18}
                      color={deliveryForm.status === status.value ? '#fff' : status.color}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        deliveryForm.status === status.value && styles.statusOptionTextActive,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Tracking Number</Text>
              <TextInput
                style={styles.input}
                value={deliveryForm.trackingNumber}
                onChangeText={(text) => updateFormField('trackingNumber', text)}
                placeholder="TRK123456789"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />

              <Text style={styles.inputLabel}>Carrier</Text>
              <TextInput
                style={styles.input}
                value={deliveryForm.carrier}
                onChangeText={(text) => updateFormField('carrier', text)}
                placeholder="Blue Dart, Delhivery, etc."
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Expected Arrival</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setDatePickerVisible(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={[
                  styles.datePickerText,
                  !deliveryForm.expectedArrival && styles.datePickerPlaceholder
                ]}>
                  {getDateLabel()}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={deliveryForm.notes}
                onChangeText={(text) => updateFormField('notes', text)}
                placeholder="Additional delivery information..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleUpdateDelivery}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.datePickerOverlay} 
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <View style={styles.datePickerContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Expected Arrival</Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.datePickerList} showsVerticalScrollIndicator={false}>
              {getDateOptions().map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dateOption,
                    deliveryForm.expectedArrival === option.value && styles.dateOptionActive
                  ]}
                  onPress={() => selectDate(option.value)}
                >
                  <Text style={[
                    styles.dateOptionText,
                    deliveryForm.expectedArrival === option.value && styles.dateOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.dateOptionValue}>{option.value}</Text>
                  {deliveryForm.expectedArrival === option.value && (
                    <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  backButton: {
    padding: 4,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  orderInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  statusOptionActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 4,
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
    gap: 8,
  },
  datePickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  datePickerPlaceholder: {
    color: '#9CA3AF',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  datePickerContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  dateOptionActive: {
    backgroundColor: '#EBF5FF',
  },
  dateOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  dateOptionTextActive: {
    color: '#3B82F6',
  },
  dateOptionValue: {
    fontSize: 13,
    color: '#9CA3AF',
    marginRight: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
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

export default VendorDeliveryScreen;
