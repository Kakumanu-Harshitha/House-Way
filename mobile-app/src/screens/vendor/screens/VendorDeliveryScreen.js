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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersAPI } from '../../../utils/api';

const DELIVERY_STATUSES = [
  { value: 'not_started', label: 'Not Started', icon: 'clipboard-outline', color: '#9CA3AF' },
  { value: 'preparing', label: 'Preparing', icon: 'hammer-outline', color: '#3B82F6' },
  { value: 'packed', label: 'Packed', icon: 'cube-outline', color: '#6366F1' },
  { value: 'dispatched', label: 'Dispatched', icon: 'rocket-outline', color: '#F59E0B' },
  { value: 'in_transit', label: 'In Transit', icon: 'car-outline', color: '#8B5CF6' },
  { value: 'out_for_delivery', label: 'Out for Delivery', icon: 'car-outline', color: '#7C3AED' },
  { value: 'delivered', label: 'Delivered', icon: 'checkmark-circle', color: '#10B981' },
  { value: 'partially_delivered', label: 'Partially Delivered', icon: 'alert-circle-outline', color: '#F97316' },
];

const VendorDeliveryScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
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
      const response = await purchaseOrdersAPI.getMyOrders({ status: 'in_progress' });
      // Also include 'accepted' orders that haven't moved to in_progress yet
      let ordersList = [];
      if (response.success) {
        ordersList = response.data?.purchaseOrders || [];
        const acceptedRes = await purchaseOrdersAPI.getMyOrders({ status: 'accepted' });
        if (acceptedRes.success) {
          const accepted = acceptedRes.data?.purchaseOrders || [];
          ordersList = [...ordersList, ...accepted];
        }
      }
      setOrders(ordersList);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
      expectedArrival: (order.deliveryTracking?.expectedDeliveryDate || order.deliveryTracking?.expectedArrival)
        ? new Date(order.deliveryTracking.expectedDeliveryDate || order.deliveryTracking.expectedArrival).toISOString().split('T')[0]
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

    try {
      setSubmitting(true);
      const response = await purchaseOrdersAPI.updateDeliveryStatus(
        selectedOrder._id,
        deliveryForm
      );

      if (response.success) {
        Alert.alert('Success', 'Delivery status updated successfully');
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

  const getStatusConfig = (status) => {
    return DELIVERY_STATUSES.find(s => s.value === status) || DELIVERY_STATUSES[0];
  };

  const renderOrderItem = ({ item: order }) => {
    const statusConfig = getStatusConfig(order.deliveryTracking?.status || 'not_started');

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => openDeliveryModal(order)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>{order.purchaseOrderNumber}</Text>
            <Text style={styles.orderTitle}>{order.title}</Text>
            {order.project && (
              <Text style={styles.projectName}>📦 {order.project.title}</Text>
            )}
          </View>
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Final Amount</Text>
            <Text style={styles.amount}>₹{(order.negotiation?.finalAmount || order.totalAmount || 0).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.deliveryStatus}>
          <Ionicons 
            name={statusConfig.icon} 
            size={24} 
            color={statusConfig.color} 
          />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.statusLabel}>Delivery Status</Text>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>

        {order.deliveryTracking?.trackingNumber && (
          <View style={styles.trackingInfo}>
            <Text style={styles.trackingLabel}>
              Tracking: {order.deliveryTracking.trackingNumber}
            </Text>
            {order.deliveryTracking.carrier && (
              <Text style={styles.trackingLabel}>
                via {order.deliveryTracking.carrier}
              </Text>
            )}
          </View>
        )}

        {(order.deliveryTracking?.expectedDeliveryDate || order.deliveryTracking?.expectedArrival) && (
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.dateText}>
              Expected: {new Date(order.deliveryTracking.expectedDeliveryDate || order.deliveryTracking.expectedArrival).toLocaleDateString()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const DeliveryUpdateModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Delivery Status</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
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
                  onPress={() => setDeliveryForm({ ...deliveryForm, status: status.value })}
                >
                  <Ionicons
                    name={status.icon}
                    size={20}
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
              onChangeText={(text) => setDeliveryForm({ ...deliveryForm, trackingNumber: text })}
              placeholder="TRK123456789"
            />

            <Text style={styles.inputLabel}>Carrier</Text>
            <TextInput
              style={styles.input}
              value={deliveryForm.carrier}
              onChangeText={(text) => setDeliveryForm({ ...deliveryForm, carrier: text })}
              placeholder="Blue Dart, Delhivery, etc."
            />

            <Text style={styles.inputLabel}>Expected Arrival (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={deliveryForm.expectedArrival}
              onChangeText={(text) => setDeliveryForm({ ...deliveryForm, expectedArrival: text })}
              placeholder="2025-01-25"
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={deliveryForm.notes}
              onChangeText={(text) => setDeliveryForm({ ...deliveryForm, notes: text })}
              placeholder="Additional delivery information..."
              multiline
              numberOfLines={3}
            />
          </View>

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
      </View>
    </Modal>
  );

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
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Delivery Tracking</Text>
          <Text style={styles.headerSubtitle}>{orders.length} active order{orders.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#3B82F6" />
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
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      <DeliveryUpdateModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  backButton: {
    padding: 4,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
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
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 13,
    color: '#6B7280',
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  deliveryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  trackingInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  trackingLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
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
    paddingHorizontal: 12,
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
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },
  statusOptionTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
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
});

export default VendorDeliveryScreen;
