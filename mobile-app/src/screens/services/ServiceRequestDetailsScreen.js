/**
 * ServiceRequestDetailsScreen
 * 
 * Screen for viewing details of a service request
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestsAPI } from '../../utils/api';
import theme from '../../styles/theme';

const ServiceRequestDetailsScreen = ({ navigation, route }) => {
  const { requestId } = route?.params || {};
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (requestId) {
      loadRequestDetails();
    }
  }, [requestId]);

  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      const response = await serviceRequestsAPI.getServiceRequests();
      
      if (response.success) {
        const foundRequest = response.data.find(r => r._id === requestId);
        if (foundRequest) {
          setRequest(foundRequest);
        } else {
          Alert.alert('Error', 'Request not found');
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to load request');
      }
    } catch (error) {
      console.error('Load request error:', error);
      Alert.alert('Error', 'Failed to load request details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRequestDetails();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#F59E0B',
      'in-review': '#3B82F6',
      'vendor-assigned': '#8B5CF6',
      'in-progress': '#10B981',
      completed: '#22C55E',
      cancelled: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending Review',
      'in-review': 'Under Review',
      'vendor-assigned': 'Vendor Assigned',
      'in-progress': 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#22C55E',
      medium: '#F59E0B',
      high: '#EF4444',
    };
    return colors[priority] || '#6B7280';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Request not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
          </View>
          <View style={[styles.priorityBadge, { borderColor: getPriorityColor(request.priority) }]}>
            <Text style={[styles.priorityText, { color: getPriorityColor(request.priority) }]}>
              {request.priority?.toUpperCase()} PRIORITY
            </Text>
          </View>
        </View>

        {/* Title & Type */}
        <View style={styles.card}>
          <Text style={styles.requestTitle}>{request.title}</Text>
          <Text style={styles.requestType}>{request.requestType?.replace(/-/g, ' ')}</Text>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.description}>{request.description}</Text>
        </View>

        {/* Requirements */}
        {request.requirements && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Requirements</Text>
            
            {request.requirements.specifications?.length > 0 && (
              <View style={styles.requirementSection}>
                <Text style={styles.requirementLabel}>Specifications:</Text>
                {request.requirements.specifications.map((spec, index) => (
                  <View key={index} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{spec}</Text>
                  </View>
                ))}
              </View>
            )}

            {request.requirements.deliverables?.length > 0 && (
              <View style={styles.requirementSection}>
                <Text style={styles.requirementLabel}>Deliverables:</Text>
                {request.requirements.deliverables.map((item, index) => (
                  <View key={index} style={styles.bulletItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {request.requirements.additionalNotes && (
              <View style={styles.requirementSection}>
                <Text style={styles.requirementLabel}>Additional Notes:</Text>
                <Text style={styles.notesText}>{request.requirements.additionalNotes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          <View style={styles.timelineRow}>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Submitted</Text>
              <Text style={styles.timelineValue}>{formatDate(request.createdAt)}</Text>
            </View>
            <View style={styles.timelineItem}>
              <Text style={styles.timelineLabel}>Expected Delivery</Text>
              <Text style={styles.timelineValue}>
                {formatDate(request.timeline?.expectedDelivery)}
              </Text>
            </View>
          </View>
        </View>

        {/* Vendor Info (if assigned) */}
        {request.assignedVendor && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Assigned Vendor</Text>
            <View style={styles.vendorInfo}>
              <View style={styles.vendorAvatar}>
                <Text style={styles.vendorInitial}>
                  {request.assignedVendor.firstName?.[0] || 'V'}
                </Text>
              </View>
              <View>
                <Text style={styles.vendorName}>
                  {request.assignedVendor.firstName} {request.assignedVendor.lastName}
                </Text>
                <Text style={styles.vendorEmail}>{request.assignedVendor.email}</Text>
              </View>
            </View>
          </View>
        )}

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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  requestType: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  requirementSection: {
    marginTop: 12,
  },
  requirementLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    paddingLeft: 8,
    marginTop: 4,
  },
  bullet: {
    color: theme.colors.primary[500],
    marginRight: 8,
    fontSize: 14,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineItem: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  vendorInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary[600],
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  vendorEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default ServiceRequestDetailsScreen;
