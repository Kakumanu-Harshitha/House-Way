/**
 * VendorOrdersScreen
 * 
 * Lists all orders assigned to the vendor.
 * Vendor can only access chat/negotiation if an order is assigned to them.
 * Tracks viewed orders to show "NEW" badge correctly.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import socket from '../../utils/socket';

const VIEWED_ORDERS_KEY = '@vendor_viewed_orders';

const VendorOrdersScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [viewedOrders, setViewedOrders] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Get vendor ID from auth context
  const currentVendorId = user?._id;
  
  // Filter options - removed 'partially_delivered' as it's handled in Delivery screen
  const filters = [
    { id: 'all', label: 'All Orders', icon: 'list' },
    { id: 'sent', label: 'New', icon: 'fiber-new' },
    { id: 'in_negotiation', label: 'Negotiating', icon: 'swap-horiz' },
    { id: 'accepted', label: 'Accepted', icon: 'check-circle' },
    { id: 'completed', label: 'Completed', icon: 'verified' },
  ];
  
  // Load viewed orders from storage
  const loadViewedOrders = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(VIEWED_ORDERS_KEY);
      if (stored) {
        setViewedOrders(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading viewed orders:', error);
    }
  }, []);
  
  // Mark order as viewed
  const markOrderAsViewed = useCallback(async (orderId) => {
    try {
      const newViewedOrders = new Set(viewedOrders);
      newViewedOrders.add(orderId);
      setViewedOrders(newViewedOrders);
      await AsyncStorage.setItem(VIEWED_ORDERS_KEY, JSON.stringify([...newViewedOrders]));
    } catch (error) {
      console.error('Error saving viewed order:', error);
    }
  }, [viewedOrders]);
  
  // Load orders
  const loadOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      // Backend will filter orders based on authenticated user's role
      const response = await purchaseOrdersAPI.getMyOrders();
      
      if (response.success && response.data) {
        // Handle both response formats: array or object with purchaseOrders property
        const ordersData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.purchaseOrders || []);
        // Filter out draft orders on client side
        const nonDraftOrders = ordersData.filter(o => o.status !== 'draft');
        setOrders(nonDraftOrders);
        applyFilter(activeFilter, nonDraftOrders);
      } else {
        Alert.alert('Error', response.message || 'Failed to load orders');
      }
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeFilter]);
  
  // Initial load
  useEffect(() => {
    loadViewedOrders();
    loadOrders();
    
    // Setup socket listener for real-time order updates
    // Join vendor-specific room for real-time updates
    if (currentVendorId) {
      socket.emit('joinRoom', `vendor_${currentVendorId}`);
      console.log('[VendorOrders] Joined room:', `vendor_${currentVendorId}`);
    }
    
    // Listen for order updates from other users (when admin accepts, etc.)
    const handleOrderUpdated = (data) => {
      console.log('[VendorOrders] Order updated:', data);
      // Refresh orders when an order is updated
      loadOrders(false);
    };
    
    const handleQuotationAccepted = (data) => {
      console.log('[VendorOrders] Quotation accepted:', data);
      // Refresh orders when quotation is accepted
      loadOrders(false);
    };
    
    socket.on('orderUpdated', handleOrderUpdated);
    socket.on('quotationAccepted', handleQuotationAccepted);
    
    return () => {
      socket.off('orderUpdated', handleOrderUpdated);
      socket.off('quotationAccepted', handleQuotationAccepted);
    };
  }, [currentVendorId, loadOrders]);
  
  // Reload when screen is focused (to update viewed status)
  useFocusEffect(
    useCallback(() => {
      console.log('[VendorOrders] Screen focused - reloading orders');
      loadViewedOrders();
      loadOrders(false);
    }, [loadOrders])
  );
  
  // Apply filter
  const applyFilter = (filter, data = orders) => {
    setActiveFilter(filter);
    if (filter === 'all') {
      setFilteredOrders(data);
    } else {
      setFilteredOrders(data.filter(order => order.status === filter));
    }
  };
  
  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadOrders(false);
  };
  
  // Navigate to chat and mark as viewed
  const handleOrderPress = (order) => {
    markOrderAsViewed(order._id);
    navigation.navigate('NegotiationChat', {
      orderId: order._id,
      userRole: 'vendor',
    });
  };
  
  // Check if order is new (status 'sent' and not yet viewed)
  const isOrderNew = (order) => {
    return order.status === 'sent' && !viewedOrders.has(order._id);
  };
  
  // Get status configuration
  const getStatusConfig = (status) => {
    const configs = {
      sent: { color: '#FFFFFF', bgColor: '#3B82F6', label: 'New Order', icon: 'fiber-new' },
      in_negotiation: { color: '#FFFFFF', bgColor: '#F59E0B', label: 'Negotiating', icon: 'swap-horiz' },
      accepted: { color: '#FFFFFF', bgColor: '#10B981', label: 'Accepted', icon: 'check-circle' },
      in_progress: { color: '#FFFFFF', bgColor: '#8B5CF6', label: 'In Progress', icon: 'local-shipping' },
      acknowledged: { color: '#FFFFFF', bgColor: '#6366F1', label: 'Acknowledged', icon: 'thumb-up' },
      partially_delivered: { color: '#FFFFFF', bgColor: '#F97316', label: 'Partially Delivered', icon: 'local-shipping' },
      rejected: { color: '#FFFFFF', bgColor: '#EF4444', label: 'Rejected', icon: 'cancel' },
      completed: { color: '#FFFFFF', bgColor: '#059669', label: 'Completed', icon: 'verified' },
      cancelled: { color: '#FFFFFF', bgColor: '#6B7280', label: 'Cancelled', icon: 'block' },
    };
    return configs[status] || { color: '#FFFFFF', bgColor: '#6B7280', label: status, icon: 'help' };
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    }
  };
  
  // Render order card
  const renderOrderCard = ({ item: order }) => {
    const statusConfig = getStatusConfig(order.status);
    const isNew = isOrderNew(order);
    
    return (
      <TouchableOpacity
        style={[styles.orderCard, isNew && styles.orderCardNew]}
        onPress={() => handleOrderPress(order)}
        activeOpacity={0.7}
      >
        {/* New badge */}
        {isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        )}
        
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.orderNumberContainer}>
            <Text style={styles.orderNumber}>{order.purchaseOrderNumber || order.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
              <MaterialIcons name={statusConfig.icon} size={12} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderDate}>{formatDate(order.sentAt || order.createdAt)}</Text>
        </View>
        
        {/* Title */}
        <Text style={styles.orderTitle} numberOfLines={2}>
          {order.title}
        </Text>
        
        {/* Project */}
        <View style={styles.projectRow}>
          <MaterialIcons name="business" size={14} color="#6B7280" />
          <Text style={styles.projectName}>{order.project?.title || 'Unknown Project'}</Text>
        </View>
        
        {/* Materials List */}
        {order.items && order.items.length > 0 && (
          <View style={styles.materialsContainer}>
            <Text style={styles.materialsTitle}>Required Materials:</Text>
            {order.items.slice(0, 3).map((item, index) => (
              <View key={index} style={styles.materialItem}>
                <MaterialCommunityIcons name="circle-small" size={16} color="#6B7280" />
                <Text style={styles.materialText} numberOfLines={1}>
                  {item.materialName || item.name} - {item.quantity} {item.unit}
                </Text>
              </View>
            ))}
            {order.items.length > 3 && (
              <Text style={styles.moreItemsText}>+{order.items.length - 3} more items</Text>
            )}
          </View>
        )}
        
        {/* Items Summary */}
        <View style={styles.itemsSummary}>
          <MaterialCommunityIcons name="package-variant" size={14} color="#6B7280" />
          <Text style={styles.itemsText}>
            {order.items?.length || 0} items total
          </Text>
          {order.items?.reduce((sum, i) => sum + (i.estimatedTotal || 0), 0) > 0 && (
            <Text style={styles.estimatedAmount}>
              Est: ₹{order.items.reduce((sum, i) => sum + (i.estimatedTotal || 0), 0).toLocaleString()}
            </Text>
          )}
        </View>
        
        {/* Final Amount (if accepted) */}
        {order.finalAmount && (
          <View style={styles.finalAmountRow}>
            <MaterialIcons name="check-circle" size={16} color="#10B981" />
            <Text style={styles.finalAmountLabel}>Final Amount:</Text>
            <Text style={styles.finalAmountValue}>
              ₹{order.finalAmount.toLocaleString()}
            </Text>
          </View>
        )}
        
        {/* Action hint */}
        <View style={styles.actionHint}>
          <Text style={styles.actionHintText}>
            {order.status === 'sent' 
              ? 'Tap to submit quotation'
              : order.status === 'in_negotiation'
                ? 'Tap to continue negotiation'
                : order.status === 'accepted'
                  ? 'Tap to view chat or update delivery'
                  : 'Tap to view details'
            }
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" />
        </View>
        
        {/* Delivery prompt for accepted orders */}
        {order.status === 'accepted' && (
          <View style={styles.deliveryPrompt}>
            <MaterialCommunityIcons name="truck-fast" size={18} color="#10B981" />
            <Text style={styles.deliveryPromptText}>
              Ready for delivery tracking
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Order Requests</Text>
            <Text style={styles.headerSubtitle}>
              {orders.length} order{orders.length !== 1 ? 's' : ''} assigned to you
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deliveryButton}
            onPress={() => navigation.navigate('VendorDelivery')}
          >
            <MaterialCommunityIcons name="truck-delivery" size={22} color="#fff" />
            <Text style={styles.deliveryButtonText}>Delivery</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const isActive = activeFilter === item.id;
            const count = item.id === 'all' 
              ? orders.length 
              : orders.filter(o => o.status === item.id).length;
            
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => applyFilter(item.id)}
              >
                <MaterialIcons 
                  name={item.icon} 
                  size={16} 
                  color={isActive ? '#FFFFFF' : '#6B7280'} 
                />
                <Text style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}>
                  {item.label}
                </Text>
                {count > 0 && (
                  <View style={[
                    styles.filterCount,
                    isActive && styles.filterCountActive,
                  ]}>
                    <Text style={[
                      styles.filterCountText,
                      isActive && styles.filterCountTextActive,
                    ]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </View>
      
      {/* Orders List */}
      <FlatList
        style={styles.ordersList}
        contentContainerStyle={styles.ordersContent}
        data={filteredOrders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrderCard}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="clipboard-text-outline" 
              size={70} 
              color="#D1D5DB" 
            />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all' 
                ? 'You have no orders assigned yet'
                : `No orders with "${filters.find(f => f.id === activeFilter)?.label}" status`
              }
            </Text>
            {activeFilter === 'all' && (
              <>
                <Text style={styles.emptyHint}>
                  Orders are created after you accept a material request.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => navigation.navigate('Home', { screen: 'MaterialRequests', params: { initialTab: 'accepted' } })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyCtaText}>Open Material Requests</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  deliveryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  ordersList: {
    flex: 1,
  },
  ordersContent: {
    padding: 16,
    gap: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  orderCardNew: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  newBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderNumberContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  orderNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  projectName: {
    fontSize: 13,
    color: '#6B7280',
  },
  materialsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  materialsTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  materialText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  moreItemsText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 16,
  },
  itemsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  itemsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  estimatedAmount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 'auto',
  },
  finalAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  finalAmountLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  finalAmountValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 'auto',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionHintText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deliveryPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    gap: 6,
  },
  deliveryPromptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 14,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VendorOrdersScreen;
