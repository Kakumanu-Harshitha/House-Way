/**
 * DeliveryFormNode Component
 * 
 * Shows a delivery details form for vendors to submit after quotation acceptance.
 * Appears inline in the chat interface.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const DeliveryFormNode = ({ 
  order, 
  onSubmit, 
  isSubmitting = false,
  disabled = false 
}) => {
  const [selectedDays, setSelectedDays] = useState(7); // Default 7 days
  const [notes, setNotes] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSubmit = () => {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + selectedDays);
    
    onSubmit({
      expectedDeliveryDate: expectedDate.toISOString(),
      trackingNumber: '', // Will be filled later
      carrier: '', // Will be filled later
      deliveryNotes: notes.trim(), // Match backend field name
      notes: notes.trim(), // Also include for compatibility
    });
  };

  const getExpectedDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + selectedDays);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (disabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="local-shipping" size={24} color="#FFF" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Submit Delivery Details</Text>
            <Text style={styles.headerSubtitle}>Required before proceeding</Text>
          </View>
        </View>
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {/* Expected Delivery Date Selection */}
          <View style={styles.field}>
            <Text style={styles.label}>Expected Delivery Time</Text>
            
            <View style={styles.daysSelector}>
              {[3, 5, 7, 10, 14, 21].map(days => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.dayButton,
                    selectedDays === days && styles.dayButtonActive
                  ]}
                  onPress={() => setSelectedDays(days)}
                >
                  <Text style={[
                    styles.dayButtonText,
                    selectedDays === days && styles.dayButtonTextActive
                  ]}>
                    {days} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.expectedDateDisplay}>
              <MaterialIcons name="event" size={18} color="#10B981" />
              <Text style={styles.expectedDateText}>
                Expected: {getExpectedDate()}
              </Text>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="E.g., Delivery time preference, special instructions..."
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Delivery Details</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.infoText}>
            After submission, you can update delivery status from the Delivery screen.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFFBEB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  content: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  daysSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  dayButtonText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#FFF',
  },
  expectedDateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
  },
  expectedDateText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  infoText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default DeliveryFormNode;
