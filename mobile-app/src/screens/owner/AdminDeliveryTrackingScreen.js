/**
 * AdminDeliveryTrackingScreen
 * 
 * Allows admin to view delivery status of all active orders.
 * Real-time updates from vendor delivery status changes.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { purchaseOrdersAPI } from '../../utils/api';
import AdminNavbar from '../../components/AdminNavbar';
import DeliveryCard, { getStatusConfig } from '../../components/common/DeliveryCard';

const AdminDeliveryTrackingScreen = ({ navigation, route }) => {
  const targetOrderId = route?.params?.orderId;
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, delivered

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrdersAPI.getDeliveryOverview();
      
      if (response.success) {
        const data = response.data || {};
        const deliveriesList = [
          ...(data.activeDeliveries || []),
          ...(data.delivered || []),
        ];
        // Filter to only show orders that are accepted or beyond (not draft, sent, or in_negotiation)
        const acceptedDeliveries = deliveriesList.filter(order => 
          ['accepted', 'in_progress', 'acknowledged', 'partially_delivered', 'completed'].includes(order.status)
        );
        console.log('Admin deliveries fetched:', acceptedDeliveries.length, 'orders');
        setDeliveries(acceptedDeliveries);

        // Apply initial filtering if targetOrderId is present
        if (targetOrderId) {
          const filtered = acceptedDeliveries.filter(o => o._id === targetOrderId);
          if (filtered.length > 0) {
            setFilteredDeliveries(filtered);
          } else {
            setFilteredDeliveries(acceptedDeliveries);
          }
        } else {
          setFilteredDeliveries(acceptedDeliveries);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const getFilteredDeliveries = () => {
    // If we have a target order and haven't cleared it, show only that
    if (targetOrderId && filteredDeliveries.length === 1 && deliveries.length > 1) {
      return filteredDeliveries;
    }

    if (filterStatus === 'all') return deliveries;
    if (filterStatus === 'delivered') {
      return deliveries.filter(d => d.deliveryTracking?.status === 'delivered');
    }
    // active = not delivered yet
    return deliveries.filter(d => d.deliveryTracking?.status !== 'delivered');
  };

  const renderDeliveryItem = ({ item: delivery }) => {
    return (
      <DeliveryCard
        order={delivery}
        showVendor={true}
        showAmount={false}
        onPress={() => navigation.navigate('NegotiationChat', { 
          orderId: delivery._id,
          userRole: 'owner' 
        })}
      />
    );
  };

  const FilterTabs = () => (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.filterTab, filterStatus === 'all' && styles.filterTabActive]}
        onPress={() => setFilterStatus('all')}
      >
        <Text style={[styles.filterTabText, filterStatus === 'all' && styles.filterTabTextActive]}>
          All ({deliveries.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterTab, filterStatus === 'active' && styles.filterTabActive]}
        onPress={() => setFilterStatus('active')}
      >
        <Text style={[styles.filterTabText, filterStatus === 'active' && styles.filterTabTextActive]}>
          Active ({deliveries.filter(d => d.deliveryTracking?.status !== 'delivered').length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterTab, filterStatus === 'delivered' && styles.filterTabActive]}
        onPress={() => setFilterStatus('delivered')}
      >
        <Text style={[styles.filterTabText, filterStatus === 'delivered' && styles.filterTabTextActive]}>
          Delivered ({deliveries.filter(d => d.deliveryTracking?.status === 'delivered').length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <AdminNavbar navigation={navigation} title="Delivery Tracking" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <AdminNavbar navigation={navigation} title="Delivery Tracking" />

      <FilterTabs />

      {targetOrderId && filteredDeliveries.length === 1 && deliveries.length > 1 && (
        <View style={styles.filterBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="filter-variant" size={16} color="#92400E" />
            <Text style={styles.filterBannerText}>Showing specific order</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setFilteredDeliveries(deliveries)}
            style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}
          >
            <Text style={styles.clearFilterText}>Show All</Text>
          </TouchableOpacity>
        </View>
      )}

      {filteredDeliveries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="truck-delivery-outline" 
            size={64} 
            color="#D1D5DB" 
          />
          <Text style={styles.emptyTitle}>No Deliveries</Text>
          <Text style={styles.emptySubtitle}>
            {filterStatus === 'delivered' 
              ? 'No completed deliveries yet'
              : filterStatus === 'active'
              ? 'No active deliveries at the moment'
              : 'Orders with accepted quotations will appear here'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item._id}
          renderItem={renderDeliveryItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  filterBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  filterBannerText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  clearFilterText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default AdminDeliveryTrackingScreen;
