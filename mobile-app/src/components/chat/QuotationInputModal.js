/**
 * QuotationInputModal Component
 * 
 * Modal for submitting or revising quotations
 * Shared by both Admin and Vendor
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const QuotationInputModal = ({
  visible,
  onClose,
  onSubmit,
  order,
  previousQuotation,
  isRevision = false,
  userRole,
}) => {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState('INR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const defaultNote = 'Best price with quality assurance. Delivery included.';

  // Initialize with previous quotation data if revising
  useEffect(() => {
    if (visible) {
      if (previousQuotation) {
        setAmount(previousQuotation.amount?.toString() || '');
        setNote(previousQuotation.note || defaultNote);
        setCurrency(previousQuotation.currency || 'INR');
        if (previousQuotation.items) {
          setItems(previousQuotation.items.map(item => ({
            ...item,
            name: item.name || item.materialName || item.itemName || 'Item',
            unitPrice: item.unitPrice?.toString() || '',
          })));
        }
      } else if (order?.items && order.items.length > 0) {
        // Initialize from order items
        setItems(order.items.map(item => ({
          name: item.name || item.materialName || item.itemName || 'Item',
          quantity: item.quantity || 0,
          unit: item.unit || 'unit',
          unitPrice: item.unitPrice?.toString() || item.estimatedUnitPrice?.toString() || '',
        })));
        setNote(defaultNote);
        // Calculate initial amount from unit prices
        const total = order.items.reduce((sum, item) => {
          const price = parseFloat(item.unitPrice) || parseFloat(item.estimatedUnitPrice) || 0;
          const qty = item.quantity || 0;
          return sum + (price * qty);
        }, 0);
        setAmount(total > 0 ? total.toString() : '');
      } else {
        // If no items, still set default note
        setNote(defaultNote);
        setItems([]);
        setAmount('');
      }
    }
  }, [visible, previousQuotation, order]);
  
  // Recalculate total when items change
  useEffect(() => {
    if (items.length > 0) {
      const total = items.reduce((sum, item) => {
        const price = parseFloat(item.unitPrice) || 0;
        return sum + (price * (item.quantity || 0));
      }, 0);
      setAmount(total.toString());
    }
  }, [items]);
  
  const handleItemPriceChange = (index, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], unitPrice: value };
    setItems(newItems);
  };
  
  const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    if (currency === 'INR') {
      return `₹${num.toLocaleString('en-IN')}`;
    }
    return `${currency} ${num.toLocaleString()}`;
  };
  
  const handleSubmit = async () => {
    // Validation
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const finalNote = note.trim() || defaultNote;
      
      const quotationData = {
        amount: amountNum,
        currency,
        note: finalNote,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice) || 0,
          total: (parseFloat(item.unitPrice) || 0) * item.quantity,
        })),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        inResponseTo: previousQuotation?._id,
      };
      
      await onSubmit(quotationData);
      
      // Reset form
      setAmount('');
      setNote('');
      setItems([]);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit quotation');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                {isRevision ? 'Revise Quotation' : 'Submit Quotation'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {order?.title || 'Order Quotation'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Previous Amount Reference */}
            {previousQuotation && (
              <View style={styles.previousSection}>
                <Text style={styles.previousLabel}>Previous Quotation</Text>
                <Text style={styles.previousAmount}>
                  {formatCurrency(previousQuotation.amount)}
                </Text>
              </View>
            )}
            
            {/* Items Section */}
            {items.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>Items</Text>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemQuantity}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <View style={styles.itemPriceInput}>
                      <Text style={styles.currencyPrefix}>
                        {currency === 'INR' ? '₹' : currency}
                      </Text>
                      <TextInput
                        style={styles.priceInput}
                        value={item.unitPrice}
                        onChangeText={(value) => handleItemPriceChange(index, value)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.perUnit}>/ {item.unit}</Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency((parseFloat(item.unitPrice) || 0) * item.quantity)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Total Amount */}
            <View style={styles.amountSection}>
              <Text style={styles.sectionTitle}>Total Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>
                  {currency === 'INR' ? '₹' : currency}
                </Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.currencySelector}>
                {['INR', 'USD', 'EUR'].map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.currencyOption,
                      currency === curr && styles.currencyOptionActive,
                    ]}
                    onPress={() => setCurrency(curr)}
                  >
                    <Text style={[
                      styles.currencyOptionText,
                      currency === curr && styles.currencyOptionTextActive,
                    ]}>
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Note */}
            <View style={styles.noteSection}>
              <Text style={styles.sectionTitle}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Add details about this quotation, delivery terms, conditions, etc."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            {/* Validity */}
            <View style={styles.validitySection}>
              <MaterialIcons name="event" size={16} color="#6B7280" />
              <Text style={styles.validityText}>
                Quotation valid for 7 days
              </Text>
            </View>
          </ScrollView>
          
          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Text style={styles.submitButtonText}>Submitting...</Text>
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {isRevision ? 'Submit Revised' : 'Submit Quotation'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
    maxHeight: 500,
  },
  previousSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  previousLabel: {
    fontSize: 11,
    color: '#92400E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previousAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsSection: {
    marginBottom: 20,
  },
  itemRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemPriceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  currencyPrefix: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    padding: 0,
  },
  perUnit: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'right',
    marginTop: 6,
  },
  amountSection: {
    marginBottom: 20,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    padding: 0,
  },
  currencySelector: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  currencyOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  currencyOptionActive: {
    backgroundColor: '#3B82F6',
  },
  currencyOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  currencyOptionTextActive: {
    color: '#FFFFFF',
  },
  noteSection: {
    marginBottom: 20,
  },
  noteInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
  },
  validitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  validityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default QuotationInputModal;
