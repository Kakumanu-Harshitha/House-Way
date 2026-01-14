/**
 * DeliveryStatusNode Component
 * 
 * Displays delivery status and details in the chat.
 * Shows timeline for both Admin and Vendor.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const DeliveryStatusNode = ({ 
  message,
  deliveryDetails,
  isOwnMessage,
  userRole,
  onTrackDelivery,
}) => {
  const status = deliveryDetails?.status || message?.delivery?.status || 'preparing';
  const expectedDate = deliveryDetails?.expectedDeliveryDate || message?.delivery?.expectedDeliveryDate;
  
  const getStatusConfig = (status) => {
    switch (status) {
      case 'preparing':
        return { 
          color: '#F59E0B', 
          bgColor: '#FEF3C7', 
          icon: 'inventory', 
          label: 'Preparing Order',
          description: 'Vendor is preparing your order'
        };
      case 'packed':
        return { 
          color: '#8B5CF6', 
          bgColor: '#EDE9FE', 
          icon: 'inventory-2', 
          label: 'Packed',
          description: 'Order has been packed'
        };
      case 'dispatched':
        return { 
          color: '#3B82F6', 
          bgColor: '#DBEAFE', 
          icon: 'local-shipping', 
          label: 'Dispatched',
          description: 'Order is on its way'
        };
      case 'in_transit':
        return { 
          color: '#0EA5E9', 
          bgColor: '#E0F2FE', 
          icon: 'airport-shuttle', 
          label: 'In Transit',
          description: 'Order is being delivered'
        };
      case 'delivered':
        return { 
          color: '#10B981', 
          bgColor: '#D1FAE5', 
          icon: 'check-circle', 
          label: 'Delivered',
          description: 'Order has been delivered'
        };
      default:
        return { 
          color: '#6B7280', 
          bgColor: '#F3F4F6', 
          icon: 'help-outline', 
          label: status,
          description: ''
        };
    }
  };
  
  const statusConfig = getStatusConfig(status);
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };
  
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Define delivery stages
  const stages = ['preparing', 'packed', 'dispatched', 'in_transit', 'delivered'];
  const currentStageIndex = stages.indexOf(status);

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownContainer : styles.otherContainer
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <MaterialIcons name={statusConfig.icon} size={18} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>
      
      {/* Progress Timeline */}
      <View style={styles.timeline}>
        {stages.map((stage, index) => {
          const isCompleted = index <= currentStageIndex;
          const isCurrent = index === currentStageIndex;
          const stageConfig = getStatusConfig(stage);
          
          return (
            <View key={stage} style={styles.timelineItem}>
              <View style={[
                styles.timelineDot,
                isCompleted && { backgroundColor: stageConfig.color },
                !isCompleted && styles.timelineDotInactive,
              ]}>
                {isCompleted && (
                  <MaterialIcons 
                    name={isCurrent ? stageConfig.icon : 'check'} 
                    size={12} 
                    color="#FFF" 
                  />
                )}
              </View>
              {index < stages.length - 1 && (
                <View style={[
                  styles.timelineLine,
                  isCompleted && index < currentStageIndex && { backgroundColor: '#10B981' },
                ]} />
              )}
              <Text style={[
                styles.timelineLabel,
                isCurrent && styles.timelineLabelActive,
              ]}>
                {stageConfig.label.split(' ')[0]}
              </Text>
            </View>
          );
        })}
      </View>
      
      {/* Expected Delivery */}
      {expectedDate && (
        <View style={styles.deliveryInfo}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.deliveryInfoText}>
            Expected: {formatDate(expectedDate)}
          </Text>
        </View>
      )}
      
      {/* Notes */}
      {(deliveryDetails?.notes || message?.delivery?.notes) && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>
            {deliveryDetails?.notes || message?.delivery?.notes}
          </Text>
        </View>
      )}
      
      {/* Track Button */}
      {onTrackDelivery && (
        <TouchableOpacity 
          style={styles.trackButton}
          onPress={onTrackDelivery}
        >
          <MaterialIcons name="my-location" size={16} color="#3B82F6" />
          <Text style={styles.trackButtonText}>Track Delivery</Text>
        </TouchableOpacity>
      )}
      
      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {formatTime(message?.createdAt)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    marginVertical: 6,
    marginHorizontal: 12,
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    borderColor: '#E0E7FF',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotInactive: {
    backgroundColor: '#E5E7EB',
  },
  timelineLine: {
    position: 'absolute',
    top: 11,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },
  timelineLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  deliveryInfoText: {
    fontSize: 13,
    color: '#4B5563',
  },
  notesSection: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#374151',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    marginTop: 4,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
});

export default DeliveryStatusNode;
