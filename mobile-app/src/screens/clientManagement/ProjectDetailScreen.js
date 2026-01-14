import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { projectsAPI, filesAPI, usersAPI } from '../../utils/api';
import { useAttendance } from '../../context/AttendanceContext';
import ScheduleTab from '../../components/clientManagement/ScheduleTab';
import InvoicesListTab from '../../components/clientManagement/InvoicesListTab';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomNavBar from '../../components/common/BottomNavBar';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../styles/colors';

const ProjectDetailScreen = ({ navigation, route }) => {
  const { projectId } = route?.params || {};
  const { user, isAuthenticated } = useAuth();
  const { isCheckedIn } = useAttendance();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  // Payment schedule state
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ name: '', amount: '', dueDate: new Date().toISOString(), status: 'pending' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Project edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', budget: '', startDate: '', endDate: '' });
  const [showProjectDatePicker, setShowProjectDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timeline milestones state
  const [milestones, setMilestones] = useState([]);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneForm, setMilestoneForm] = useState({ name: '', description: '', status: 'pending' });

  // Simplified tabs - removed Timeline, added Files
  const tabs = ['Overview', 'Payments', 'Files', 'Schedule', 'Invoices', 'Team'];

  useEffect(() => {
    // Protection: If employee is not checked in, redirect to Check-In screen
    if (isAuthenticated && user?.role === 'employee' && !isCheckedIn) {
      if (Platform.OS === 'web') {
        alert('⏳ Access Denied: You must be Checked-In to access project details.');
      } else {
        Alert.alert('Check-In Required', 'You must be Checked-In to access project details.');
      }
      navigation.replace('CheckIn');
      return;
    }

    if (isAuthenticated && user) {
      loadProject();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user, projectId, isCheckedIn, navigation]);

  const loadProject = async () => {
    try {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await projectsAPI.getProject(projectId);

      if (response.success) {
        const proj = response.data.project;
        setProject(proj);

        // Initialize milestones
        if (proj.timeline?.milestones && proj.timeline.milestones.length > 0) {
          setMilestones(proj.timeline.milestones);
        } else {
          setMilestones([]);
        }

        // Initialize payment schedule from project (fallback: installments)
        const rawSchedule =
          Array.isArray(proj.paymentSchedule) && proj.paymentSchedule.length > 0
            ? proj.paymentSchedule
            : Array.isArray(proj.installments) && proj.installments.length > 0
              ? proj.installments
              : [];

        const scheduleWithIds = rawSchedule.map((payment, index) => {
          const name = payment.name || payment.title || `Payment ${index + 1}`;
          const amount = Number(payment.amount ?? 0);
          const dueDate = payment.dueDate || null;
          const status = payment.status || 'pending';
          const id = payment._id || payment.id || `payment_${Date.now()}_${index}`;
          return { ...payment, id, name, amount, dueDate, status };
        });

        setPaymentSchedule(scheduleWithIds);

        // Initialize edit form
        setEditForm({
          title: proj.title || '',
          budget: String(proj.budget?.estimated || ''),
          endDate: proj.timeline?.expectedEndDate || '',
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProject();
    setRefreshing(false);
  };

  // Payment functions
  const openPaymentModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm({
        name: payment.name || payment.title || '',
        amount: String(payment.amount ?? ''),
        dueDate: payment.dueDate || new Date().toISOString(),
        status: payment.status || 'pending',
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({ name: '', amount: '', dueDate: new Date().toISOString(), status: 'pending' });
    }
    setShowPaymentModal(true);
  };

  const savePayment = () => {
    if (!paymentForm.name || !paymentForm.amount) {
      Platform.OS === 'web' ? alert('Please fill name and amount') : Alert.alert('Error', 'Please fill name and amount');
      return;
    }

    const newPayment = {
      id: editingPayment?.id || Date.now(),
      name: paymentForm.name,
      amount: parseFloat(paymentForm.amount),
      dueDate: paymentForm.dueDate || new Date().toISOString(),
      status: paymentForm.status,
      createdAt: editingPayment?.createdAt || new Date().toISOString(),
    };

    if (editingPayment) {
      setPaymentSchedule(prev => prev.map(p => p.id === editingPayment.id ? newPayment : p));
    } else {
      setPaymentSchedule(prev => [...prev, newPayment]);
    }

    // Save to database
    savePaymentSchedule([...paymentSchedule.filter(p => p.id !== editingPayment?.id), newPayment]);
    setShowPaymentModal(false);
  };

  const togglePaymentStatus = async (paymentId) => {
    let shouldRedirect = false;
    const updatedSchedule = paymentSchedule.map(p => {
      if (p.id === paymentId) {
        const nextStatus = p.status === 'paid' ? 'pending' : 'paid';
        if (nextStatus === 'paid') shouldRedirect = true;
        return { ...p, status: nextStatus };
      }
      return p;
    });

    setPaymentSchedule(updatedSchedule);

    // Save to database
    savePaymentSchedule(updatedSchedule);

    if (shouldRedirect) {
      Alert.alert(
        'Payment Received',
        'Would you like to upload an invoice PDF for this payment now?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Upload Invoice',
            onPress: () => setActiveTab('invoices')
          }
        ]
      );
    }
  };

  const deletePayment = (paymentId) => {
    const updated = paymentSchedule.filter(p => p.id !== paymentId);
    setPaymentSchedule(updated);
    savePaymentSchedule(updated);
  };

  // Save payment schedule to database
  const savePaymentSchedule = async (schedule) => {
    try {
      // Convert the schedule to match backend schema (remove 'id' field for DB)
      const formattedSchedule = schedule.map(payment => ({
        name: payment.name,
        amount: payment.amount,
        dueDate: payment.dueDate,
        status: payment.status || 'pending',
        createdAt: payment.createdAt || new Date().toISOString()
      }));

      await projectsAPI.updateProject(projectId, {
        paymentSchedule: formattedSchedule
      });

      console.log('✅ Payment schedule saved successfully');
    } catch (error) {
      console.error(' Error saving payment schedule:', error);
      Alert.alert('Error', 'Failed to save payment schedule. Please try again.');
    }
  };

  // Milestone functions
  const openMilestoneModal = (milestone = null) => {
    if (milestone) {
      setEditingMilestone(milestone);
      setMilestoneForm({
        name: milestone.title || milestone.name,
        description: milestone.description || '',
        status: milestone.status || 'pending',
      });
    } else {
      setEditingMilestone(null);
      setMilestoneForm({ name: '', description: '', status: 'pending' });
    }
    setShowMilestoneModal(true);
  };

  const saveMilestone = () => {
    if (!milestoneForm.name) {
      Platform.OS === 'web' ? alert('Please fill milestone title') : Alert.alert('Error', 'Please fill milestone title');
      return;
    }

    const newMilestone = {
      id: editingMilestone?.id || Date.now(),
      title: milestoneForm.name,
      description: milestoneForm.description,
      status: milestoneForm.status,
    };

    if (editingMilestone) {
      setMilestones(prev => prev.map(m => m.id === editingMilestone.id ? newMilestone : m));
    } else {
      setMilestones(prev => [...prev, newMilestone]);
    }
    setShowMilestoneModal(false);
  };

  const toggleMilestoneStatus = (milestoneId) => {
    setMilestones(prev => prev.map(m => {
      if (m.id === milestoneId) {
        let nextStatus = 'pending';
        if (m.status === 'pending') nextStatus = 'in-progress';
        else if (m.status === 'in-progress') nextStatus = 'completed';
        return { ...m, status: nextStatus };
      }
      return m;
    }));
  };

  const deleteMilestone = (milestoneId) => {
    setMilestones(prev => prev.filter(m => m.id !== milestoneId));
  };

  // Project edit functions
  const openEditModal = () => {
    setEditForm({
      title: project?.title || '',
      budget: String(project?.budget?.estimated || ''),
      startDate: project?.timeline?.startDate || '',
      endDate: project?.timeline?.expectedEndDate || project?.timeline?.endDate || '',
    });
    setShowEditModal(true);
  };

  const saveProject = async () => {
    try {
      setSaving(true);
      const updateData = {
        title: editForm.title,
        budget: { estimated: parseFloat(editForm.budget) || 0 },
        timeline: {
          ...project?.timeline,
          startDate: editForm.startDate || undefined,
          expectedEndDate: editForm.endDate || undefined,
          milestones: milestones
        },
        paymentSchedule: paymentSchedule,
      };

      const response = await projectsAPI.updateProject(projectId, updateData);
      if (response.success) {
        setProject(response.data.project);
        setShowEditModal(false);
        Platform.OS === 'web' ? alert('Project updated!') : Alert.alert('Success', 'Project updated!');
      }
    } catch (error) {
      console.error('Error updating project:', error);
      Platform.OS === 'web' ? alert('Failed to update') : Alert.alert('Error', 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = () => {
    const performDelete = async () => {
      try {
        setLoading(true);
        const response = await projectsAPI.deleteProject(projectId);
        if (response.success) {
          Platform.OS === 'web' ? alert('Project deleted successfully') : Alert.alert('Success', 'Project deleted successfully');
          navigation.navigate('ProjectList');
        } else {
          Platform.OS === 'web' ? alert('Failed to delete project') : Alert.alert('Error', 'Failed to delete project');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
        Platform.OS === 'web' ? alert('Error deleting project') : Alert.alert('Error', 'Error deleting project');
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Delete Project',
        'Are you sure you want to delete this project? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete },
        ]
      );
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planning: COLORS.warning,
      'in-progress': COLORS.primary,
      'on-hold': COLORS.textMuted,
      completed: COLORS.success,
      cancelled: COLORS.danger,
    };
    return colors[status] || COLORS.textMuted;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading project...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.errorContainer}>
        <Feather name="alert-circle" size={64} color={COLORS.danger} />
        <Text style={styles.errorText}>Project not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[COLORS.background, COLORS.background, COLORS.background]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.headerActionBtn, { marginRight: 12 }]}
                onPress={openEditModal}
              >
                <Feather name="edit-2" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                onPress={handleDeleteProject}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="trash-2" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.projectTitle}>{project.title}</Text>

          {/* Project ID */}
          {project.projectId && (
            <Text style={styles.projectIdText}>ID: {project.projectId}</Text>
          )}

          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(project.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(project.status) }]}>
              {project.status?.replace('-', ' ').toUpperCase()}
            </Text>
          </View>

          {/* Client Info */}
          {project.client && (
            <TouchableOpacity
              style={styles.clientInfo}
              onPress={() => navigation.navigate('ClientProfile', { clientId: project.client._id })}
            >
              <Feather name="user" size={14} color={COLORS.textMuted} />
              <Text style={styles.clientName}>
                {project.client.firstName} {project.client.lastName}
              </Text>
              <Feather name="chevron-right" size={12} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'Overview' && <OverviewTab project={project} />}
          {activeTab === 'Files' && (
            <FilesTab
              projectId={projectId}
              onUploadSuccess={loadProject}
            />
          )}
          {activeTab === 'Payments' && (
            <PaymentsTab
              paymentSchedule={paymentSchedule}
              onAdd={() => openPaymentModal()}
              onEdit={openPaymentModal}
              onToggle={togglePaymentStatus}
              onDelete={deletePayment}
            />
          )}
          {activeTab === 'Schedule' && <ScheduleTab projectId={projectId} />}
          {activeTab === 'Invoices' && <InvoicesListTab projectId={projectId} navigation={navigation} />}
          {activeTab === 'Team' && <TeamTab project={project} navigation={navigation} onRefresh={loadProject} currentUser={user} />}
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="projects" />

      {/* Payment Edit Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingPayment ? 'Edit Payment' : 'Add Payment'}</Text>

            <Text style={styles.modalLabel}>Payment Name</Text>
            <TextInput
              style={styles.modalInput}
              value={paymentForm.name}
              onChangeText={(v) => setPaymentForm(prev => ({ ...prev, name: v }))}
              placeholder="e.g. Advance Payment"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Amount</Text>
            <TextInput
              style={styles.modalInput}
              value={paymentForm.amount}
              onChangeText={(v) => setPaymentForm(prev => ({ ...prev, amount: v }))}
              placeholder="Enter amount"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Due Date</Text>
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: paymentForm.dueDate ? COLORS.text : COLORS.textMuted }}>
                  {paymentForm.dueDate ? new Date(paymentForm.dueDate).toLocaleDateString() : 'Select Date'}
                </Text>
                <Feather name="calendar" size={18} color={COLORS.primary} />
              </View>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={paymentForm.dueDate ? new Date(paymentForm.dueDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setPaymentForm(prev => ({ ...prev, dueDate: selectedDate.toISOString() }));
                  }
                }}
              />
            )}

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusToggle}>
              <TouchableOpacity
                style={[styles.statusBtn, paymentForm.status === 'pending' && styles.statusBtnActive]}
                onPress={() => setPaymentForm(prev => ({ ...prev, status: 'pending' }))}
              >
                <Text style={styles.statusBtnText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, paymentForm.status === 'paid' && styles.statusBtnActivePaid]}
                onPress={() => setPaymentForm(prev => ({ ...prev, status: 'paid' }))}
              >
                <Text style={styles.statusBtnText}>Paid</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={savePayment}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Milestone Edit Modal */}
      <Modal visible={showMilestoneModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingMilestone ? 'Edit Milestone' : 'Add Milestone'}</Text>

            <Text style={styles.modalLabel}>Milestone Name</Text>
            <TextInput
              style={styles.modalInput}
              value={milestoneForm.name}
              onChangeText={(v) => setMilestoneForm(prev => ({ ...prev, name: v }))}
              placeholder="e.g. Concept Design"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={milestoneForm.description}
              onChangeText={(v) => setMilestoneForm(prev => ({ ...prev, description: v }))}
              placeholder="Explain the objectives..."
              placeholderTextColor={COLORS.textMuted}
              multiline
            />

            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.statusToggle}>
              <TouchableOpacity
                style={[styles.statusBtn, milestoneForm.status === 'pending' && styles.statusBtnActive]}
                onPress={() => setMilestoneForm(prev => ({ ...prev, status: 'pending' }))}
              >
                <Text style={styles.statusBtnText}>Pending</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, milestoneForm.status === 'in-progress' && styles.statusBtnActive]}
                onPress={() => setMilestoneForm(prev => ({ ...prev, status: 'in-progress' }))}
              >
                <Text style={styles.statusBtnText}>In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusBtn, milestoneForm.status === 'completed' && styles.statusBtnActivePaid]}
                onPress={() => setMilestoneForm(prev => ({ ...prev, status: 'completed' }))}
              >
                <Text style={styles.statusBtnText}>Completed</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowMilestoneModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveMilestone}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Project</Text>

            <Text style={styles.modalLabel}>Project Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.title}
              onChangeText={(v) => setEditForm(prev => ({ ...prev, title: v }))}
              placeholder="Project name"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalLabel}>Budget</Text>
            <TextInput
              style={styles.modalInput}
              value={editForm.budget}
              onChangeText={(v) => setEditForm(prev => ({ ...prev, budget: v }))}
              placeholder="Enter budget"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.modalLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: editForm.startDate ? COLORS.text : COLORS.textMuted }}>
                  {editForm.startDate ? new Date(editForm.startDate).toLocaleDateString() : 'Select Start Date'}
                </Text>
                <Feather name="calendar" size={18} color={COLORS.success} />
              </View>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={editForm.startDate ? new Date(editForm.startDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setEditForm(prev => ({ ...prev, startDate: selectedDate.toISOString() }));
                  }
                }}
              />
            )}

            <Text style={styles.modalLabel}>Expected End Date</Text>
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => setShowProjectDatePicker(true)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: editForm.endDate ? COLORS.text : COLORS.textMuted }}>
                  {editForm.endDate ? new Date(editForm.endDate).toLocaleDateString() : 'Select End Date'}
                </Text>
                <Feather name="calendar" size={18} color={COLORS.primary} />
              </View>
            </TouchableOpacity>

            {showProjectDatePicker && (
              <DateTimePicker
                value={editForm.endDate ? new Date(editForm.endDate) : new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowProjectDatePicker(false);
                  if (selectedDate) {
                    setEditForm(prev => ({ ...prev, endDate: selectedDate.toISOString() }));
                  }
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveProject} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View >
  );
};

