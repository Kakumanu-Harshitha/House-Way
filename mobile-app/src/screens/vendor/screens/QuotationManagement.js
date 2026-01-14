import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import theme from '../../../styles/theme';
import { quotationsAPI, materialRequestsAPI } from '../../../utils/api';

export default function QuotationManagement({ navigation, route }) {
  const { materialRequest, quotation, mode } = route.params || {};
  
  const [isCreating, setIsCreating] = useState(mode === 'create' || mode === 'update');
  const [isUpdating, setIsUpdating] = useState(mode === 'update');
  const [existingQuotation, setExistingQuotation] = useState(quotation || null);
  const [quotationItems, setQuotationItems] = useState([]);
  const [deliveryDays, setDeliveryDays] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('net_30');
  const [advancePercentage, setAdvancePercentage] = useState('30');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isCreating && materialRequest) {
      if (isUpdating && existingQuotation) {
        // Check if quotation is approved and prevent editing
        if (existingQuotation.status === 'approved') {
          if (Platform.OS === 'web') {
            window.alert('This quotation has been approved and cannot be modified.');
          } else {
            Alert.alert('Quotation Approved', 'This quotation has been approved and cannot be modified.');
          }
          navigation.goBack();
          return;
        }
        
        // Pre-fill from existing quotation
        const items = existingQuotation.items?.map((item, index) => ({
          id: item.materialRequestItem || index,
          materialRequestItem: item.materialRequestItem,
          materialName: item.materialName,
          description: item.description || '',
          quantity: item.quantity.toString(),
          unit: item.unit,
          unitPrice: item.unitPrice.toString(),
          specifications: item.specifications || '',
        })) || [];
        
        setQuotationItems(items);
        setDeliveryDays(existingQuotation.deliveryTerms?.deliveryTime?.toString() || '');
        setDeliveryLocation(existingQuotation.deliveryTerms?.deliveryLocation || '');
        setPaymentMethod(existingQuotation.paymentTerms?.paymentMethod || 'net_30');
        setAdvancePercentage(existingQuotation.paymentTerms?.advancePercentage?.toString() || '30');
      } else {
        // Pre-fill items from material request for new quotation
        const items = materialRequest.materials?.map((material, index) => ({
          id: material._id || index,
          materialRequestItem: material._id,
          materialName: material.name,
          description: material.description || '',
          quantity: material.quantity.toString(),
          unit: material.unit,
          unitPrice: '',
          specifications: material.specifications ? 
            Object.entries(material.specifications)
              .map(([key, value]) => `${key}: ${value}`)
              .join(', ') : '',
        })) || [];
        
        setQuotationItems(items);
        setDeliveryLocation(materialRequest.project?.location?.address || '');
      }
    }
  }, [isCreating, isUpdating, existingQuotation, materialRequest]);

  const handlePriceChange = (index, price) => {
    const updated = [...quotationItems];
    updated[index].unitPrice = price;
    setQuotationItems(updated);
  };

  const calculateItemTotal = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return qty * price;
  };

  const calculateSubtotal = () => {
    return quotationItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    // Can add taxes, delivery charges here if needed
    return subtotal;
  };

  const validateQuotation = () => {
    // Check all prices are filled
    const missingPrices = quotationItems.some(item => !item.unitPrice || parseFloat(item.unitPrice) <= 0);
    if (missingPrices) {
      Alert.alert('Validation Error', 'Please enter unit prices for all materials');
      return false;
    }

    if (!deliveryDays || parseInt(deliveryDays) <= 0) {
      Alert.alert('Validation Error', 'Please enter valid delivery time (days)');
      return false;
    }

    if (!deliveryLocation.trim()) {
      Alert.alert('Validation Error', 'Please enter delivery location');
      return false;
    }

    if (!advancePercentage || parseFloat(advancePercentage) < 0 || parseFloat(advancePercentage) > 100) {
      Alert.alert('Validation Error', 'Please enter valid advance percentage (0-100)');
      return false;
    }

    return true;
  };

  const handleSubmitQuotation = async () => {
    if (!validateQuotation()) return;

    try {
      setSubmitting(true);

      const quotationData = {
        items: quotationItems.map(item => ({
          materialRequestItem: item.materialRequestItem || item.id,
          materialName: item.materialName,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: calculateItemTotal(item), // Add the required totalPrice field
        })),
        deliveryTerms: {
          deliveryTime: parseInt(deliveryDays),
          deliveryLocation: deliveryLocation.trim(),
          deliveryCharges: 0,
        },
        paymentTerms: {
          paymentMethod: paymentMethod,
          advancePercentage: parseFloat(advancePercentage),
          creditDays: paymentMethod === 'net_30' ? 30 : paymentMethod === 'net_60' ? 60 : 0,
        },
        notes: notes.trim() || (isUpdating ? 'Updated quotation prices and terms' : ''),
      };

      let res;
      if (isUpdating && existingQuotation) {
        // Update existing quotation
        console.log('[QuotationManagement] Updating quotation:', existingQuotation._id, quotationData);
        res = await quotationsAPI.updateQuotation(existingQuotation._id, quotationData);
      } else {
        // Create new quotation
        const createData = {
          materialRequestId: materialRequest._id,
          title: `Quotation for ${materialRequest.title}`,
          description: materialRequest.description || '',
          ...quotationData,
          tax: {
            percentage: 0,
            amount: 0,
          },
          discount: {
            percentage: 0,
            amount: 0,
          },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        };
        console.log('[QuotationManagement] Creating quotation:', createData);
        res = await quotationsAPI.createQuotation(createData);
      }
      
      console.log('[QuotationManagement] Response:', res);

      if (res.success) {
        const successMessage = isUpdating 
          ? 'Quotation updated successfully! Continue negotiation with the client?' 
          : 'Quotation created successfully! Would you like to start negotiation with the client?';
        
        console.log('[QuotationManagement] Success:', res.data);
        
        // Get the order ID for navigation - the quotation may be linked to a purchase order
        const orderId = res.data.quotation?.purchaseOrder || res.data.quotation?.materialRequest?.purchaseOrder || materialRequest.purchaseOrder?._id;
        
        if (Platform.OS === 'web') {
          const startNegotiation = window.confirm(successMessage);
          
          if (startNegotiation && orderId) {
            navigation.navigate('NegotiationChat', { 
              orderId: orderId,
              materialRequestId: materialRequest._id,
              userRole: 'vendor'
            });
          } else {
            navigation.goBack();
          }
        } else {
          Alert.alert(
            'Success!',
            successMessage,
            [
              { 
                text: 'Later', 
                onPress: () => navigation.goBack(),
                style: 'cancel'
              },
              { 
                text: isUpdating ? 'Continue Chat' : 'Start Negotiation', 
                onPress: () => {
                  if (orderId) {
                    navigation.navigate('NegotiationChat', { 
                      orderId: orderId,
                      materialRequestId: materialRequest._id,
                      userRole: 'vendor'
                    });
                  } else {
                    // Fallback to old flow if no order ID
                    navigation.goBack();
                  }
                }
              }
            ]
          );
        }
      } else {
        console.log('[QuotationManagement] Failed:', res.message);
        if (Platform.OS === 'web') {
          window.alert(res.message || `Failed to ${isUpdating ? 'update' : 'create'} quotation`);
        } else {
          Alert.alert('Error', res.message || `Failed to ${isUpdating ? 'update' : 'create'} quotation`);
        }
      }
    } catch (error) {
      console.error('[QuotationManagement] Error:', error);
      const errorMsg = error.response?.data?.message || `Failed to ${isUpdating ? 'update' : 'create'} quotation`;
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCreating) {
    return (
      <View style={styles.container}>
        <AppHeader title="Quotation Management" />
        <View style={styles.centeredContainer}>
          <Feather name="file-text" size={64} color={theme.colors.text.muted} />
          <Text style={styles.emptyText}>
            Quotations are created from accepted material requests
          </Text>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>Go to Material Requests</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader 
        title={isUpdating ? "Update Quotation" : "Create Quotation"} 
        onBack={() => navigation.goBack()}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Material Request Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Material Request</Text>
          <Text style={styles.requestTitle}>{materialRequest.title}</Text>
          <Text style={styles.projectText}>Project: {materialRequest.project?.title || 'N/A'}</Text>
          <Text style={styles.dateText}>
            Required by: {materialRequest.requiredBy ? new Date(materialRequest.requiredBy).toLocaleDateString() : 'N/A'}
          </Text>
        </View>

        {/* Quotation Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Materials & Pricing</Text>
          {quotationItems.map((item, index) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.materialName}</Text>
                <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
              </View>
              
              {item.description && (
                <Text style={styles.itemDescription}>{item.description}</Text>
              )}
              
              {item.specifications && (
                <Text style={styles.itemSpecs}>{item.specifications}</Text>
              )}

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Unit Price ($):</Text>
                <TextInput
                  style={styles.priceInput}
                  value={item.unitPrice}
                  onChangeText={(text) => handlePriceChange(index, text)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={theme.colors.text.muted}
                />
              </View>

              {item.unitPrice && parseFloat(item.unitPrice) > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Item Total:</Text>
                  <Text style={styles.totalValue}>${calculateItemTotal(item).toFixed(2)}</Text>
                </View>
              )}
            </View>
          ))}

          {/* Subtotal */}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal:</Text>
            <Text style={styles.subtotalValue}>${calculateSubtotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery Terms */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Terms</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Delivery Time (Days)</Text>
            <TextInput
              style={styles.input}
              value={deliveryDays}
              onChangeText={setDeliveryDays}
              placeholder="e.g., 14"
              keyboardType="number-pad"
              placeholderTextColor={theme.colors.text.muted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Delivery Location</Text>
            <TextInput
              style={styles.input}
              value={deliveryLocation}
              onChangeText={setDeliveryLocation}
              placeholder="Enter delivery address"
              multiline
              placeholderTextColor={theme.colors.text.muted}
            />
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Terms</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.radioGroup}>
              {[
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'net_30', label: 'Net 30 Days' },
                { value: 'net_60', label: 'Net 60 Days' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.radioOption}
                  onPress={() => setPaymentMethod(option.value)}
                >
                  <Feather 
                    name={paymentMethod === option.value ? 'check-circle' : 'circle'} 
                    size={20} 
                    color={paymentMethod === option.value ? theme.colors.primary : theme.colors.text.muted} 
                  />
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Advance Payment (%)</Text>
            <TextInput
              style={styles.input}
              value={advancePercentage}
              onChangeText={setAdvancePercentage}
              placeholder="0-100"
              keyboardType="decimal-pad"
              placeholderTextColor={theme.colors.text.muted}
            />
            {advancePercentage && parseFloat(advancePercentage) > 0 && (
              <Text style={styles.helperText}>
                Advance: ${(calculateTotal() * parseFloat(advancePercentage) / 100).toFixed(2)}
              </Text>
            )}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any special terms, conditions, or notes..."
            multiline
            numberOfLines={4}
            placeholderTextColor={theme.colors.text.muted}
          />
        </View>

        {/* Total Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Total Amount</Text>
          <Text style={styles.summaryAmount}>${calculateTotal().toFixed(2)}</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmitQuotation}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isUpdating ? 'Update Quotation' : 'Create Quotation & Start Negotiation'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  scrollContent: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  projectText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  itemCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
  },
  itemDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  itemSpecs: {
    fontSize: 12,
    color: theme.colors.text.muted,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginRight: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E0E0E0',
  },
  subtotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  subtotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioLabel: {
    fontSize: 16,
    color: theme.colors.text.primary,
    marginLeft: 12,
  },
  summaryCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
