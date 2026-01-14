/**
 * InvoiceNode Component
 * 
 * A chat message component for displaying auto-generated invoices.
 * Visible to both Admin and Vendor in the chat.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const InvoiceNode = ({
  message,
  invoice,
  isOwnMessage,
  userRole,
  onViewInvoice,
  onDownloadInvoice,
}) => {
  // Status configuration
  const getStatusConfig = () => {
    switch (invoice.status) {
      case 'pending':
        return { color: '#F59E0B', bgColor: '#FEF3C7', icon: 'schedule', text: 'Pending Payment' };
      case 'approved':
        return { color: '#3B82F6', bgColor: '#DBEAFE', icon: 'verified', text: 'Approved' };
      case 'paid':
        return { color: '#10B981', bgColor: '#D1FAE5', icon: 'check-circle', text: 'Paid' };
      case 'partially_paid':
        return { color: '#6366F1', bgColor: '#EEF2FF', icon: 'timelapse', text: 'Partially Paid' };
      case 'overdue':
        return { color: '#EF4444', bgColor: '#FEE2E2', icon: 'warning', text: 'Overdue' };
      case 'cancelled':
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'cancel', text: 'Cancelled' };
      default:
        return { color: '#6B7280', bgColor: '#F3F4F6', icon: 'receipt', text: 'Invoice' };
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
  
  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownContainer : styles.otherContainer,
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.invoiceIconContainer}>
            <MaterialCommunityIcons 
              name="file-document-check" 
              size={24} 
              color="#10B981" 
            />
          </View>
          <View>
            <Text style={styles.headerTitle}>Invoice Generated</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          </View>
        </View>
      </View>
      
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
        <MaterialIcons name={statusConfig.icon} size={16} color={statusConfig.color} />
        <Text style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
      </View>
      
      {/* Amount */}
      <View style={styles.amountSection}>
        <Text style={styles.amountLabel}>Invoice Amount</Text>
        <Text style={styles.amountValue}>
          {formatCurrency(invoice.amount, invoice.currency)}
        </Text>
      </View>
      
      {/* Due Date */}
      {invoice.dueDate && (
        <View style={styles.dueDateSection}>
          <MaterialIcons name="event" size={14} color="#6B7280" />
          <Text style={styles.dueDateText}>
            Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}
      
      {/* Actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => onViewInvoice && onViewInvoice(invoice)}
        >
          <MaterialIcons name="visibility" size={16} color="#3B82F6" />
          <Text style={styles.viewButtonText}>View Invoice</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={() => onDownloadInvoice && onDownloadInvoice(invoice)}
        >
          <MaterialIcons name="download" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      {/* Timestamp */}
      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {new Date(message.createdAt).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {isOwnMessage && (
          <MaterialIcons name="done-all" size={14} color="#10B981" />
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
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  ownContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  otherContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#047857',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  amountLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: -0.5,
  },
  dueDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#D1FAE5',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  downloadButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  timestamp: {
    fontSize: 10,
    color: '#6B7280',
  },
});

export default InvoiceNode;
