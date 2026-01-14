/**
 * CreateServiceRequestScreen
 * 
 * Screen for creating new service requests (professional photography, design, etc.)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestsAPI } from '../../utils/api';
import theme from '../../styles/theme';

const SERVICE_TYPES = [
  { id: 'professional-photography', label: 'Professional Photography', icon: '📷' },
  { id: 'interior-design', label: 'Interior Design', icon: '🏠' },
  { id: 'architectural-consultation', label: 'Architectural Consultation', icon: '🏗️' },
  { id: 'home-staging', label: 'Home Staging', icon: '🪑' },
  { id: 'content-creation', label: 'Content Creation', icon: '✍️' },
  { id: 'marketing-materials', label: 'Marketing Materials', icon: '📢' },
  { id: 'other', label: 'Other Services', icon: '📋' },
];

const PRIORITY_OPTIONS = [
  { id: 'low', label: 'Low', color: '#22C55E' },
  { id: 'medium', label: 'Medium', color: '#F59E0B' },
  { id: 'high', label: 'High', color: '#EF4444' },
];

const CreateServiceRequestScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    requestType: '',
    title: '',
    description: '',
    priority: 'medium',
    specifications: '',
    deliverables: '',
    additionalNotes: '',
  });

  const handleSubmit = async () => {
    // Validate form
    if (!formData.requestType) {
      Alert.alert('Error', 'Please select a service type');
      return;
    }
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your request');
      return;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Please provide a description of your request');
      return;
    }

    try {
      setIsLoading(true);

      const requestData = {
        requestType: formData.requestType,
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        requirements: {
          specifications: formData.specifications.split('\n').filter(s => s.trim()),
          deliverables: formData.deliverables.split('\n').filter(s => s.trim()),
          additionalNotes: formData.additionalNotes.trim(),
        },
        timeline: {
          expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      };

      const response = await serviceRequestsAPI.createServiceRequest(requestData);

      if (response.success) {
        Alert.alert(
          'Request Submitted!',
          'Your service request has been submitted successfully. Our team will review it and get back to you shortly.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Submit request error:', error);
      Alert.alert('Error', 'Failed to submit service request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Service Request</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Service Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Type *</Text>
          <View style={styles.typeGrid}>
            {SERVICE_TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  formData.requestType === type.id && styles.typeCardSelected,
                ]}
                onPress={() => setFormData({ ...formData, requestType: type.id })}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.typeLabel,
                    formData.requestType === type.id && styles.typeLabelSelected,
                  ]}
                  numberOfLines={2}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Title *</Text>
          <TextInput
            style={styles.input}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
            placeholder="e.g., Professional Photos for Marketing"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe what you need in detail..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.priorityButton,
                  formData.priority === option.id && {
                    backgroundColor: option.color,
                    borderColor: option.color,
                  },
                ]}
                onPress={() => setFormData({ ...formData, priority: option.id })}
              >
                <Text
                  style={[
                    styles.priorityText,
                    formData.priority === option.id && styles.priorityTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications (one per line)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.specifications}
            onChangeText={(text) => setFormData({ ...formData, specifications: text })}
            placeholder="Enter specific requirements..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.additionalNotes}
            onChangeText={(text) => setFormData({ ...formData, additionalNotes: text })}
            placeholder="Any other information..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  typeCardSelected: {
    borderColor: theme.colors.primary[500],
    backgroundColor: theme.colors.primary[50],
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: theme.colors.primary[700],
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  priorityTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    backgroundColor: theme.colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreateServiceRequestScreen;
