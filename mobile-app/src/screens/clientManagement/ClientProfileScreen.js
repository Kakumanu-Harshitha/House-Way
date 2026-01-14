import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { clientsAPI } from '../../utils/api';
import { useAttendance } from '../../context/AttendanceContext';
import BottomNavBar from '../../components/common/BottomNavBar';
import { COLORS } from '../../styles/colors';

const ClientProfileScreen = ({ navigation, route }) => {
  const { clientId } = route?.params || {};
  const { user, isAuthenticated } = useAuth();
  const { isCheckedIn } = useAttendance();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    // Protection: If employee is not checked in, redirect to Check-In screen
    if (isAuthenticated && user?.role === 'employee' && !isCheckedIn) {
      if (Platform.OS === 'web') {
        alert('⏳ Access Denied: You must be Checked-In to access client profiles.');
      } else {
        Alert.alert('Check-In Required', 'You must be Checked-In to access client profiles.');
      }
      navigation.replace('CheckIn');
      return;
    }

    if (isAuthenticated && user) {
      loadClientData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, clientId, isCheckedIn, navigation]);

  const loadClientData = async () => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await clientsAPI.getClient(clientId);
      if (response.success) {
        const { client: clientData, projects: projectsData } = response.data;
        setClient(clientData);
        setProjects(projectsData?.list || []);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadClientData();
    setRefreshing(false);
  };

  const getClientAddress = () => {
    const addr = client?.address || client?.clientDetails?.address;
    if (!addr) return null;
    if (typeof addr === 'string') return addr;
    const parts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Mock payment schedule for each project
  const getPaymentSchedule = (project) => {
    const budget = project.budget?.estimated || 0;
    return [
      { name: 'Advance', amount: budget * 0.25, status: 'paid' },
      { name: 'Phase 1', amount: budget * 0.25, status: 'pending' },
      { name: 'Phase 2', amount: budget * 0.25, status: 'pending' },
      { name: 'Final', amount: budget * 0.25, status: 'pending' },
    ];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading client...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>Client not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Details</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditClient', { clientId: client._id, clientData: client })}
          >
            <Feather name="edit-2" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Client Info Card */}
        <View style={styles.clientCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {client.firstName?.charAt(0)}{client.lastName?.charAt(0)}
            </Text>
          </View>
          <Text style={styles.clientName}>{client.firstName} {client.lastName}</Text>

          <View style={styles.infoRow}>
            <Feather name="mail" size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{client.email || 'No email'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="phone" size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{client.phone || 'No phone'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{getClientAddress() || 'No address provided'}</Text>
          </View>
        </View>

        {/* Projects Section */}
        <Text style={styles.sectionTitle}>Projects</Text>

        {projects.length > 0 ? (
          projects.map((project) => (
            <TouchableOpacity
              key={project._id}
              style={styles.projectCard}
              onPress={() => navigation.navigate('ProjectDetail', { projectId: project._id })}
              activeOpacity={0.7}
            >
              <View style={styles.projectHeader}>
                <View style={styles.projectIconCircle}>
                  <Feather name="briefcase" size={18} color={COLORS.text} />
                </View>
                <View style={styles.projectInfo}>
                  <Text style={styles.projectName}>{project.title}</Text>
                  <Text style={styles.projectId}>{project.projectId || 'No ID'}</Text>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noProjects}>
            <Feather name="folder" size={40} color={COLORS.textMuted} />
            <Text style={styles.noProjectsText}>No projects yet</Text>
          </View>
        )}

        <View style={{ height: 150 }} />
      </ScrollView>

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.danger,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
    marginLeft: 10,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  clientCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 16,
  },
  projectCard: {
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  projectId: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  projectLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  projectLocationText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  paymentProgress: {
    marginTop: 16,
    backgroundColor: '#F9FAFB', // Light gray background
    borderRadius: 12,
    padding: 12,
  },
  paymentProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paymentProgressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  paymentProgressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB', // Light gray unfilled bar
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  paymentAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  paidAmount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  totalAmount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  paymentSchedule: {
    marginTop: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  paymentItemName: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  paymentItemAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 10,
  },
  paymentItemStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  noProjects: {
    alignItems: 'center',
    paddingVertical: 40,
    marginHorizontal: 20,
  },
  noProjectsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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

export default ClientProfileScreen;