// Milestones Tab
const MilestonesTab = ({ milestones, onAdd, onEdit, onToggle, onDelete }) => (
  <View style={styles.tabContainer}>
    <View style={styles.paymentHeaderRow}>
      <Text style={styles.sectionLabel}>Project Milestones</Text>
      <TouchableOpacity style={styles.addPaymentBtn} onPress={onAdd}>
        <Feather name="plus" size={16} color="#1F2937" />
        <Text style={styles.addPaymentText}>Add</Text>
      </TouchableOpacity>
    </View>

    {milestones.length === 0 ? (
      <View style={styles.emptyPayments}>
        <Feather name="map-pin" size={40} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No milestones added yet</Text>
        <Text style={styles.emptySubtext}>Tap "Add" to define project phases</Text>
      </View>
    ) : (
      milestones.map((ms, index) => (
        <View key={ms.id || index} style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <View style={[styles.paymentNumberCircle, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={[styles.paymentNumber, { color: COLORS.primary }]}>{index + 1}</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>{ms.title || ms.name}</Text>
              <Text style={styles.paymentDue} numberOfLines={1}>
                {ms.description || 'No description'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.paymentStatusBadge,
                {
                  backgroundColor: ms.status === 'completed' ? 'rgba(56,142,60,0.15)' :
                    ms.status === 'in-progress' ? 'rgba(184,134,11,0.15)' :
                      'rgba(102,102,102,0.15)'
                }
              ]}
              onPress={() => onToggle(ms.id)}
            >
              <Text style={[
                styles.paymentStatusText,
                {
                  color: ms.status === 'completed' ? COLORS.success :
                    ms.status === 'in-progress' ? COLORS.primary :
                      COLORS.textMuted
                }
              ]}>
                {ms.status?.toUpperCase() || 'PENDING'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentActions}>
            <TouchableOpacity style={styles.paymentEditBtn} onPress={() => onEdit(ms)}>
              <Feather name="edit-2" size={14} color={COLORS.primary} />
              <Text style={styles.paymentEditText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentDeleteBtn} onPress={() => onDelete(ms.id)}>
              <Feather name="trash-2" size={14} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))
    )}
  </View>
);

// Payment Schedule Tab
const PaymentsTab = ({ paymentSchedule, onAdd, onEdit, onToggle, onDelete }) => (
  <View style={styles.tabContainer}>
    <View style={styles.paymentHeaderRow}>
      <Text style={styles.sectionLabel}>Payment Schedule</Text>
      <TouchableOpacity style={styles.addPaymentBtn} onPress={onAdd}>
        <Feather name="plus" size={16} color="#1F2937" />
        <Text style={styles.addPaymentText}>Add</Text>
      </TouchableOpacity>
    </View>

    {paymentSchedule.length === 0 ? (
      <View style={styles.emptyPayments}>
        <Feather name="credit-card" size={40} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No payments added yet</Text>
        <Text style={styles.emptySubtext}>Tap "Add" to create payment schedule</Text>
      </View>
    ) : (
      paymentSchedule.map((payment, index) => (
        <View key={payment.id || index} style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentNumberCircle}>
              <Text style={styles.paymentNumber}>{index + 1}</Text>
            </View>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentName}>{payment.name}</Text>
              <Text style={styles.paymentDue}>
                Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.paymentStatusBadge,
                { backgroundColor: payment.status === 'paid' ? 'rgba(0,200,83,0.15)' : 'rgba(255,179,0,0.15)' }
              ]}
              onPress={() => onToggle(payment.id)}
            >
              <Text style={[
                styles.paymentStatusText,
                { color: payment.status === 'paid' ? COLORS.success : COLORS.warning }
              ]}>
                {payment.status === 'paid' ? 'PAID ✓' : 'PENDING'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.paymentAmount}>
            <Text style={styles.paymentAmountValue}>
              ₹{(payment.amount || 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.paymentActions}>
            <TouchableOpacity style={styles.paymentEditBtn} onPress={() => onEdit(payment)}>
              <Feather name="edit-2" size={14} color={COLORS.primary} />
              <Text style={styles.paymentEditText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentDeleteBtn} onPress={() => onDelete(payment.id)}>
              <Feather name="trash-2" size={14} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))
    )}

    {paymentSchedule.length > 0 && (
      <View style={styles.paymentSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Budget</Text>
          <Text style={styles.summaryValue}>
            ₹{paymentSchedule.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Paid</Text>
          <Text style={[styles.summaryValue, { color: COLORS.success }]}>
            ₹{paymentSchedule.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Remaining</Text>
          <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
            ₹{paymentSchedule.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </Text>
        </View>
      </View>
    )}
  </View>
);

// Tab Components
const OverviewTab = ({ project }) => (
  <View style={styles.tabContainer}>
    <Text style={styles.sectionLabel}>Description</Text>
    <Text style={styles.description}>
      {project.description || 'No description available'}
    </Text>

    <View style={styles.statsGrid}>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          ₹{(project.budget?.estimated || 0).toLocaleString()}
        </Text>
        <Text style={styles.statLabel}>Budget</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statValue}>
          {new Date(project.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.statLabel}>Start Date</Text>
      </View>
    </View>

    {/* Location */}
    {project.location?.address && (
      <>
        <Text style={styles.sectionLabel}>Location</Text>
        <View style={styles.infoCard}>
          <Feather name="map-pin" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {project.location.address}, {project.location.city}, {project.location.state}
          </Text>
        </View>
      </>
    )}
  </View>
);

const InvoicesTab = ({ projectId, navigation }) => (
  <View style={styles.tabContainer}>
    <View style={styles.centeredContent}>
      <Feather name="file-text" size={48} color={COLORS.primary} />
      <Text style={styles.placeholderTitle}>Project Invoices</Text>
      <Text style={styles.placeholderText}>Manage invoices for this project</Text>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('CreateInvoice', { projectId })}
      >
        <Feather name="plus" size={20} color={COLORS.background} />
        <Text style={styles.actionButtonText}>Create Invoice</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.secondaryButton]}
        onPress={() => navigation.navigate('ViewInvoices', { projectId })}
      >
        <Feather name="eye" size={20} color={COLORS.primary} />
        <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>View Invoices</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const FilesTab = ({ projectId, onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      // Fetch ONLY documents, exclude invoices
      const response = await filesAPI.getFiles({ projectId, category: 'documents' });
      if (response.success) {
        setFiles(response.data.files || []);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setSelectedFile(file);
        setFileName(file.name || '');
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (fileAsset) => {
    try {
      setUploading(true);

      if (!fileAsset) {
        throw new Error('No file selected');
      }

      const formData = new FormData();
      const desiredName = (fileName || fileAsset.name || 'upload').trim();

      if (Platform.OS === 'web') {
        // Expo DocumentPicker on web provides `file` (File). Prefer that.
        if (fileAsset.file instanceof File) {
          const f = fileAsset.file;
          const fileToSend = desiredName && desiredName !== f.name
            ? new File([f], desiredName, { type: f.type || fileAsset.mimeType || 'application/octet-stream' })
            : f;
          formData.append('file', fileToSend);
        } else if (fileAsset.uri) {
          // Fallback: fetch the blob URL/data URL
          const response = await fetch(fileAsset.uri);
          const blob = await response.blob();
          const fileToSend = new File(
            [blob],
            desiredName,
            { type: fileAsset.mimeType || blob.type || 'application/octet-stream' }
          );
          formData.append('file', fileToSend);
        } else {
          throw new Error('Selected file is missing a web file handle');
        }
      } else {
        // On Native, use the {uri, name, type} object
        const fileToUpload = {
          uri: Platform.OS === 'ios' ? fileAsset.uri.replace('file://', '') : fileAsset.uri,
          name: desiredName || 'upload.pdf',
          type: fileAsset.mimeType || 'application/octet-stream',
        };
        formData.append('file', fileToUpload);
      }
      formData.append('projectId', projectId);
      formData.append('category', 'documents');

      const response = await filesAPI.uploadFile(formData);

      if (response.success) {
        Alert.alert('Success', 'File uploaded to Cloud successfully!');
        setShowModal(false);
        setSelectedFile(null);
        setFileName('');
        loadFiles();
        if (onUploadSuccess) onUploadSuccess();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', error.message || 'Could not upload file to Cloud');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (url) => {
    if (!url) {
      Alert.alert('Error', 'No document link available');
      return;
    }
    Linking.openURL(url).catch(err => {
      console.error('Link Error:', err);
      Alert.alert('Error', 'Could not open the file link');
    });
  };

  const handleDeleteFile = (fileId, fileName) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await filesAPI.deleteFile(fileId);
              Alert.alert('Success', 'File deleted successfully');
              loadFiles();
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', 'Failed to delete file');
            }
          }
        }
      ]
    );
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={styles.tabContainer}>
      {/* Header - only show when files exist */}
      {files.length > 0 && (
        <View style={styles.paymentHeaderRow}>
          <Text style={styles.sectionLabel}>Project Documents</Text>
          <TouchableOpacity
            style={[styles.addPaymentBtn, uploading && { opacity: 0.6 }]}
            onPress={handlePickDocument}
            disabled={uploading}
          >
            <Feather name="plus" size={16} color="#1F2937" />
            <Text style={styles.addPaymentText}>Add File</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload Form Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Document</Text>

            <Text style={styles.modalLabel}>File Name</Text>
            <TextInput
              style={styles.modalInput}
              value={fileName}
              onChangeText={setFileName}
              placeholder="Enter file name"
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setShowModal(false);
                  setSelectedFile(null);
                  setFileName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, (uploading || !fileName.trim()) && { opacity: 0.6 }]}
                onPress={() => uploadFile(selectedFile)}
                disabled={uploading || !fileName.trim()}
              >
                {uploading ? (
                  <ActivityIndicator color="#1F2937" />
                ) : (
                  <Text style={styles.modalSaveText}>Upload to Cloud</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && files.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : files.length === 0 ? (
        <View style={styles.centeredContent}>
          <Feather name="upload-cloud" size={64} color={COLORS.primary} />
          <Text style={styles.placeholderTitle}>No Documents Yet</Text>
          <Text style={styles.placeholderText}>Upload project documents to secure cloud storage</Text>

          <TouchableOpacity
            style={[styles.actionButton, uploading && { opacity: 0.6 }]}
            onPress={handlePickDocument}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#1F2937" />
            ) : (
              <>
                <Feather name="upload" size={20} color={COLORS.background} />
                <Text style={styles.actionButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        files.map((file) => (
          <View key={file._id} style={styles.infoCard}>
            <View style={styles.teamAvatar}>
              <Feather
                name={file.mimeType?.includes('image') ? 'image' : 'file-text'}
                size={20}
                color={COLORS.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamName} numberOfLines={1}>{file.originalName}</Text>
              <Text style={styles.teamRole}>{formatSize(file.size)} • {new Date(file.createdAt).toLocaleDateString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => handleDownload(file.url || file.path)}>
                <Feather name="external-link" size={18} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDownload(file.downloadUrl || file.path)}>
                <Feather name="download" size={18} color={COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteFile(file._id, file.originalName)}>
                <Feather name="trash-2" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const NotesTab = ({ projectId }) => (
  <View style={styles.tabContainer}>
    <View style={styles.centeredContent}>
      <Feather name="edit-3" size={48} color={COLORS.primary} />
      <Text style={styles.placeholderTitle}>Project Notes</Text>
      <Text style={styles.placeholderText}>Notes and observations will appear here</Text>
    </View>
  </View>
);

const TeamTab = ({ project, navigation, onRefresh, currentUser }) => {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Designer is the current user, executive is the assigned employee (different from designer)
  const designerEmployee = currentUser;
  const executiveEmployee = project.assignedEmployees?.find(
    emp => emp._id !== currentUser?._id && (emp.subRole === 'executiveTeam' || !emp.subRole)
  );
  const hasExecutive = !!executiveEmployee;

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await usersAPI.getUsersByRole('employee');
      if (response.data?.users) {
        // Filter only executive team employees
        const executiveEmployees = response.data.users.filter(
          emp => emp.subRole === 'executiveTeam' || !emp.subRole
        );
        setEmployees(executiveEmployees);
        setFilteredEmployees(executiveEmployees);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Filter employees based on search query
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredEmployees(employees);
      return;
    }
    const filtered = employees.filter(emp =>
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(query.toLowerCase()) ||
      emp.email.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  const handleAssignEmployee = async (employeeId) => {
    try {
      setAssigning(true);
      const response = await projectsAPI.assignEmployee(project._id, employeeId);
      if (response.success) {
        Platform.OS === 'web'
          ? alert('Executive assigned successfully!')
          : Alert.alert('Success', 'Executive assigned successfully!');
        setShowAssignModal(false);
        setSearchQuery('');
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error assigning employee:', error);
      Platform.OS === 'web'
        ? alert('Failed to assign executive')
        : Alert.alert('Error', 'Failed to assign executive');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveEmployee = async (employeeId) => {
    const doRemove = async () => {
      try {
        setRemoving(true);
        const response = await projectsAPI.unassignEmployee(project._id, employeeId);
        if (response.success) {
          Platform.OS === 'web'
            ? alert('Executive removed successfully!')
            : Alert.alert('Success', 'Executive removed successfully!');
          if (onRefresh) onRefresh();
        }
      } catch (error) {
        console.error('Error removing employee:', error);
        Platform.OS === 'web'
          ? alert('Failed to remove executive')
          : Alert.alert('Error', 'Failed to remove executive');
      } finally {
        setRemoving(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Remove this executive from the project?')) doRemove();
    } else {
      Alert.alert('Confirm', 'Remove this executive from the project?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  const openAssignModal = () => {
    loadEmployees();
    setSearchQuery('');
    setShowAssignModal(true);
  };

  return (
    <View style={styles.tabContainer}>
      {/* Designer Team - Current User */}
      <View style={styles.paymentHeaderRow}>
        <Text style={styles.sectionLabel}>Design Team</Text>
      </View>

      {designerEmployee && (
        <View style={styles.teamMember}>
          <View style={styles.teamAvatar}>
            <Feather name="user" size={20} color={COLORS.success} />
          </View>
          <View style={[styles.teamInfo, { flex: 1 }]}>
            <Text style={styles.teamName}>
              {designerEmployee.firstName} {designerEmployee.lastName}
              <Text style={{ color: COLORS.success, fontWeight: '700' }}> (You)</Text>
            </Text>
            <Text style={styles.teamRole}>{designerEmployee.subRole || 'Design Team'}</Text>
          </View>
        </View>
      )}

      {/* Executive Team - Assigned Executive */}
      <View style={[styles.paymentHeaderRow, { marginTop: 20 }]}>
        <Text style={styles.sectionLabel}>
          Executive Team {executiveEmployee ? '(1 max)' : ''}
        </Text>
        <TouchableOpacity style={styles.addPaymentBtn} onPress={openAssignModal}>
          <Feather name={executiveEmployee ? "edit-2" : "user-plus"} size={16} color="#1F2937" />
          <Text style={styles.addPaymentText}>{executiveEmployee ? 'Edit' : 'Assign'}</Text>
        </TouchableOpacity>
      </View>

      {executiveEmployee ? (
        <View style={styles.teamMember}>
          <View style={styles.teamAvatar}>
            <Feather name="user" size={20} color={COLORS.primary} />
          </View>
          <View style={[styles.teamInfo, { flex: 1 }]}>
            <Text style={styles.teamName}>
              {executiveEmployee.firstName} {executiveEmployee.lastName}
            </Text>
            <Text style={styles.teamRole}>{executiveEmployee.subRole || 'Executive Team'}</Text>
          </View>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={openAssignModal}
            disabled={assigning}
          >
            <Feather name="edit-2" size={18} color={COLORS.warning} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.centeredContent}>
          <Feather name="users" size={48} color={COLORS.textMuted} />
          <Text style={styles.placeholderTitle}>No Executive Assigned</Text>
          <Text style={styles.placeholderText}>Tap "Assign" to add ONE executive team member</Text>
        </View>
      )}

      {/* Assign Executive Modal */}
      <Modal visible={showAssignModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {hasExecutive ? 'Change Executive' : 'Assign Executive'}
            </Text>
            {hasExecutive && (
              <Text style={{ color: COLORS.warning, fontSize: 12, marginBottom: 10 }}>
                ⚠️ This will replace the current executive
              </Text>
            )}

            {/* Search Input */}
            <View style={[styles.modalInput, { flexDirection: 'row', alignItems: 'center' }]}>
              <Feather name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: COLORS.text }}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder="Search executives..."
                placeholderTextColor={COLORS.textMuted}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => handleSearch('')}>
                  <Feather name="x" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingEmployees ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : filteredEmployees.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 20 }}>
                <Feather name="users" size={40} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textMuted, marginTop: 10 }}>
                  {searchQuery ? 'No matching executives' : 'No available executives'}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {filteredEmployees.map((emp) => (
                  <TouchableOpacity
                    key={emp._id}
                    style={styles.teamMember}
                    onPress={() => handleAssignEmployee(emp._id)}
                    disabled={assigning}
                  >
                    <View style={styles.teamAvatar}>
                      <Feather name="user" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{emp.firstName} {emp.lastName}</Text>
                      <Text style={styles.teamRole}>{emp.email}</Text>
                    </View>
                    <Feather name="plus-circle" size={20} color={COLORS.success} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.modalCancelBtn, { marginTop: 16 }]}
              onPress={() => setShowAssignModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    color: COLORS.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.danger,
    marginTop: 20,
    marginBottom: 24,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  projectTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1F2937', // Dark text for better visibility on light background
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)', // Light gray badge background
    borderRadius: 20,
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: '#1F2937', // Dark text on active yellow tab
  },
  tabContent: {
    flex: 1,
  },
  tabContainer: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  secondaryButtonText: {
    color: COLORS.primary,
  },
  teamMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  teamAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  teamRole: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,82,82,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Payment styles
  paymentCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentNumberCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.background,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  paymentDue: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  paymentStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paymentAmount: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    alignItems: 'flex-end',
  },
  paymentAmountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentSummary: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Project ID
  projectIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  // Payment header row
  paymentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addPaymentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937', // Dark text on yellow
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  paymentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 12,
  },
  paymentEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentEditText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  paymentDeleteBtn: {
    padding: 4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937', // Dark title
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#F9FAFB', // Light input bg
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB', // Light button bg
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  statusBtnActive: {
    backgroundColor: 'rgba(255,179,0,0.2)',
    borderColor: COLORS.warning,
  },
  statusBtnActivePaid: {
    backgroundColor: 'rgba(0,200,83,0.2)',
    borderColor: COLORS.success,
  },
  statusBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6', // Light gray cancel button
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937', // Dark text on yellow save button
  },
});

export default ProjectDetailScreen;