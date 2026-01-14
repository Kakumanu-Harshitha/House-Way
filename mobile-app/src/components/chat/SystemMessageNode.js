/**
 * SystemMessageNode Component
 * 
 * Displays system messages in chat (order sent, quotation accepted, etc.)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const SystemMessageNode = ({ message, systemEvent, onNavigateToDelivery, userRole }) => {
  // Event configuration
  const getEventConfig = () => {
    switch (systemEvent) {
      case 'order_sent':
        return { 
          icon: 'send', 
          color: '#3B82F6', 
          bgColor: '#DBEAFE',
          text: message.content || 'Order sent to vendor',
        };
      case 'order_received':
        return { 
          icon: 'inbox', 
          color: '#10B981', 
          bgColor: '#D1FAE5',
          text: message.content || 'Order received',
        };
      case 'quotation_submitted':
        return { 
          icon: 'description', 
          color: '#8B5CF6', 
          bgColor: '#EDE9FE',
          text: message.content || 'Quotation submitted',
        };
      case 'quotation_accepted':
        return { 
          icon: 'check-circle', 
          color: '#10B981', 
          bgColor: '#D1FAE5',
          text: message.content || 'Quotation accepted',
        };
      case 'quotation_rejected':
        return { 
          icon: 'cancel', 
          color: '#EF4444', 
          bgColor: '#FEE2E2',
          text: message.content || 'Quotation rejected',
        };
      case 'invoice_generated':
        return { 
          icon: 'receipt', 
          color: '#059669', 
          bgColor: '#D1FAE5',
          text: message.content || 'Invoice generated',
        };
      case 'payment_received':
        return { 
          icon: 'payments', 
          color: '#10B981', 
          bgColor: '#D1FAE5',
          text: message.content || 'Payment received',
        };
      case 'order_completed':
        return { 
          icon: 'verified', 
          color: '#10B981', 
          bgColor: '#D1FAE5',
          text: message.content || 'Order completed',
        };
      case 'order_cancelled':
        return { 
          icon: 'block', 
          color: '#EF4444', 
          bgColor: '#FEE2E2',
          text: message.content || 'Order cancelled',
        };
      default:
        return { 
          icon: 'info', 
          color: '#6B7280', 
          bgColor: '#F3F4F6',
          text: message.content || 'System update',
        };
    }
  };
  
  const config = getEventConfig();
  
  // Show delivery tracking button after quotation is accepted or invoice generated
  const showDeliveryButton = (systemEvent === 'quotation_accepted' || systemEvent === 'invoice_generated') && onNavigateToDelivery;
  
  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
        <MaterialIcons name={config.icon} size={14} color={config.color} />
        <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
      </View>
      <Text style={styles.timestamp}>
        {new Date(message.createdAt).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        })} • {new Date(message.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        })}
      </Text>
      
      {showDeliveryButton && (
        <TouchableOpacity 
          style={styles.deliveryButton}
          onPress={onNavigateToDelivery}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={userRole === 'vendor' ? 'car-outline' : 'eye-outline'} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.deliveryButtonText}>
            {userRole === 'vendor' ? 'Update Delivery Status' : 'Track Delivery'}
          </Text>
          <Ionicons name="arrow-forward" size={14} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SystemMessageNode;
