import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { materialRequestsAPI, quotationsAPI, dashboardAPI, purchaseOrdersAPI } from '../../utils/api';
import CommonHeader from '../../components/CommonHeader';
import theme from '../../styles/theme';

const VendorDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    recentActivities: [],
    stats: {
      pendingRequests: 0,
      quotationsSent: 0,
      invoicesUploaded: 0,
      projectsInProgress: 0,
    },
    monthlyData: {
      total: 0,
      percentage: 0,
      chartData: [45, 85, 65, 95, 75, 55, 85, 105],
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      console.log('[VendorDashboard] Loading data for user:', user?.email);

      // Fetch all data in parallel
      const [statsRes, activitiesRes, requestsRes, quotationsRes, invoicesRes] = await Promise.allSettled([
        dashboardAPI.getVendorStats(),
        dashboardAPI.getRecentActivity(),
        materialRequestsAPI.getMaterialRequests({ limit: 100 }),
        quotationsAPI.getVendorQuotations(),
        purchaseOrdersAPI.getMyOrders(),
      ]);

      console.log('[VendorDashboard] API Results:', {
        stats: statsRes.status,
        activities: activitiesRes.status,
        requests: requestsRes.status,
        quotations: quotationsRes.status,
        invoices: invoicesRes.status,
      });

      let stats = {
        pendingRequests: 0,
        quotationsSent: 0,
        invoicesUploaded: 0,
        projectsInProgress: 0,
      };
      let recentActivities = [];

      // Process stats
      if (statsRes.status === 'fulfilled' && statsRes.value.success) {
        const data = statsRes.value.data;
        stats.quotationsSent = data.approvedQuotations || 0;
        console.log('[VendorDashboard] Stats API data:', data);
      } else if (statsRes.status === 'rejected') {
        console.error('[VendorDashboard] Stats API failed:', statsRes.reason);
      }

      // Count pending requests - these are available for ALL vendors
      if (requestsRes.status === 'fulfilled' && requestsRes.value.success) {
        // Get available requests (unassigned or not yet accepted by this vendor)
        const allRequests = requestsRes.value.data.materialRequests || [];
        stats.pendingRequests = allRequests.length;
        console.log('[VendorDashboard] Found', stats.pendingRequests, 'material requests available');
      } else if (requestsRes.status === 'rejected') {
        console.error('[VendorDashboard] Material requests API failed:', requestsRes.reason);
      }

      // Count quotations sent by this vendor
      if (quotationsRes.status === 'fulfilled' && quotationsRes.value.success) {
        const quotations = quotationsRes.value.data.quotations || [];
        stats.quotationsSent = quotations.length;
        console.log('[VendorDashboard] Found', stats.quotationsSent, 'quotations');
      } else if (quotationsRes.status === 'rejected') {
        console.error('[VendorDashboard] Quotations API failed:', quotationsRes.reason);
      }

      // Count invoices/purchase orders
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success) {
        const orders = invoicesRes.value.data.purchaseOrders || [];
        stats.invoicesUploaded = orders.length;
        console.log('[VendorDashboard] Found', stats.invoicesUploaded, 'purchase orders');
      } else if (invoicesRes.status === 'rejected') {
        console.error('[VendorDashboard] Purchase orders API failed:', invoicesRes.reason);
      }

      // Count projects (unique projects from quotations)
      if (quotationsRes.status === 'fulfilled' && quotationsRes.value.success) {
        const quotations = quotationsRes.value.data.quotations || [];
        const uniqueProjects = new Set(quotations.map(q => q.materialRequest?.project?._id).filter(Boolean));
        stats.projectsInProgress = uniqueProjects.size;
      }

      // Process recent activities
      if (activitiesRes.status === 'fulfilled' && activitiesRes.value.success) {
        recentActivities = activitiesRes.value.data.activities?.slice(0, 3) || [];
      }

      console.log('[VendorDashboard] Final stats:', stats);

      // Calculate monthly total (sum of all stats)
      const monthlyTotal = stats.pendingRequests + stats.quotationsSent + stats.invoicesUploaded + (stats.projectsInProgress * 10);
      const monthlyPercentage = 12; // Static for now, can be calculated from historical data

      setDashboardData(prev => ({ 
        ...prev, 
        stats,
        recentActivities,
        monthlyData: {
          ...prev.monthlyData,
          total: monthlyTotal,
          percentage: monthlyPercentage,
        },
      }));
    } catch (error) {
      console.error('[VendorDashboard] Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleLogout = () => {
    console.log('Logout initiated');
    
    // For web, use window.confirm; for mobile, use Alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        performLogout();
      } else {
        console.log('Logout cancelled');
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => console.log('Logout cancelled')
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: performLogout
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      console.log('Logout confirmed, clearing session...');
      await logout();
      console.log('Logout successful - redirecting to login');
      
      // Force navigation reset to Login screen
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to logout. Please try again.');
      } else {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    }
  };

  const StatCard = ({ title, value, onPress }) => (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {onPress && <Feather name="chevron-right" size={16} color={theme.colors.text.muted} style={{ position: 'absolute', right: 12, top: '50%' }} />}
    </TouchableOpacity>
  );

  const ActivityItem = ({ activity }) => {
    const getActivityIcon = (type) => {
      switch (type) {
        case 'invoice': return 'file-text';
        case 'quotation': return 'file';
        case 'project': return 'shopping-cart';
        case 'materialRequest': return 'package';
        default: return 'bell';
      }
    };

    return (
      <TouchableOpacity style={styles.activityItem}>
        <View style={styles.activityIconContainer}>
          <Feather name={getActivityIcon(activity.type)} size={24} color={theme.colors.text.secondary} />
        </View>
        <View style={styles.activityContent}>
          <Text style={styles.activityTitle} numberOfLines={1}>{activity.message || activity.title}</Text>
          <Text style={styles.activityTime}>{activity.time}</Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.text.muted} />
      </TouchableOpacity>
    );
  };

  const getCurrentDate = () => {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(60, 80, 70, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '0',
    },
    propsForBackgroundLines: {
      strokeWidth: 0,
    },
  };



  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CommonHeader title="Dashboard" userRole="Vendor" showNotifications={true} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.vendorDetails?.companyName || user?.firstName || 'Vendor'}
          </Text>
          <Text style={styles.dateText}>{getCurrentDate()}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              title="Pending Requests"
              value={dashboardData.stats.pendingRequests}
              onPress={() => navigation.navigate('MaterialRequests', { initialTab: 'accepted' })}
            />
            <StatCard
              title="Quotations Sent"
              value={dashboardData.stats.quotationsSent}
              onPress={() => navigation.navigate('MaterialRequests', { initialTab: 'accepted' })}
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              title="Orders"
              value={dashboardData.stats.invoicesUploaded}
              onPress={() => navigation.navigate('VendorOrders')}
            />
            <StatCard
              title="Projects In Progress"
              value={dashboardData.stats.projectsInProgress}
              onPress={() => navigation.navigate('Profile', { screen: 'WorkUpdates' })}
            />
          </View>
        </View>

        {/* Monthly Overview */}
        <View style={styles.monthlyOverviewCard}>
          <Text style={styles.overviewTitle}>Monthly Overview</Text>
          <View style={styles.overviewStats}>
            <Text style={styles.overviewValue}>{dashboardData.monthlyData.total}</Text>
            <Text style={styles.overviewSubtext}>
              Last 30 Days <Text style={styles.percentageGreen}>+{dashboardData.monthlyData.percentage}%</Text>
            </Text>
          </View>
          {Platform.OS !== 'web' && dashboardData.monthlyData.chartData && dashboardData.monthlyData.chartData.length >= 4 ? (
            <LineChart
              data={{
                labels: ['W1', 'W2', 'W3', 'W4'],
                datasets: [{
                  data: dashboardData.monthlyData.chartData.slice(0, 4).map(v => Math.max(0, v || 0)),
                }],
              }}
              width={Dimensions.get('window').width - 48}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLines={false}
              withHorizontalLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={false}
              withDots={false}
              withShadow={false}
              withInnerLines={false}
              withOuterLines={false}
            />
          ) : (
            <View style={styles.webChartPlaceholder}>
              <Text style={styles.webChartText}>{Platform.OS === 'web' ? 'Chart view available on mobile app' : 'Not enough data for chart'}</Text>
            </View>
          )}
        </View>

        {/* Recent Activities */}
        <View style={styles.activitiesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <TouchableOpacity onPress={() => navigation.navigate('NotificationsScreen')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {dashboardData.recentActivities.length > 0 ? (
            dashboardData.recentActivities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))
          ) : (
            <View style={styles.emptyActivities}>
              <Feather name="clock" size={48} color={theme.colors.text.muted} />
              <Text style={styles.emptyActivitiesText}>No recent activities</Text>
              <Text style={styles.emptyActivitiesSubtext}>Your recent actions will appear here</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
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
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  profileButton: {
    padding: 8,
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3C5046',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  monthlyOverviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 12,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  overviewValue: {
    fontSize: 48,
    fontWeight: '600',
    color: '#2C2C2C',
    marginRight: 12,
  },
  overviewSubtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  percentageGreen: {
    color: '#10B981',
    fontWeight: '600',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  webChartPlaceholder: {
    height: 180,
    backgroundColor: '#F0F4F3',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  webChartText: {
    fontSize: 14,
    color: '#666',
  },
  activitiesSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  viewAllText: {
    fontSize: 14,
    color: '#3C5046',
    fontWeight: '500',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyActivities: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyActivitiesText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyActivitiesSubtext: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
  welcomeSection: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
  },

});

export default VendorDashboardScreen;