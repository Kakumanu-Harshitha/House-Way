import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';

const ProjectDetailsScreen = ({ route, navigation }) => {
  const { projectId } = route.params || {};
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [invoiceStats, setInvoiceStats] = useState({ total: 0, paid: 0, overdue: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const getClientDisplayName = (client) => {
    if (!client) return 'N/A';
    if (typeof client === 'string') return client;
    const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
    return fullName || client.email || 'N/A';
  };

  const loadProjectData = async () => {
    try {
      const [foundProject, projectTasks, events, invoices] = await Promise.all([
        api.getProjectById(projectId),
        api.getProjectTasks(projectId).catch(() => []),
        api.getProjectTimeline(projectId, { limit: 50 }).catch(() => []),
        api.getProjectInvoices(projectId, { limit: 200 }).catch(() => []),
      ]);

      setProject(foundProject);

      // Normalize task fields from backend model
      const normalizedTasks = (projectTasks || []).map(t => ({
        _id: t._id,
        title: t.taskName,
        description: t.taskDescription,
        status: t.status,
        priority: t.priority,
        dueDate: t.date,
        time: t.time,
        assigneeName: t.assignedTo ? `${t.assignedTo.firstName || ''} ${t.assignedTo.lastName || ''}`.trim() : 'Unassigned',
      }));
      setTasks(normalizedTasks);

      setTimelineEvents(Array.isArray(events) ? events : []);

      // Team members from project (employees + vendors)
      const employees = foundProject?.assignedEmployees || [];
      const vendors = foundProject?.assignedVendors || [];
      setTeam([...(Array.isArray(employees) ? employees : []), ...(Array.isArray(vendors) ? vendors : [])]);

      // Invoice stats
      const inv = Array.isArray(invoices) ? invoices : [];
      const paid = inv.filter(i => i.status === 'paid').length;
      const overdue = inv.filter(i => i.status === 'overdue').length;
      const pending = inv.filter(i => i.status === 'pending' || i.status === 'partial').length;
      setInvoiceStats({ total: inv.length, paid, overdue, pending });

    } catch (error) {
      console.error("Failed to load project details", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (projectId) {
        loadProjectData();
      }
    }, [projectId])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Project not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusConfig = (status, priority) => {
    if (priority === 'high' || priority === 'urgent' || status === 'planning') {
      return { emoji: '🔴', text: 'DELAYED', color: '#D32F2F' };
    }
    if (status === 'on-hold') {
      return { emoji: '🟡', text: 'ON HOLD', color: '#FBC02D' };
    }
    if (status === 'completed') {
      return { emoji: '✅', text: 'COMPLETED', color: '#4CAF50' };
    }
    return { emoji: '🟢', text: 'ON TRACK', color: '#4CAF50' };
  };

  const calculateProgress = () => {
    const p = project?.progress?.percentage;
    if (typeof p === 'number' && !Number.isNaN(p)) {
      return Math.max(0, Math.min(100, Math.round(p)));
    }
    if (project?.status === 'completed') return 100;
    return 0;
  };

  const calculateDaysLeft = () => {
    const endDate = project?.timeline?.expectedEndDate || project?.timeline?.actualEndDate;
    if (!endDate) return 'N/A';
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff} days left` : `${Math.abs(diff)} days overdue`;
  };

  const statusConfig = getStatusConfig(project.status, project.priority);
  const progress = calculateProgress();
  const daysLeft = calculateDaysLeft();

  const milestoneEvents = (timelineEvents || []).filter(e => e.eventType === 'milestone');

  const formatDateRange = (startDate, endDate) => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (start && end) return `${fmt(start)} - ${fmt(end)}`;
    if (start) return fmt(start);
    if (end) return fmt(end);
    return '';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.projectTitle} numberOfLines={2}>
        {project.projectType === 'residential' ? '🏠' : '🏢'} {project.title}
      </Text>
      
      <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '30' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
        <Text style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.emoji} {statusConfig.text}
        </Text>
      </View>

      <Text style={styles.dueDateText}>
        Due: {project.timeline?.expectedEndDate ? new Date(project.timeline.expectedEndDate).toLocaleDateString() : 'Not set'} • {daysLeft}
      </Text>

      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Overall Progress</Text>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: statusConfig.color }]} />
        </View>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {[
        { id: 'overview', label: 'OVERVIEW', icon: 'grid-outline' },
        { id: 'tasks', label: 'TASKS', icon: 'checkbox-outline' },
        { id: 'payments', label: 'PAYMENTS', icon: 'cash-outline' },
        { id: 'team', label: 'TEAM', icon: 'people-outline' }
      ].map((tab) => (
        <TouchableOpacity 
          key={tab.id}
          style={[styles.tabItem, activeTab === tab.id && styles.activeTabItem]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Ionicons 
            name={tab.icon} 
            size={18} 
            color={activeTab === tab.id ? '#1976D2' : '#888'} 
          />
          <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Milestone Timeline */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📍 MILESTONE TIMELINE</Text>
          <TouchableOpacity>
            <Text style={styles.cardAction}>View Gantt →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.timelineContainer}>
          {milestoneEvents.length === 0 ? (
            <Text style={styles.emptyText}>No milestone updates yet</Text>
          ) : (
            milestoneEvents.slice(0, 8).map((event, index) => (
              <View key={event._id || index} style={styles.phaseContainer}>
                <View style={styles.phaseIconContainer}>
                  {event.status === 'completed' ? (
                    <View style={[styles.phaseIcon, { backgroundColor: '#4CAF50' }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  ) : (
                    <View style={[styles.phaseIcon, { backgroundColor: '#1976D2' }]}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                  {index < milestoneEvents.slice(0, 8).length - 1 && (
                    <View style={styles.phaseConnector} />
                  )}
                </View>

                <View style={styles.phaseContent}>
                  <Text style={styles.phaseName}>{event.title}</Text>
                  <Text style={styles.phaseDates}>
                    {formatDateRange(event.startDate, event.endDate) || new Date(event.createdAt).toLocaleDateString()}
                  </Text>
                  {event.description ? (
                    <Text style={styles.phaseCurrentTag} numberOfLines={2}>{event.description}</Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Financial Snapshot */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💰 FINANCIAL SNAPSHOT</Text>

        {(() => {
          const estimated = project.budget?.estimated || 0;
          const actual = project.budget?.actual || 0;
          const remaining = Math.max(0, estimated - actual);
          const pct = estimated > 0 ? Math.round((actual / estimated) * 100) : 0;

          return (
            <>
              <View style={styles.budgetGrid}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Budget</Text>
                  <Text style={styles.budgetAmount}>₹{Number(estimated).toLocaleString()}</Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Used</Text>
                  <Text style={[styles.budgetAmount, { color: '#FBC02D' }]}>₹{Number(actual).toLocaleString()}</Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetLabel}>Remaining</Text>
                  <Text style={[styles.budgetAmount, { color: '#4CAF50' }]}>₹{Number(remaining).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.budgetBar}>
                <View style={[styles.budgetBarFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} />
              </View>
              <Text style={styles.budgetNote}>📉 {pct}% Used</Text>
            </>
          );
        })()}

        <TouchableOpacity 
          style={styles.invoiceLink}
          onPress={() => navigation.navigate('Finance', { screen: 'Invoices' })}
        >
          <Text style={styles.invoiceLinkText}>
            📄 Invoices: {invoiceStats.paid} Paid, {invoiceStats.overdue} Overdue, {invoiceStats.pending} Pending
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#1976D2" />
        </TouchableOpacity>
      </View>

      {/* Project Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📋 PROJECT DETAILS</Text>
        
        <View style={styles.detailRow}>
          <Ionicons name="location" size={18} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>
              {project.location?.city}, {project.location?.state}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="person" size={18} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Client</Text>
            <Text style={styles.detailValue}>{getClientDisplayName(project.client)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar" size={18} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {project.timeline?.startDate && (project.timeline?.expectedEndDate || project.timeline?.actualEndDate) ? 
                `${Math.ceil((new Date(project.timeline.expectedEndDate || project.timeline.actualEndDate) - new Date(project.timeline.startDate)) / (1000 * 60 * 60 * 24))} days` 
                : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="build" size={18} color="#666" />
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{project.projectType || 'N/A'}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderTasks = () => (
    <View style={styles.tabContent}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskHeaderTitle}>Tasks ({tasks.length})</Text>
        <TouchableOpacity 
          style={styles.addTaskBtn}
          onPress={() => Alert.alert('Add Task', 'Task creation coming soon!')}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addTaskText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterChips}>
        <TouchableOpacity style={[styles.filterChip, styles.filterChipActive]}>
          <Text style={[styles.filterChipText, styles.filterChipTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>My Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Blocked</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Group by phase */}
        <Text style={styles.taskGroupTitle}>▼ PHASE 3: STRUCTURE</Text>
        
        {tasks.slice(0, 3).map((task, idx) => (
          <TouchableOpacity key={task._id || idx} style={styles.taskCard}>
            <View style={styles.taskLeft}>
              <TouchableOpacity 
                style={[
                  styles.taskCheckbox,
                  task.status === 'completed' && styles.taskCheckboxChecked
                ]}
                onPress={() => Alert.alert('Task', 'Mark as complete?')}
              >
                {task.status === 'completed' && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              
              <View style={styles.taskInfo}>
                <Text style={[
                  styles.taskTitle,
                  task.status === 'completed' && styles.taskTitleCompleted
                ]}>
                  {task.priority === 'high' && '🛑 '}
                  {task.title}
                </Text>
                <View style={styles.taskMeta}>
                  <Ionicons name="person" size={12} color="#888" />
                  <Text style={styles.taskMetaText}>{task.assignee || 'Unassigned'}</Text>
                  {task.dueDate && (
                    <>
                      <Text style={styles.taskMetaDot}>•</Text>
                      <Text style={styles.taskMetaText}>
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>

            {task.priority === 'high' && (
              <View style={styles.taskPriorityBadge}>
                <Text style={styles.taskPriorityText}>HIGH</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <Text style={[styles.taskGroupTitle, { marginTop: 24 }]}>▼ PHASE 4: FINISHING</Text>
        
        {tasks.slice(3, 5).map((task, idx) => (
          <TouchableOpacity key={task._id || idx} style={styles.taskCard}>
            <View style={styles.taskLeft}>
              <View style={styles.taskCheckbox}>
                <Text style={{ fontSize: 10 }}>○</Text>
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <View style={styles.taskMeta}>
                  <Ionicons name="person" size={12} color="#888" />
                  <Text style={styles.taskMetaText}>Unassigned</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTeam = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.teamHeader}>
        <Text style={styles.teamHeaderTitle}>Project Team ({team.length})</Text>
        <TouchableOpacity 
          style={styles.inviteBtn}
          onPress={() => Alert.alert('Invite', 'Team invitation coming soon!')}
        >
          <Ionicons name="person-add" size={16} color="#1976D2" />
          <Text style={styles.inviteBtnText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.teamSectionTitle}>MANAGER</Text>
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>AD</Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>Admin Owner (You)</Text>
            <Text style={styles.memberRole}>Project Manager</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.teamSectionTitle}>TEAM MEMBERS</Text>
        {team.map((member, idx) => (
          <View key={member._id || idx} style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.firstName?.[0]}{member.lastName?.[0]}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>
                {member.firstName} {member.lastName}
              </Text>
              <Text style={styles.memberRole}>
                {member.employeeDetails?.position || 'Team Member'} • {tasks.filter(t => t.assignee === member.firstName).length} Tasks
              </Text>
            </View>
            <View style={styles.memberActions}>
              <TouchableOpacity style={styles.memberActionBtn}>
                <Ionicons name="call" size={18} color="#1976D2" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.memberActionBtn}>
                <Ionicons name="chatbubble" size={18} color="#1976D2" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.teamSectionTitle}>CLIENT POC</Text>
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Ionicons name="person" size={20} color="#666" />
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>Client Representative</Text>
            <Text style={styles.memberRole}>Point of Contact</Text>
          </View>
          <TouchableOpacity style={styles.emailBtn}>
            <Ionicons name="mail" size={18} color="#1976D2" />
            <Text style={styles.emailBtnText}>Email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  const renderPayments = () => {
    const schedule = project.paymentSchedule || [];
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💳 PAYMENT SCHEDULE</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProjectPayments', { projectId: project._id })}>
              <Text style={styles.cardAction}>View Full →</Text>
            </TouchableOpacity>
          </View>

          {schedule.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={48} color="#eee" />
              <Text style={styles.emptyText}>No payment schedule defined</Text>
            </View>
          ) : (
            schedule.map((item, index) => {
              const isPaid = item.status === 'paid';
              const isOverdue = !isPaid && new Date(item.dueDate) < new Date();
              
              return (
                <View key={item._id || index} style={styles.paymentItem}>
                  <View style={[
                    styles.paymentStatusDot, 
                    { backgroundColor: isPaid ? '#4CAF50' : (isOverdue ? '#D32F2F' : '#FBC02D') }
                  ]} />
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentName}>{item.name || `Installment ${index + 1}`}</Text>
                    <Text style={styles.paymentDate}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.paymentRight}>
                    <Text style={styles.paymentAmount}>₹{item.amount.toLocaleString()}</Text>
                    <Text style={[
                      styles.paymentStatusText,
                      { color: isPaid ? '#4CAF50' : (isOverdue ? '#D32F2F' : '#FBC02D') }
                    ]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity 
          style={styles.createInvoiceBtn}
          onPress={() => navigation.navigate('CreateInvoice', { projectId: project._id })}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.createInvoiceText}>Create New Invoice</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A1A" />
      {renderHeader()}
      {renderTabs()}
      <View style={styles.contentContainer}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'team' && renderTeam()}
      </View>
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
    backgroundColor: '#FFFFFF'
  },
  errorText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20
  },
  backButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  header: {
    backgroundColor: '#1A1A1A',
    padding: 20,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  dueDateText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 16
  },
  progressSection: {
    marginTop: 8
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  progressLabel: {
    color: '#aaa',
    fontSize: 12
  },
  progressPercent: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    paddingVertical: 12,
    gap: 6
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderColor: '#1976D2'
  },
  tabText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '600'
  },
  activeTabText: {
    color: '#1976D2',
    fontWeight: 'bold'
  },
  contentContainer: {
    flex: 1
  },
  tabContent: {
    flex: 1,
    padding: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5
  },
  cardAction: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600'
  },
  timelineContainer: {
    marginTop: 8
  },
  phaseContainer: {
    flexDirection: 'row',
    marginBottom: 24
  },
  phaseIconContainer: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative'
  },
  phaseIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  phaseConnector: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 40,
    backgroundColor: '#E0E0E0'
  },
  phaseContent: {
    flex: 1,
    paddingTop: 4
  },
  phaseName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  phaseDates: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4
  },
  phaseCurrentTag: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: 'bold',
    marginTop: 4
  },
  phaseIssue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    gap: 6
  },
  phaseIssueText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600'
  },
  budgetGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center'
  },
  budgetLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4
  },
  budgetAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  budgetDivider: {
    width: 1,
    backgroundColor: '#E0E0E0'
  },
  budgetBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  budgetBarFill: {
    width: '60%',
    height: '100%',
    backgroundColor: '#FBC02D',
    borderRadius: 4
  },
  budgetNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12
  },
  invoiceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  invoiceLinkText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12
  },
  detailContent: {
    flex: 1
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500'
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  taskHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  addTaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4
  },
  addTaskText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  filterChips: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd'
  },
  filterChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2'
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff'
  },
  taskGroupTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#eee'
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  taskCheckboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  taskInfo: {
    flex: 1
  },
  taskTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  taskMetaText: {
    fontSize: 12,
    color: '#888'
  },
  taskMetaDot: {
    fontSize: 12,
    color: '#888'
  },
  taskPriorityBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  taskPriorityText: {
    fontSize: 10,
    color: '#D32F2F',
    fontWeight: 'bold'
  },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  teamHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1976D2',
    gap: 4
  },
  inviteBtnText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600'
  },
  teamSectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1976D2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  memberAvatarText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold'
  },
  memberInfo: {
    flex: 1
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  memberRole: {
    fontSize: 12,
    color: '#888'
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8
  },
  memberActionBtn: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8
  },
  emailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 4
  },
  emailBtnText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600'
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  paymentStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12
  },
  paymentInfo: {
    flex: 1
  },
  paymentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  paymentDate: {
    fontSize: 12,
    color: '#888'
  },
  paymentRight: {
    alignItems: 'flex-end'
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  createInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    gap: 8
  },
  createInvoiceText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  }
});

export default ProjectDetailsScreen;
