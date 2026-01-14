/**
 * DeliveryCard Component
 * 
 * Unified delivery tracking card used by both Admin and Vendor screens.
 * Displays order info, delivery status, tracking details, and expected dates.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Shared delivery status configurations
export const DELIVERY_STATUSES = {
  not_started: { value: 'not_started', label: 'Not Started', icon: 'clipboard-outline', color: '#9CA3AF' },
  preparing: { value: 'preparing', label: 'Preparing', icon: 'hammer-outline', color: '#3B82F6' },
  packed: { value: 'packed', label: 'Packed', icon: 'cube-outline', color: '#6366F1' },
  dispatched: { value: 'dispatched', label: 'Dispatched', icon: 'rocket-outline', color: '#F59E0B' },
  in_transit: { value: 'in_transit', label: 'In Transit', icon: 'car-outline', color: '#8B5CF6' },
  out_for_delivery: { value: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle-outline', color: '#7C3AED' },
  delivered: { value: 'delivered', label: 'Delivered', icon: 'checkmark-circle', color: '#10B981' },
  partially_delivered: { value: 'partially_delivered', label: 'Partially Delivered', icon: 'alert-circle-outline', color: '#F97316' },
};

export const getStatusConfig = (status) => {
  return DELIVERY_STATUSES[status] || DELIVERY_STATUSES.not_started;
};

const DeliveryCard = ({ 
  order, 
  onPress, 
  showVendor = false,
  showAmount = false,
  showActionIcon = true,
  disabled = false,
}) => {
  const statusConfig = getStatusConfig(order.deliveryTracking?.status || 'not_started');
  const isDelivered = order.deliveryTracking?.status === 'delivered';

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, isDelivered && styles.cardDelivered]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderNumber}>{order.purchaseOrderNumber}</Text>
          <Text style={styles.orderTitle} numberOfLines={2}>{order.title}</Text>
          
          {showVendor && order.vendor && (
            <Text style={styles.vendorName}>
              🏢 {order.vendor.vendorDetails?.companyName || 
                  `${order.vendor.firstName} ${order.vendor.lastName}`}
            </Text>
          )}
          
          {order.project && (
            <Text style={styles.projectName}>📦 {order.project.title}</Text>
          )}
        </View>

        {showAmount && (
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amount}>
              ₹{(order.finalAmount || order.negotiation?.finalAmount || 0).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Status Section */}
      <View style={styles.statusRow}>
        <Ionicons name={statusConfig.icon} size={24} color={statusConfig.color} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.statusLabel}>Delivery Status</Text>
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>

        {/* Expected/Delivered Date */}
        {!isDelivered && order.deliveryTracking?.expectedArrival && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Expected</Text>
            <Text style={styles.dateValue}>
              {formatDate(order.deliveryTracking.expectedArrival)}
            </Text>
          </View>
        )}
        {isDelivered && order.deliveryTracking?.actualArrival && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Delivered</Text>
            <Text style={[styles.dateValue, { color: '#10B981' }]}>
              {formatDate(order.deliveryTracking.actualArrival)}
            </Text>
          </View>
        )}

        {showActionIcon && (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={{ marginLeft: 8 }} />
        )}
      </View>

      {/* Tracking Info */}
      {order.deliveryTracking?.trackingNumber && (
        <View style={styles.trackingRow}>
          <Ionicons name="barcode-outline" size={16} color="#6B7280" />
          <Text style={styles.trackingText} numberOfLines={1}>
            {order.deliveryTracking.trackingNumber}
          </Text>
          {order.deliveryTracking.carrier && (
            <>
              <Text style={styles.trackingDivider}>•</Text>
              <Text style={styles.trackingText}>{order.deliveryTracking.carrier}</Text>
            </>
          )}
        </View>
      )}

      {/* Latest Update */}
      {order.deliveryTracking?.updates && order.deliveryTracking.updates.length > 0 && (
        <View style={styles.latestUpdate}>
          <Text style={styles.latestUpdateLabel}>Latest Update:</Text>
          <Text style={styles.latestUpdateText} numberOfLines={2}>
            {order.deliveryTracking.updates[order.deliveryTracking.updates.length - 1]?.notes || 'Status updated'}
          </Text>
          <Text style={styles.latestUpdateTime}>
            {new Date(
              order.deliveryTracking.updates[order.deliveryTracking.updates.length - 1]?.updatedAt || 
              order.deliveryTracking.updates[order.deliveryTracking.updates.length - 1]?.timestamp || 
              new Date()
            ).toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  cardDelivered: {
    borderLeftColor: '#10B981',
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 4,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  projectName: {
    fontSize: 13,
    color: '#6B7280',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
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
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  trackingText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  trackingDivider: {
    fontSize: 13,
    color: '#D1D5DB',
    marginHorizontal: 6,
  },
  latestUpdate: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    marginHorizontal: -16,
    marginBottom: -16,
    padding: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  latestUpdateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  latestUpdateText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  latestUpdateTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
});

export default DeliveryCard;
