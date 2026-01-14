/**
 * QuotationNode Component
 * 
 * A visually distinct chat message component for displaying quotations.
 * Supports different states: pending, negotiated, accepted, rejected
 * Shows action buttons based on user role and quotation status.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const QuotationNode = ({
  message,
  quotation,
  isOwnMessage,
  userRole,
  isProcessing = false,
  onAccept,
  onNegotiate,
  onReject,
  onViewDetails,
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAdminRole = userRole === 'owner' || userRole === 'employee';
  const isVendor = userRole === 'vendor';
  
  // Determine if user can act on this quotation
  const canAccept = quotation.status === 'pending' && !isOwnMessage && isAdminRole;
  const canNegotiate = quotation.status === 'pending' && isVendor;
  const canReject = quotation.status === 'pending' && !isOwnMessage && isAdminRole;
  
  // Status badge configuration
  const getStatusConfig = () => {
    switch (quotation.status) {
      case 'pending':
        return { color: '#F59E0B', bgColor: '#FEF3C7', icon: 'schedule', text: 'Pending' };
      case 'negotiated':
        return { color: '#6366F1', bgColor: '#EEF2FF', icon: 'swap-horiz', text: 'Revised' };
      case 'accepted':
        return { color: '#10B981', bgColor: '#D1FAE5', icon: 'check-circle', text: 'Accepted' };
      case 'rejected':
        return { color: '#EF4444', bgColor: '#FEE2E2', icon: 'cancel', text: 'Rejected' };
      case 'expired':
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'history', text: 'Expired' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'help', text: 'Unknown' };
    }
  };
  
  const statusConfig = getStatusConfig();
  
  // Format currency
  const formatCurrency = (amount, currency = 'INR') => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };
  
  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };
  
  // Handle accept - direct call without confirmation dialog
  const handleAccept = () => {
    console.log('=== ACCEPT CLICKED - DIRECT CALL ===');
    console.log('Message ID:', message._id);
    console.log('Quotation:', quotation);
    
    if (!onAccept) {
      console.error('onAccept is undefined!');
      return;
    }
    
    // Directly call onAccept without Alert confirmation
    onAccept(message._id, quotation);
  };
  
  // Handle reject with confirmation
  const handleReject = () => {
    Alert.alert(
      'Reject Quotation',
      'Are you sure you want to reject this quotation? The vendor will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: () => onReject && onReject(message._id, quotation),
        },
      ],
    );
  };
  
  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownContainer : styles.otherContainer,
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons 
            name="file-document-outline" 
            size={20} 
            color="#4B5563" 
          />
          <Text style={styles.headerTitle}>Quotation</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          <MaterialIcons name={statusConfig.icon} size={14} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>
      
      {/* Amount Display */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amountValue}>
          {formatCurrency(quotation.amount, quotation.currency)}
        </Text>
      </View>
      
      {/* Note */}
      {quotation.note && (
        <View style={styles.noteSection}>
          <Text style={styles.noteText}>{quotation.note}</Text>
        </View>
      )}
      
      {/* Items (Expandable) */}
      {quotation.items && quotation.items.length > 0 && (
        <View style={styles.itemsSection}>
          <TouchableOpacity 
            style={styles.expandHeader}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            <Text style={styles.expandHeaderText}>
              {quotation.items.length} items
            </Text>
            <MaterialIcons 
              name={isExpanded ? 'expand-less' : 'expand-more'} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
          
          {isExpanded && (
            <View style={styles.itemsList}>
              {quotation.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(item.unitPrice || item.total, quotation.currency)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
      
      {/* Valid Until */}
      {quotation.validUntil && quotation.status === 'pending' && (
        <View style={styles.validUntilSection}>
          <MaterialIcons name="event" size={14} color="#9CA3AF" />
          <Text style={styles.validUntilText}>
            Valid until {formatDate(quotation.validUntil)}
          </Text>
        </View>
      )}
      
      {/* Response Reference */}
      {quotation.inResponseTo && (
        <View style={styles.inResponseSection}>
          <MaterialIcons name="reply" size={14} color="#9CA3AF" />
          <Text style={styles.inResponseText}>In response to previous quotation</Text>
        </View>
      )}
      
      {/* Action Buttons */}
      {quotation.status === 'pending' && !disabled && (
        <View style={styles.actionsSection}>
          {canAccept && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton, (disabled || isProcessing) && styles.acceptButtonDisabled]}
              onPress={handleAccept}
              disabled={disabled || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          
          {canNegotiate && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.negotiateButton]}
              onPress={() => onNegotiate && onNegotiate(message._id, quotation)}
            >
              <MaterialIcons name="swap-horiz" size={18} color="#4B5563" />
              <Text style={styles.negotiateButtonText}>
                {isOwnMessage ? 'Revise' : 'Counter Offer'}
              </Text>
            </TouchableOpacity>
          )}
          
          {canReject && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
            >
              <MaterialIcons name="close" size={18} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Timestamp */}
      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {new Date(message.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {isOwnMessage && (
          <MaterialIcons 
            name={quotation.status === 'accepted' ? 'done-all' : 'done'} 
            size={14} 
            color={quotation.status === 'accepted' ? '#10B981' : '#9CA3AF'} 
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '90%',
    marginVertical: 6,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountSection: {
    marginBottom: 10,
  },
  amountLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  noteSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  noteText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  itemsSection: {
    marginBottom: 10,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  expandHeaderText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 11,
    color: '#6B7280',
    marginHorizontal: 8,
  },
  itemPrice: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '600',
  },
  validUntilSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  validUntilText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  inResponseSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  inResponseText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  acceptButtonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  negotiateButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  negotiateButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});

export default QuotationNode;
