import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestsAPI } from '../../utils/api';
import theme from '../../styles/theme';
import { StandardCard } from '../../components/StandardCard';

const ServiceRequestsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadServiceRequests();
  }, []);

  const loadServiceRequests = async () => {
    try {
      setIsLoading(true);
      const response = await serviceRequestsAPI.getServiceRequests();
      
      if (response.success) {
        setRequests(response.data.requests);
      } else {
        Alert.alert('Error', response.message || 'Failed to load service requests');
      }
    } catch (error) {
      console.error('Load service requests error:', error);
      Alert.alert('Error', 'Failed to load service requests');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServiceRequests();
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: theme.colors.warning[500],
      assigned: theme.colors.primary[500],
      'in-progress': theme.colors.secondary[600],
      completed: theme.colors.success[500],
      cancelled: theme.colors.error[500],
    };
    return colors[status] || theme.colors.text.secondary;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      assigned: '👤',
      'in-progress': '🔄',
      completed: '✅',
      cancelled: '❌',
    };
    return icons[status] || '📋';
  };

  const getRequestTypeIcon = (type) => {
    const icons = {
      'professional-photography': '📸',
      'photo-editing': '🎨',
      'graphic-design': '🎨',
      'video-production': '🎬',
      'content-creation': '✍️',
      'marketing-materials': '📢',
      other: '📋',
    };
    return icons[type] || '📋';
  };

  const handleCreateRequest = () => {
    navigation.navigate('CreateServiceRequest');
  };

  const handleRequestPress = (request) => {
    navigation.navigate('ServiceRequestDetails', { requestId: request._id });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary[500]} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Service Requests</Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleCreateRequest}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Quick Stats */}
        <StandardCard style={styles.statsCard}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {requests.filter(r => r.status === 'pending').length}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {requests.filter(r => r.status === 'in-progress').length}
              </Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {requests.filter(r => r.status === 'completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </StandardCard>

        {/* Service Types */}
        <StandardCard style={styles.servicesCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Available Services</Text>
          </View>
          <View style={styles.servicesGrid}>
            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('CreateServiceRequest', { type: 'professional-photography' })}
            >
              <Text style={styles.serviceIcon}>📸</Text>
              <Text style={styles.serviceTitle}>Photography</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('CreateServiceRequest', { type: 'graphic-design' })}
            >
              <Text style={styles.serviceIcon}>🎨</Text>
              <Text style={styles.serviceTitle}>Design</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('CreateServiceRequest', { type: 'video-production' })}
            >
              <Text style={styles.serviceIcon}>🎬</Text>
              <Text style={styles.serviceTitle}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('CreateServiceRequest', { type: 'content-creation' })}
            >
              <Text style={styles.serviceIcon}>✍️</Text>
              <Text style={styles.serviceTitle}>Content</Text>
            </TouchableOpacity>
          </View>
        </StandardCard>

        {/* Requests List */}
        <View style={styles.requestsSection}>
          <Text style={styles.sectionTitle}>Your Requests</Text>
          
          {isLoading ? (
            <StandardCard style={styles.loadingCard}>
              <Text style={styles.loadingText}>Loading requests...</Text>
            </StandardCard>
          ) : requests.length === 0 ? (
            <StandardCard style={styles.emptyCard}>
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Service Requests</Text>
                <Text style={styles.emptyDescription}>
                  You haven't made any service requests yet. Tap the + button to create your first request.
                </Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateRequest}
                >
                  <Text style={styles.createButtonText}>Create Request</Text>
                </TouchableOpacity>
              </View>
            </StandardCard>
          ) : (
            requests.map((request) => (
              <TouchableOpacity
                key={request._id}
                style={styles.requestCard}
                onPress={() => handleRequestPress(request)}
              >
                <View style={styles.requestHeader}>
                  <View style={styles.requestType}>
                    <Text style={styles.requestTypeIcon}>
                      {getRequestTypeIcon(request.requestType)}
                    </Text>
                    <Text style={styles.requestTypeText}>
                      {request.requestType.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.statusIcon}>{getStatusIcon(request.status)}</Text>
                    <Text style={styles.statusText}>
                      {request.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.requestTitle} numberOfLines={2}>
                  {request.title}
                </Text>
                
                <Text style={styles.requestDescription} numberOfLines={2}>
                  {request.description}
                </Text>
                
                <View style={styles.requestFooter}>
                  <Text style={styles.requestDate}>
                    Created: {formatDate(request.createdAt)}
                  </Text>
                  {request.assignedVendor && (
                    <Text style={styles.vendorInfo}>
                      Vendor: {request.assignedVendor.firstName} {request.assignedVendor.lastName}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  
  // Header
  header: {
    backgroundColor: theme.colors.primary[500],
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: theme.colors.text.white,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.white,
    letterSpacing: -0.5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: theme.colors.text.white,
    fontWeight: 'bold',
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },

  // Stats Card
  statsCard: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border.light,
    marginHorizontal: 15,
  },

  // Services Card
  servicesCard: {
    marginBottom: 20,
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  serviceItem: {
    width: '22%',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: theme.colors.background.tertiary,
  },
  serviceIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },

  // Requests Section
  requestsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
  },

  // Loading & Empty States
  loadingCard: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.white,
  },

  // Request Cards
  requestCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    ...theme.shadows.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestTypeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  requestTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.text.white,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  requestDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  requestFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingTop: 12,
  },
  requestDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  vendorInfo: {
    fontSize: 12,
    color: theme.colors.primary[600],
    fontWeight: '500',
  },
});

export default ServiceRequestsScreen;
