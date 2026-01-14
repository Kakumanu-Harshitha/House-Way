import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { clientsAPI, projectsAPI } from '../../utils/api';
import { useAttendance } from '../../context/AttendanceContext';
import BottomNavBar from '../../components/common/BottomNavBar';
import { COLORS } from '../../styles/colors';

const { width } = Dimensions.get('window');

const ClientsListScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const { isCheckedIn } = useAttendance();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [clientProjects, setClientProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Active');

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
      loadClients();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, isCheckedIn, navigation]);


  useEffect(() => {
    filterClients();
  }, [searchQuery, clients]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadClients();
    }
  }, [activeTab]);

  const loadClients = async (isRefresh = false) => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Pass status to backend for server-side filtering
      const statusFilter = activeTab === 'Active' ? 'active' : 'inactive';
      const response = await clientsAPI.getClients({
        limit: 100,
        status: statusFilter,
        search: searchQuery || undefined
      });

      if (response.success) {
        const clientsList = response.data.clients || [];
        setClients(clientsList);
        setFilteredClients(clientsList);

        // Load projects for each client (limit to first 20 for performance)
        const projectsMap = {};
        for (const client of clientsList.slice(0, 20)) {
          try {
            const projRes = await projectsAPI.getClientProjects(client._id);
            if (projRes.success) {
              projectsMap[client._id] = projRes.data.projects || [];
            }
          } catch (e) {
            projectsMap[client._id] = [];
          }
        }
        setClientProjects(projectsMap);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterClients = () => {
    let filtered = clients;

    // Filter by active/past
    if (activeTab === 'Active') {
      filtered = filtered.filter(client =>
        client.clientDetails?.clientStatus !== 'inactive'
      );
    } else {
      filtered = filtered.filter(client =>
        client.clientDetails?.clientStatus === 'inactive'
      );
    }

    // Search filter - search by name, email, or ID
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query) ||
        client._id?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  };

  const handleClientPress = (client) => {
    navigation.navigate('ClientProfile', { clientId: client._id });
  };

  const getClientAddress = (client) => {
    const addr = client.address || client.clientDetails?.address;
    if (!addr) return 'No address';
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  };

  const renderClientCard = ({ item }) => {
    const projects = clientProjects[item._id] || [];
    const activeProjects = projects.filter(p => p.status !== 'completed');

    return (
      <TouchableOpacity
        style={styles.clientCard}
        onPress={() => handleClientPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.firstName?.charAt(0)}{item.lastName?.charAt(0)}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>{item.firstName} {item.lastName}</Text>
            {item.clientId && (
              <Text style={styles.clientIdBadge}>{item.clientId}</Text>
            )}
            <Text style={styles.clientEmail}>{item.email}</Text>
          </View>
          <Feather name="chevron-right" size={22} color={COLORS.textMuted} />
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <Feather name="mail" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{item.email || 'No email'}</Text>
        </View>

        <View style={styles.detailsRow}>
          <Feather name="map-pin" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>{getClientAddress(item)}</Text>
        </View>

        <View style={styles.detailsRow}>
          <Feather name="phone" size={14} color={COLORS.textMuted} />
          <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
        </View>

        {activeProjects.length > 0 && (
          <View style={styles.projectsSection}>
            <Text style={styles.projectsLabel}>Active Projects ({activeProjects.length})</Text>
            {activeProjects.slice(0, 2).map(project => (
              <View key={project._id} style={styles.projectTag}>
                <Feather name="briefcase" size={12} color={COLORS.primary} />
                <Text style={styles.projectName} numberOfLines={1}>
                  {project.projectId || 'N/A'} - {project.title}
                </Text>
              </View>
            ))}
            {activeProjects.length > 2 && (
              <Text style={styles.moreProjects}>+{activeProjects.length - 2} more</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && clients.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Clients</Text>

      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or ID..."
          placeholderTextColor={COLORS.textDim}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Active' && styles.activeTabStyle]}
          onPress={() => setActiveTab('Active')}
        >
          <View style={[styles.tabDot, { backgroundColor: COLORS.activeTab }]} />
          <Text style={[styles.tabText, activeTab === 'Active' && styles.activeTabText]}>
            Active Clients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Past' && styles.activeTabStyle]}
          onPress={() => setActiveTab('Past')}
        >
          <View style={[styles.tabDot, { backgroundColor: COLORS.pastTab }]} />
          <Text style={[styles.tabText, activeTab === 'Past' && styles.activeTabText]}>
            Past Clients
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>{filteredClients.length} clients found</Text>
      </View>

      {/* Client List */}
      <FlatList
        style={{ flex: 1 }}
        data={filteredClients}
        renderItem={renderClientCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadClients(true)}
            tintColor={COLORS.primary}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} clients</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'Active' ? 'Add your first client to get started' : 'No past clients found'}
            </Text>
          </View>
        }
      />

      {/* Bottom Navigation */}
      <BottomNavBar navigation={navigation} activeTab="clients" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeTabStyle: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: '#FFFFFF', // White text on Yellow active tab
  },
  statsRow: {
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 180,
    paddingTop: 8,
  },
  clientCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  clientIdBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  clientEmail: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  menuBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.cardBorder,
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  projectsSection: {
    marginTop: 12,
    backgroundColor: '#F9F9F4', // Light beige for light theme
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  projectsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  projectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  projectName: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  moreProjects: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
    gap: 6,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  fabButton: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
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

export default ClientsListScreen;