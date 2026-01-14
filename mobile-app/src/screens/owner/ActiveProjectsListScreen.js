import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import AdminNavbar from '../../components/AdminNavbar';

const ActiveProjectsListScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  const getClientDisplayName = (client) => {
    if (!client) return '';
    if (typeof client === 'string') return client;
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
    return fullName || client.email || '';
  };

  const fetchProjects = async () => {
    try {
      const data = await api.getProjects();
      // Filter for active projects only
      const activeProjects = data.filter(p => 
        p.status === 'in-progress' || p.status === 'planning' || p.status === 'on-hold'
      );
      setProjects(activeProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects().then(() => setRefreshing(false));
  }, []);

  const toggleFilter = (filter) => {
    if (activeFilters.includes(filter)) {
      setActiveFilters(activeFilters.filter(f => f !== filter));
    } else {
      setActiveFilters([...activeFilters, filter]);
    }
  };

  // Filter and search logic
  const filteredProjects = projects.filter(project => {
    // Search filter
    const query = searchQuery.toLowerCase();
    const clientDisplay = getClientDisplayName(project.client).toLowerCase();
    const matchesSearch = searchQuery === '' ||
      (project.title || '').toLowerCase().includes(query) ||
      clientDisplay.includes(query);

    // Active filters
    let matchesFilters = true;
    if (activeFilters.length > 0) {
      if (activeFilters.includes('high-priority')) {
        matchesFilters = matchesFilters && (project.priority === 'high' || project.priority === 'urgent');
      }
      if (activeFilters.includes('delayed')) {
        matchesFilters = matchesFilters && project.status === 'planning';
      }
      if (activeFilters.includes('on-track')) {
        matchesFilters = matchesFilters && project.status === 'in-progress';
      }
    }

    return matchesSearch && matchesFilters;
  });

  const getStatusConfig = (status, priority) => {
    if (priority === 'high' || priority === 'urgent' || status === 'planning') {
      return { emoji: '🔴', text: 'Delayed', color: '#D32F2F' };
    }
    if (status === 'on-hold') {
      return { emoji: '🟡', text: 'On Hold', color: '#FBC02D' };
    }
    return { emoji: '🟢', text: 'On Track', color: '#4CAF50' };
  };

  const calculateProgress = (project) => {
    const p = project?.progress?.percentage;
    if (typeof p === 'number' && !Number.isNaN(p)) {
      return Math.max(0, Math.min(100, Math.round(p)));
    }
    if (project?.status === 'completed') return 100;
    return 0;
  };

  const ProjectCard = ({ project }) => {
    const statusConfig = getStatusConfig(project.status, project.priority);
    const progress = calculateProgress(project);
    const clientName = getClientDisplayName(project.client) || 'N/A';
    const memberCount = (project.assignedEmployees?.length || 0) + (project.assignedVendors?.length || 0);
    const startDate = project.timeline?.startDate;
    
    return (
      <TouchableOpacity 
        style={styles.projectCard}
        onPress={() => navigation.navigate('ProjectDetails', { projectId: project._id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.projectTitle} numberOfLines={1}>
            {project.projectType === 'residential' ? '🏠' : '🏢'} {project.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.emoji} {statusConfig.text}
            </Text>
          </View>
        </View>

        <Text style={styles.clientText}>Client: {clientName}</Text>
        
        <View style={styles.progressContainer}>
          <Text style={styles.progressLabel}>Progress: {progress}%</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { 
              width: `${progress}%`,
              backgroundColor: statusConfig.color 
            }]} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color="#666" />
            <Text style={styles.infoText}>
              {project.location?.city || 'Unknown'}, {project.location?.state || ''}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={14} color="#666" />
            <Text style={styles.infoText}>
              {memberCount} Members
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={14} color="#666" />
            <Text style={styles.infoText}>
              {startDate ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </Text>
          </View>
        </View>

        {(project.priority === 'high' || project.priority === 'urgent') && (
          <View style={styles.urgentBanner}>
            <Ionicons name="alert-circle" size={14} color="#D32F2F" />
            <Text style={styles.urgentText}>High Priority</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AdminNavbar title="Active Projects" navigation={navigation} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Projects</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreateProject')}>
          <Ionicons name="add-circle" size={28} color="#1976D2" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity 
          style={[styles.filterChip, activeFilters.includes('high-priority') && styles.filterChipActive]}
          onPress={() => toggleFilter('high-priority')}
        >
          <Text style={[styles.filterChipText, activeFilters.includes('high-priority') && styles.filterChipTextActive]}>
            High Priority
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, activeFilters.includes('on-track') && styles.filterChipActive]}
          onPress={() => toggleFilter('on-track')}
        >
          <Text style={[styles.filterChipText, activeFilters.includes('on-track') && styles.filterChipTextActive]}>
            On Track
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, activeFilters.includes('delayed') && styles.filterChipActive]}
          onPress={() => toggleFilter('delayed')}
        >
          <Text style={[styles.filterChipText, activeFilters.includes('delayed') && styles.filterChipTextActive]}>
            Delayed
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
        </Text>
        {activeFilters.length > 0 && (
          <TouchableOpacity onPress={() => setActiveFilters([])}>
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Project List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#1976D2" style={{ marginTop: 40 }} />
        ) : filteredProjects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="folder-open" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No projects found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || activeFilters.length > 0 
                ? 'Try adjusting your search or filters' 
                : 'Start by adding a new project'}
            </Text>
          </View>
        ) : (
          filteredProjects.map(project => (
            <ProjectCard key={project._id} project={project} />
          ))
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333'
  },
  filtersContainer: {
    maxHeight: 50,
    marginBottom: 8
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2'
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  resultsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8
  },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  clientText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12
  },
  progressContainer: {
    marginBottom: 12
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  infoText: {
    fontSize: 12,
    color: '#666'
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFEBEE',
    gap: 6
  },
  urgentText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default ActiveProjectsListScreen;
