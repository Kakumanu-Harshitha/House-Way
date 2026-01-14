import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../utils/api';
import { useAttendance } from '../../context/AttendanceContext';
import BottomNavBar from '../../components/common/BottomNavBar';
import { COLORS } from '../../styles/colors';

const { width } = Dimensions.get('window');

const HomeDashboardScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const { isCheckedIn } = useAttendance();
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    projects: 0,
    materialRequests: 0,
    quotations: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Protection: If employee is not checked in, redirect to Check-In screen
    if (isAuthenticated && user?.role === 'employee' && !isCheckedIn) {
      if (Platform.OS === 'web') {
        alert('⏳ Access Denied: You must be Checked-In to access this section.');
      } else {
        Alert.alert('Check-In Required', 'You must be Checked-In to access this section.');
      }
      navigation.replace('CheckIn');
      return;
    }

    if (isAuthenticated && user) {
      loadDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, isCheckedIn, navigation]);

  const loadDashboardData = async () => {
    try {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const statsResponse = await dashboardAPI.getStats();
      if (statsResponse.success) {
        setDashboardStats(statsResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const tiles = [
    { id: 'clients', title: 'View Clients', subtitle: 'Manage clients', icon: 'users', route: 'ClientsList' },
    { id: 'add_client', title: 'Add Client', subtitle: 'New client', icon: 'user-plus', route: 'AddClient' },
    { id: 'projects', title: 'View Projects', subtitle: `${dashboardStats.projects || 0} active`, icon: 'briefcase', route: 'ProjectList' },
    { id: 'add_project', title: 'Add Project', subtitle: 'Create new', icon: 'plus-square', route: 'CreateProject' },
  ];

  const DashboardTile = ({ tile }) => (
    <TouchableOpacity
      style={styles.tile}
      activeOpacity={0.8}
      onPress={() => navigation.navigate(tile.route)}
    >
      <View style={styles.tileIconContainer}>
        <Feather name={tile.icon} size={24} color="#1F2937" />
      </View>
      <Text style={styles.tileTitle}>{tile.title}</Text>
      <Text style={styles.tileSubtitle}>{tile.subtitle}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        bounces={Platform.OS !== 'web'}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity
            style={styles.profileBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.navigate('SettingsScreen')}
            accessibilityLabel="Open Settings"
          >
            <Feather name="user" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardStats.projects || 0}</Text>
            <Text style={styles.statLabel}>PROJECTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardStats.materialRequests || 0}</Text>
            <Text style={styles.statLabel}>REQUESTS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{dashboardStats.quotations || 0}</Text>
            <Text style={styles.statLabel}>QUOTES</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.tilesGrid}>
          {tiles.map((tile) => (
            <DashboardTile key={tile.id} tile={tile} />
          ))}
        </View>

        {/* Extra space for scrolling */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeTab="home" />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937', // Dark text
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  clientManagementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cmIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cmContent: {
    flex: 1,
    marginLeft: 14,
  },
  cmTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cmSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 16,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  tile: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  tileIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // More visible white background for icon
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937', // Dark text on yellow
    textAlign: 'center',
    marginBottom: 4,
  },
  tileSubtitle: {
    fontSize: 11,
    color: 'rgba(31, 41, 55, 0.7)', // Dark transparent text
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
});

export default HomeDashboardScreen;