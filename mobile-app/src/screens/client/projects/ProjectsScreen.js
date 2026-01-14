import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { projectsAPI } from '../../../utils/api';
import ModernCard, { ProjectCard } from '../../../components/ModernCard';
import theme from '../../../styles/theme';

// Premium White Theme with Gold Accents
const COLORS = {
  primary: '#D4AF37',
  primaryDark: '#8B6914',
  primaryLight: 'rgba(184, 134, 11, 0.15)',
  background: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(184, 134, 11, 0.1)',
  text: '#1A1A1A',
  textMuted: '#666666',
  success: '#22C55E',
  warning: '#F59E0B',
};

const ProjectsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('active'); // 'active' or 'past'

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchQuery, selectedTab]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);

      // Use projectsAPI.getProjects - backend automatically filters by role
      // Clients see their projects, employees see assigned projects, owner sees all
      const response = await projectsAPI.getProjects({ limit: 50 });

      if (response.success) {
        setProjects(response.data.projects || []);
      } else {
        Alert.alert('Error', 'Failed to load projects');
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      Alert.alert('Error', 'Failed to load projects');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    // Apply tab filter - Active vs Past
    if (selectedTab === 'active') {
      // Active: in-progress, planning
      filtered = filtered.filter(project =>
        project.status === 'in-progress' || project.status === 'planning'
      );
    } else {
      // Past: completed, on-hold, cancelled
      filtered = filtered.filter(project =>
        project.status === 'completed' || project.status === 'on-hold' || project.status === 'cancelled'
      );
    }

    // Apply search filter - search by project name or employee name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        // Search by project title
        const titleMatch = project.title?.toLowerCase().includes(query);

        // Search by description
        const descMatch = project.description?.toLowerCase().includes(query);

        // Search by assigned employee names
        const employeeMatch = project.assignedEmployees?.some(emp => {
          const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
          return fullName.includes(query) || emp.email?.toLowerCase().includes(query);
        });

        // Search by team/assigned to
        const teamMatch = project.team?.some(member => {
          const memberName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
          return memberName.includes(query);
        });

        // Search by manager name
        const managerMatch = project.projectManager?.firstName?.toLowerCase().includes(query) ||
          project.projectManager?.lastName?.toLowerCase().includes(query);

        return titleMatch || descMatch || employeeMatch || teamMatch || managerMatch;
      });
    }

    setFilteredProjects(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  // Get counts for tabs
  const activeCount = projects.filter(p => p.status === 'in-progress' || p.status === 'planning').length;
  const pastCount = projects.filter(p => p.status === 'completed' || p.status === 'on-hold' || p.status === 'cancelled').length;

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return COLORS.success;
      case 'in-progress': return COLORS.primary;
      case 'planning': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const renderProjectCard = ({ item: project }) => (
    <TouchableOpacity
      style={styles.projectCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('ProjectDetails', { projectId: project._id })}
    >
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(project.status) }]} />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.projectTitle} numberOfLines={1}>{project.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
              {project.status === 'in-progress' ? 'ACTIVE' : project.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.projectDescription} numberOfLines={2}>
          {project.description || 'No description available'}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${project.progress?.percentage || 0}%`,
                  backgroundColor: getStatusColor(project.status)
                }
              ]}
            />
          </View>
          <Text style={styles.progressText}>{project.progress?.percentage || 0}%</Text>
        </View>

        {/* Bottom Info */}
        <View style={styles.cardFooter}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>{project.location?.city || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.infoText}>₹{(project.budget?.estimated || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* Assigned Team Preview */}
        {project.assignedEmployees && project.assignedEmployees.length > 0 && (
          <View style={styles.teamPreview}>
            <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.teamText} numberOfLines={1}>
              {project.assignedEmployees.slice(0, 2).map(e => e.firstName).join(', ')}
              {project.assignedEmployees.length > 2 ? ` +${project.assignedEmployees.length - 2}` : ''}
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} style={styles.chevron} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading projects...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Projects</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by project or team member..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Buttons */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'active' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('active')}
        >
          <Ionicons
            name="play-circle"
            size={18}
            color={selectedTab === 'active' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
            Active ({activeCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'past' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('past')}
        >
          <Ionicons
            name="checkmark-done-circle"
            size={18}
            color={selectedTab === 'past' ? COLORS.primary : COLORS.textMuted}
          />
          <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
            Past ({pastCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Projects List */}
      <FlatList
        data={filteredProjects}
        keyExtractor={(item) => item._id}
        renderItem={renderProjectCard}
        contentContainerStyle={styles.projectsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons
              name={selectedTab === 'active' ? 'construct-outline' : 'archive-outline'}
              size={64}
              color={COLORS.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {selectedTab === 'active' ? 'No Active Projects' : 'No Past Projects'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchQuery
                ? 'Try adjusting your search criteria'
                : selectedTab === 'active'
                  ? 'You don\'t have any active projects at the moment'
                  : 'Your completed projects will appear here'
              }
            </Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
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
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textMuted,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabTextActive: {
    color: COLORS.primaryDark,
  },

  // Projects List
  projectsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Project Card
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    paddingLeft: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  projectDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 35,
    textAlign: 'right',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Team Preview
  teamPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    gap: 6,
  },
  teamText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },

  chevron: {
    marginRight: 12,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ProjectsScreen;