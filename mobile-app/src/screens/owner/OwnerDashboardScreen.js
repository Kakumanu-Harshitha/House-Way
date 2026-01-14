import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../../services/api';
import { ordersAPI } from '../../services/ordersAPI';
import CommonHeader from '../../components/CommonHeader';

const { width } = Dimensions.get('window');

const OwnerDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentTab, setPaymentTab] = useState('overdue'); // 'all', 'overdue', 'due'
  const [quotationTab, setQuotationTab] = useState('new'); // 'new', 'pending', 'all'
  
  // Data State
  const [receivables, setReceivables] = useState([]);
  const [payables, setPayables] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [allOrders, setAllOrders] = useState([]); // For vendor order updates
  const [materialRequests, setMaterialRequests] = useState([]);
  const [teamStats, setTeamStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [stats, setStats] = useState({ onTrack: 0, atRisk: 0, delayed: 0 });

  // Modal States
  const [addUserVisible, setAddUserVisible] = useState(false);
  const [addProjectVisible, setAddProjectVisible] = useState(false);
  const [quotationDetailVisible, setQuotationDetailVisible] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[Dashboard] 🔄 Starting data fetch...');
      
      const results = await Promise.allSettled([
        api.getReceivables(),
        api.getPayables(),
        // Backend defaults to `limit=10` for lists; dashboard needs full-ish datasets.
        api.getProjects({ limit: 1000 }),
        api.getUsers('client'),
        ordersAPI.getOrders(),
        api.getMaterialRequests({ limit: 1000 }),
        api.getTeamStats(),
        api.getRecentActivity()
      ]);

      const [recResult, payResult, projResult, clientResult, ordersResult, mrResult, teamResult, activityResult] = results;

      // Extract values or defaults
      const recData = recResult.status === 'fulfilled' ? recResult.value : [];
      const payData = payResult.status === 'fulfilled' ? payResult.value : [];
      const projData = projResult.status === 'fulfilled' ? projResult.value : [];
      const clientData = clientResult.status === 'fulfilled' ? clientResult.value : [];
      const ordersResponse = ordersResult.status === 'fulfilled' ? ordersResult.value : { success: false };
      const mrData = mrResult.status === 'fulfilled' ? mrResult.value : [];
      const teamData = teamResult.status === 'fulfilled' ? teamResult.value : {};
      const activityData = activityResult.status === 'fulfilled' ? activityResult.value : [];

      // Log any rejected promises
      if (recResult.status === 'rejected') console.error('[Dashboard] ⚠️  getReceivables failed:', recResult.reason);
      if (payResult.status === 'rejected') console.error('[Dashboard] ⚠️  getPayables failed:', payResult.reason);
      if (projResult.status === 'rejected') console.error('[Dashboard] ⚠️  getProjects failed:', projResult.reason);
      if (clientResult.status === 'rejected') console.error('[Dashboard] ⚠️  getUsers failed:', clientResult.reason);
      if (ordersResult.status === 'rejected') console.error('[Dashboard] ⚠️  getOrders failed:', ordersResult.reason);
      if (mrResult.status === 'rejected') console.error('[Dashboard] ⚠️  getMaterialRequests failed:', mrResult.reason);
      if (teamResult.status === 'rejected') console.error('[Dashboard] ⚠️  getTeamStats failed:', teamResult.reason);
      if (activityResult.status === 'rejected') console.error('[Dashboard] ⚠️  getRecentActivity failed:', activityResult.reason);

      console.log('[Dashboard] 📊 Data received:');
      console.log('  - Receivables:', Array.isArray(recData) ? recData.length : 0);
      console.log('  - Payables:', Array.isArray(payData) ? payData.length : 0);
      console.log('  - Projects:', Array.isArray(projData) ? projData.length : 0);
      console.log('  - Clients:', Array.isArray(clientData) ? clientData.length : 0);
      console.log('  - Orders response:', ordersResponse?.success ? 'success' : 'failed');
      console.log('  - Material Requests:', Array.isArray(mrData) ? mrData.length : 0);

      // Get ALL orders for order status updates section
      let allOrdersData = [];
      let purchaseOrders = [];
      if (ordersResponse && ordersResponse.success && ordersResponse.data) {
        // Handle both formats: direct array or nested in purchaseOrders field
        const ordersData = Array.isArray(ordersResponse.data) 
          ? ordersResponse.data 
          : (ordersResponse.data.purchaseOrders || []);
        console.log('[Dashboard] 📦 Raw orders:', ordersData.length);
        
        // Store ALL orders for status updates
        allOrdersData = ordersData;
        
        // Filter to show orders for quotation section
        purchaseOrders = ordersData.filter(o => {
          return o && (o.status === 'sent' || o.status === 'in_negotiation');
        });
        console.log('[Dashboard] ✅ Filtered purchase orders for quotation section:', purchaseOrders.length);
      } else {
        console.log('[Dashboard] ❌ No orders data received');
      }

      setReceivables(Array.isArray(recData) ? recData : []);
      setPayables(Array.isArray(payData) ? payData : []);
      setProjects(Array.isArray(projData) ? projData : []);
      setClients(Array.isArray(clientData) ? clientData : []);
      setQuotations(purchaseOrders);
      setAllOrders(allOrdersData);
      setMaterialRequests(Array.isArray(mrData) ? mrData : []);
      setTeamStats(teamData || {});
      setRecentActivity(Array.isArray(activityData) ? activityData : []);
      
      // Calculate project health stats
      const safeProjects = Array.isArray(projData) ? projData : [];
      const now = new Date();
      const isActiveProject = (p) => p && !['completed', 'cancelled'].includes(p.status);
      const isDelayed = (p) => {
        const expectedEnd = p?.timeline?.expectedEndDate;
        if (!expectedEnd) return false;
        const expectedEndDate = new Date(expectedEnd);
        return isActiveProject(p) && !Number.isNaN(expectedEndDate.getTime()) && expectedEndDate < now;
      };
      const isAtRisk = (p) => isActiveProject(p) && ['high', 'urgent'].includes(p.priority);

      const delayed = safeProjects.filter(isDelayed).length;
      const atRisk = safeProjects.filter(isAtRisk).length;
      const onTrack = safeProjects.filter(p => isActiveProject(p) && !isDelayed(p) && !isAtRisk(p)).length;
      setStats({ onTrack, atRisk, delayed });
      
      console.log('[Dashboard] ✅ Data fetch completed successfully');

    } catch (error) {
      console.error("[Dashboard] ❌ Error fetching dashboard data:", error);
      console.error("[Dashboard] Error stack:", error.stack);
      Alert.alert('Error', `Failed to load dashboard data: ${error.message}`);
      setReceivables([]);
      setPayables([]);
      setProjects([]);
      setClients([]);
      setQuotations([]);
      setAllOrders([]);
      setMaterialRequests([]);
      setTeamStats({});
      setRecentActivity([]);
      setStats({ onTrack: 0, atRisk: 0, delayed: 0 });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().then(() => setRefreshing(false));
  }, []);

  // === MODALS ===

  const AddUserModal = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
      firstName: '', lastName: '', email: '', role: 'employee',
      username: '', password: '', projects: [], department: ''
    });

    const handleNext = () => {
      if (step < 3) setStep(step + 1);
      else handleSubmit();
    };

    const handleSubmit = async () => {
      try {
        await api.createUser(formData);
        Alert.alert("Success", "User created successfully!");
        setAddUserVisible(false);
        onRefresh();
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to create user");
      }
    };

    return (
      <Modal visible={addUserVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New User</Text>
              <TouchableOpacity onPress={() => setAddUserVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.stepIndicator}>
              <View style={[styles.stepDot, step >= 1 && styles.activeDot]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step >= 2 && styles.activeDot]} />
              <View style={styles.stepLine} />
              <View style={[styles.stepDot, step >= 3 && styles.activeDot]} />
            </View>
            <Text style={styles.stepText}>Step {step} of 3</Text>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {step === 1 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>👤 BASIC DETAILS</Text>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.firstName}
                    onChangeText={t => setFormData({...formData, firstName: t})}
                    placeholder="John"
                  />
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.lastName}
                    onChangeText={t => setFormData({...formData, lastName: t})}
                    placeholder="Doe"
                  />
                  <Text style={styles.inputLabel}>Email Address *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.email}
                    onChangeText={t => setFormData({...formData, email: t})}
                    placeholder="john@example.com"
                    keyboardType="email-address"
                  />
                  <Text style={styles.inputLabel}>Role *</Text>
                  <View style={styles.roleContainer}>
                    {['owner', 'employee', 'vendor', 'client'].map(r => (
                      <TouchableOpacity 
                        key={r} 
                        style={[styles.roleBtn, formData.role === r && styles.activeRoleBtn]}
                        onPress={() => setFormData({...formData, role: r})}
                      >
                        <Text style={[styles.roleText, formData.role === r && styles.activeRoleText]}>
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {step === 2 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>🔐 CREDENTIALS & ACCESS</Text>
                  <Text style={styles.inputLabel}>Username *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.username}
                    onChangeText={t => setFormData({...formData, username: t})}
                  />
                  <Text style={styles.inputLabel}>Temporary Password *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.password}
                    onChangeText={t => setFormData({...formData, password: t})}
                    secureTextEntry
                  />
                  <View style={styles.permissionBox}>
                    <Text style={styles.permTitle}>Permissions based on {formData.role}:</Text>
                    <Text style={styles.permItem}>✓ View assigned projects</Text>
                    <Text style={styles.permItem}>✓ Create material requests</Text>
                    <Text style={styles.permItem}>✓ View own invoices</Text>
                    <Text style={styles.permItem}>✗ Approve quotations</Text>
                    <Text style={styles.permItem}>✗ Delete projects</Text>
                  </View>
                </>
              )}

              {step === 3 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>🏗️ ASSIGN PROJECTS</Text>
                  <Text style={styles.subText}>Select existing projects to assign:</Text>
                  {projects.slice(0, 5).map(p => (
                    <TouchableOpacity 
                      key={p._id} 
                      style={styles.projectSelectRow}
                      onPress={() => {
                        const current = formData.projects;
                        if (current.includes(p._id)) {
                          setFormData({...formData, projects: current.filter(id => id !== p._id)});
                        } else {
                          setFormData({...formData, projects: [...current, p._id]});
                        }
                      }}
                    >
                      <Ionicons 
                        name={formData.projects.includes(p._id) ? "checkbox" : "square-outline"} 
                        size={24} 
                        color="#333" 
                      />
                      <Text style={styles.projectSelectText}>{p.title}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {step > 1 && (
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{step === 3 ? 'Create User' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const AddProjectModal = () => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
      title: '', code: '', type: 'residential', budget: '', client: '', 
      startDate: '', endDate: ''
    });

    const handleNext = () => {
      if (step < 4) setStep(step + 1);
      else handleSubmit();
    };

    const handleSubmit = async () => {
      try {
        await api.createProject(formData);
        Alert.alert("Success", "Project created successfully!");
        setAddProjectVisible(false);
        onRefresh();
      } catch (e) {
        Alert.alert("Error", "Failed to create project");
      }
    };

    return (
      <Modal visible={addProjectVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Project</Text>
              <TouchableOpacity onPress={() => setAddProjectVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.stepIndicator}>
              {[1, 2, 3, 4].map(i => (
                <React.Fragment key={i}>
                  <View style={[styles.stepDot, step >= i && styles.activeDot]} />
                  {i < 4 && <View style={styles.stepLine} />}
                </React.Fragment>
              ))}
            </View>
            <Text style={styles.stepText}>Step {step} of 4</Text>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {step === 1 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>🏗️ PROJECT DETAILS</Text>
                  <Text style={styles.inputLabel}>Project Name *</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.title}
                    onChangeText={t => setFormData({...formData, title: t})}
                    placeholder="e.g. Villa Renovation"
                  />
                  <Text style={styles.inputLabel}>Project Code</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.code}
                    onChangeText={t => setFormData({...formData, code: t})}
                    placeholder="PRJ-001"
                  />
                  <Text style={styles.inputLabel}>Budget (₹)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.budget}
                    onChangeText={t => setFormData({...formData, budget: t})}
                    keyboardType="numeric"
                    placeholder="500000"
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>👤 CLIENT SELECTION</Text>
                  <Text style={styles.subText}>Select a client for this project:</Text>
                  {clients.slice(0, 5).map(c => (
                    <TouchableOpacity 
                      key={c._id} 
                      style={[styles.projectSelectRow, formData.client === c._id && { backgroundColor: '#f0f0f0' }]}
                      onPress={() => setFormData({...formData, client: c._id})}
                    >
                      <Ionicons 
                        name={formData.client === c._id ? "radio-button-on" : "radio-button-off"} 
                        size={24} 
                        color="#333" 
                      />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.projectSelectText}>{c.firstName} {c.lastName}</Text>
                        <Text style={{ fontSize: 12, color: '#666' }}>{c.email}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {step === 3 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>📅 TIMELINE</Text>
                  <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.startDate}
                    onChangeText={t => setFormData({...formData, startDate: t})}
                    placeholder="2024-01-01"
                  />
                  <Text style={styles.inputLabel}>Expected End Date (YYYY-MM-DD)</Text>
                  <TextInput 
                    style={styles.input} 
                    value={formData.endDate}
                    onChangeText={t => setFormData({...formData, endDate: t})}
                    placeholder="2024-12-31"
                  />
                </>
              )}
              {step === 4 && (
                <>
                  <Text style={styles.sectionHeaderTitle}>✅ REVIEW & CREATE</Text>
                  <View style={styles.permissionBox}>
                    <Text style={styles.permItem}><Text style={{fontWeight:'bold'}}>Title:</Text> {formData.title}</Text>
                    <Text style={styles.permItem}><Text style={{fontWeight:'bold'}}>Budget:</Text> ₹{formData.budget}</Text>
                    <Text style={styles.permItem}><Text style={{fontWeight:'bold'}}>Client ID:</Text> {formData.client || 'None'}</Text>
                    <Text style={styles.permItem}><Text style={{fontWeight:'bold'}}>Start:</Text> {formData.startDate}</Text>
                  </View>
                  <Text style={{ textAlign: 'center', marginTop: 20, color: '#666' }}>
                    Ready to launch this project?
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              {step > 1 && (
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{step === 4 ? 'Start Project' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const QuotationDetailModal = () => {
    if (!selectedQuotation) return null;

    const handleViewChat = () => {
      setQuotationDetailVisible(false);
      // Navigate to negotiation chat where admin can accept/reject quotations properly
      navigation.navigate('NegotiationChat', {
        orderId: selectedQuotation._id,
        orderNumber: selectedQuotation.quoteNumber || selectedQuotation.purchaseOrderNumber,
        userRole: 'owner',
      });
    };

    return (
      <Modal visible={quotationDetailVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quotation Details</Text>
              <TouchableOpacity onPress={() => setQuotationDetailVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quote Number:</Text>
                <Text style={styles.detailValue}>{selectedQuotation.quoteNumber || selectedQuotation.purchaseOrderNumber}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vendor:</Text>
                <Text style={styles.detailValue}>{selectedQuotation.vendorName || selectedQuotation.vendor?.vendorDetails?.companyName || 'Unknown Vendor'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Project:</Text>
                <Text style={styles.detailValue}>{selectedQuotation.projectName || selectedQuotation.project?.title || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { fontWeight: '600', color: selectedQuotation.status === 'in_negotiation' ? '#F59E0B' : '#3B82F6' }]}>
                  {selectedQuotation.status === 'in_negotiation' ? 'In Negotiation' : selectedQuotation.status === 'sent' ? 'New' : selectedQuotation.status}
                </Text>
              </View>
              {selectedQuotation.amount && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={[styles.detailValue, { fontWeight: 'bold', fontSize: 18 }]}>
                    ₹{selectedQuotation.amount?.toLocaleString() || '0'}
                  </Text>
                </View>
              )}
              {selectedQuotation.submittedHoursAgo && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submitted:</Text>
                  <Text style={styles.detailValue}>
                    {selectedQuotation.submittedHoursAgo} hours ago
                  </Text>
                </View>
              )}

              {selectedQuotation.items && selectedQuotation.items.length > 0 && (
                <>
                  <Text style={[styles.sectionHeaderTitle, { marginTop: 20 }]}>Items:</Text>
                  {selectedQuotation.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemText}>• {item.description || item.name}</Text>
                      <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                    </View>
                  ))}
                </>
              )}

              {selectedQuotation.attachments && selectedQuotation.attachments.length > 0 && (
                <View style={styles.attachmentSection}>
                  <Text style={styles.sectionHeaderTitle}>Attachments:</Text>
                  {selectedQuotation.attachments.map((att, idx) => (
                    <TouchableOpacity key={idx} style={styles.attachmentBtn}>
                      <Ionicons name="document-attach" size={20} color="#1976D2" />
                      <Text style={styles.attachmentText}>{typeof att === 'string' ? att : att.filename || 'Attachment'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#1976D2" />
                <Text style={styles.infoText}>
                  Open the negotiation chat to review, negotiate, and accept/reject quotations.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#6B7280', flex: 1, marginRight: 8 }]} onPress={() => setQuotationDetailVisible(false)}>
                <Text style={styles.nextBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nextBtn, { backgroundColor: '#1976D2', flex: 1 }]} onPress={handleViewChat}>
                <Text style={styles.nextBtnText}>💬 Open Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // === COMPONENTS ===

  const PaymentTrackerCard = () => {
    // Merge receivables and payables into one unified list
    const allPayments = [
      ...receivables.map(r => ({ ...r, paymentType: 'receivable' })),
      ...payables.map(p => ({ 
        ...p, 
        paymentType: 'payable',
        clientName: p.vendorName || 'Unknown Vendor', // Use vendor name for payables
        projectName: p.projectName || 'Vendor Payment'
      }))
    ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const filtered = allPayments.filter(item => {
      if (paymentTab === 'all') return true;
      
      const dueDate = new Date(item.dueDate);
      
      if (paymentTab === 'overdue') {
        return item.status === 'overdue' || (item.status === 'pending' && dueDate < today);
      }
      
      if (paymentTab === 'pending') {
        // "Due Soon" - Pending and due within next 7 days or already overdue but not marked yet
        return (item.status === 'pending' || item.status === 'sent') && dueDate <= nextWeek;
      }
      
      return item.status === paymentTab;
    });
    
    const displayItems = filtered.slice(0, 5); // Show more items on dashboard

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 PAYMENT TRACKER</Text>
        </View>

        <View style={styles.filterPillContainer}>
          <TouchableOpacity 
            onPress={() => setPaymentTab('all')} 
            style={[styles.filterPill, paymentTab === 'all' && styles.activePill]}
          >
            <Text style={[styles.pillText, paymentTab === 'all' && styles.activePillText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setPaymentTab('overdue')} 
            style={[styles.filterPill, paymentTab === 'overdue' && styles.activePill]}
          >
            <Text style={[styles.pillText, paymentTab === 'overdue' && styles.activePillText]}>⚠️ Overdue</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setPaymentTab('pending')} 
            style={[styles.filterPill, paymentTab === 'pending' && styles.activePill]}
          >
            <Text style={[styles.pillText, paymentTab === 'pending' && styles.activePillText]}>Due Soon</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContainer}>
          {loading ? (
            <ActivityIndicator color="#333" />
          ) : filtered.length === 0 ? (
            <Text style={styles.emptyText}>No {paymentTab} payments</Text>
          ) : (
            displayItems.map((item) => {
              const isOverdue = item.status === 'overdue' || (item.status === 'pending' && new Date(item.dueDate) < today);
              
              return (
                <View 
                  key={item._id} 
                  style={[
                    styles.paymentCard, 
                    isOverdue 
                      ? { borderLeftColor: '#D32F2F' } 
                      : { borderLeftColor: '#FBC02D' }
                  ]}
                >
                  <View style={styles.payHeader}>
                    <Text style={styles.payProject} numberOfLines={1}>
                      {item.paymentType === 'receivable' ? '📥' : '📤'} {item.projectName}
                    </Text>
                    {isOverdue ? (
                      <View style={styles.badgeLate}>
                        <Text style={styles.badgeLateText}>🔴 OVERDUE</Text>
                      </View>
                    ) : (
                      <View style={[styles.badgeLate, { backgroundColor: '#FFF8E1' }]}>
                        <Text style={[styles.badgeLateText, { color: '#FBC02D' }]}>🟡 PENDING</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.payClient}>
                    {item.paymentType === 'receivable' ? 'From:' : 'To:'} {item.clientName}
                  </Text>
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
                    <Text style={styles.payAmount}>₹{item.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.payActions}>
                    <TouchableOpacity 
                      style={styles.btnAction}
                      onPress={() => navigation.navigate('ProjectPayments', { projectId: item.projectId?._id || item.projectId })}
                    >
                      <Ionicons name="calendar" size={14} color="#333" />
                      <Text style={styles.btnActionText}>Schedule</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.btnActionSecondary}
                      onPress={() => {
                        if (item.isSchedule) {
                          navigation.navigate('CreateInvoice', { 
                            projectId: item.projectId?._id || item.projectId,
                            amount: item.amount,
                            installmentName: item.installmentName
                          });
                        } else {
                          // View existing invoice
                        }
                      }}
                    >
                      <Text style={styles.btnActionText}>
                        {item.isSchedule ? '📄 Invoice' : '👁️ View'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity 
            style={styles.viewAllBtn} 
            onPress={() => navigation.getParent()?.navigate('Finance')}
          >
            <Text style={styles.viewAllText}>View All Payments ({allPayments.length}) →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const QuickActions = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>⚡ QUICK ACTIONS</Text>
      <View style={styles.quickGrid}>
        <TouchableOpacity style={styles.quickCard} onPress={() => setAddUserVisible(true)}>
          <View style={styles.quickIconBg}>
            <FontAwesome5 name="user-plus" size={20} color="#000" />
          </View>
          <View>
            <Text style={styles.quickTitle}>ADD USER</Text>
            <Text style={styles.quickSub}>Create new{"\n"}team member</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickCard} onPress={() => setAddProjectVisible(true)}>
          <View style={styles.quickIconBg}>
            <FontAwesome5 name="hard-hat" size={20} color="#000" />
          </View>
          <View>
            <Text style={styles.quickTitle}>ADD PROJECT</Text>
            <Text style={styles.quickSub}>Start new{"\n"}project</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const QuotationsAndApprovals = () => {
    // For purchase orders: map status to display status
    const mappedQuotations = quotations.map(po => ({
      ...po,
      quoteNumber: po.purchaseOrderNumber,
      vendorName: po.vendor?.firstName || po.vendor?.vendorDetails?.companyName || 'Unknown',
      projectName: po.project?.title || 'Unknown',
      amount: po.totalAmount || 0,
      status: po.status === 'sent' ? 'new' : po.status, // Map 'sent' to 'new' for display
    }));
    
    const filteredQuotations = quotationTab === 'all' 
      ? mappedQuotations
      : mappedQuotations.filter(q => q.status === quotationTab);
    
    const newQuotations = filteredQuotations.filter(q => q.status === 'new').slice(0, 2);
    const pendingRequests = materialRequests.filter(mr => mr.status === 'pending').slice(0, 2);

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 QUOTATIONS & APPROVALS</Text>
        </View>

        <View style={styles.filterPillContainer}>
          <TouchableOpacity 
            onPress={() => setQuotationTab('new')} 
            style={[styles.filterPill, quotationTab === 'new' && styles.activePill]}
          >
            <Text style={[styles.pillText, quotationTab === 'new' && styles.activePillText]}>
              New ({mappedQuotations.filter(q => q.status === 'new').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setQuotationTab('in_negotiation')} 
            style={[styles.filterPill, quotationTab === 'in_negotiation' && styles.activePill]}
          >
            <Text style={[styles.pillText, quotationTab === 'in_negotiation' && styles.activePillText]}>
              Negotiating ({mappedQuotations.filter(q => q.status === 'in_negotiation').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setQuotationTab('all')} 
            style={[styles.filterPill, quotationTab === 'all' && styles.activePill]}
          >
            <Text style={[styles.pillText, quotationTab === 'all' && styles.activePillText]}>All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardContainer}>
          {newQuotations.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>🔔 NEW ORDERS ({mappedQuotations.filter(q => q.status === 'new').length})</Text>
              {newQuotations.map(q => (
                <TouchableOpacity 
                  key={q._id} 
                  style={styles.quotationCard}
                  onPress={() => navigation.navigate('NegotiationChat', {
                    orderId: q._id,
                    userRole: 'owner',
                  })}
                >
                  <Text style={styles.quoteNumber}>📦 {q.quoteNumber || 'N/A'}</Text>
                  <Text style={styles.quoteVendor}>Vendor: {q.vendorName || 'Unknown'}</Text>
                  <Text style={styles.quoteProject}>Project: {q.projectName || 'N/A'}</Text>
                  <Text style={styles.quoteAmount}>Amount: ₹{(q.amount || 0).toLocaleString()}</Text>
                  <Text style={[styles.quoteSubmitted, { color: '#FF9800' }]}>
                    ⏳ Awaiting quotation submission
                  </Text>
                  
                  <View style={styles.quoteActions}>
                    <TouchableOpacity 
                      style={[styles.btnAction, { backgroundColor: '#2196F3', flex: 1 }]}
                      onPress={() => navigation.navigate('NegotiationChat', {
                        orderId: q._id,
                        userRole: 'owner',
                      })}
                    >
                      <Text style={[styles.btnActionText, { color: '#fff' }]}>📝 View Order</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {filteredQuotations.filter(q => q.status === 'in_negotiation').length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>
                🤝 NEGOTIATING ({filteredQuotations.filter(q => q.status === 'in_negotiation').length})
              </Text>
              {filteredQuotations.filter(q => q.status === 'in_negotiation').slice(0, 2).map(q => (
                <TouchableOpacity 
                  key={q._id} 
                  style={styles.quotationCard}
                  onPress={() => navigation.navigate('NegotiationChat', {
                    orderId: q._id,
                    userRole: 'owner',
                  })}
                >
                  <Text style={styles.quoteNumber}>💬 {q.quoteNumber || 'N/A'}</Text>
                  <Text style={styles.quoteVendor}>Vendor: {q.vendorName || 'Unknown'}</Text>
                  <Text style={styles.quoteProject}>Project: {q.projectName || 'N/A'}</Text>
                  <Text style={styles.quoteAmount}>Amount: ₹{(q.amount || 0).toLocaleString()}</Text>
                  <Text style={[styles.quoteSubmitted, { color: '#FF9800' }]}>
                    🔄 In negotiation
                  </Text>
                  
                  <View style={styles.quoteActions}>
                    <TouchableOpacity 
                      style={[styles.btnAction, { backgroundColor: '#FF9800', flex: 1 }]}
                      onPress={() => navigation.navigate('NegotiationChat', {
                        orderId: q._id,
                        userRole: 'owner',
                      })}
                    >
                      <Text style={[styles.btnActionText, { color: '#fff' }]}>💬 Continue Chat</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {pendingRequests.length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>
                📌 MATERIAL REQUESTS ({materialRequests.filter(mr => mr.status === 'pending').length})
              </Text>
              {pendingRequests.map(mr => (
                <View key={mr._id} style={styles.quotationCard}>
                  <Text style={styles.quoteNumber}>📄 {mr.requestNumber || 'N/A'}</Text>
                  <Text style={styles.quoteProject}>Project: {mr.projectName || 'Unknown'}</Text>
                  <Text style={styles.quoteVendor}>Requested by: {mr.requestedByName || 'Unknown'}</Text>
                  <Text style={styles.quoteAmount}>Amount: ₹{(mr.amount || 0).toLocaleString()}</Text>
                  <Text style={[styles.quoteSubmitted, { color: '#D32F2F' }]}>
                    ⚠️ Pending {mr.pendingDays || 0} days
                  </Text>
                  
                  <View style={styles.quoteActions}>
                    <TouchableOpacity 
                      style={[styles.btnAction, { backgroundColor: '#4CAF50', flex: 1, marginRight: 6 }]}
                      onPress={async () => {
                        await api.approveMaterialRequest(mr._id);
                        Alert.alert("Success", "Material request approved");
                        onRefresh();
                      }}
                    >
                      <Text style={[styles.btnActionText, { color: '#fff' }]}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.btnAction, { backgroundColor: '#D32F2F', flex: 1 }]}
                      onPress={() => {
                        Alert.prompt("Reject", "Reason:", async (text) => {
                          await api.rejectMaterialRequest(mr._id, text);
                          Alert.alert("Rejected");
                          onRefresh();
                        });
                      }}
                    >
                      <Text style={[styles.btnActionText, { color: '#fff' }]}>✗ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {newQuotations.length === 0 && pendingRequests.length === 0 && filteredQuotations.filter(q => q.status === 'in_negotiation').length === 0 && (
            <View style={[styles.emptyState, { paddingVertical: 40 }]}>
              <Ionicons name="inbox" size={48} color="#CCC" style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { fontSize: 16, fontWeight: '500' }]}>All Set! ✅</Text>
              <Text style={[styles.emptyText, { fontSize: 13, color: '#999', marginTop: 4 }]}>
                No pending approvals or material requests
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All Quotations ({quotations.length}) →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const ProjectHealth = () => {
    const total = stats.onTrack + stats.atRisk + stats.delayed || 1;
    const onTrackPct = Math.round((stats.onTrack / total) * 100);
    const atRiskPct = Math.round((stats.atRisk / total) * 100);
    const delayedPct = Math.round((stats.delayed / total) * 100);

    const criticalProjects = projects.filter(p => p.priority === 'high').slice(0, 2);

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>📊 PROJECT HEALTH</Text>
        
        <View style={styles.healthRow}>
          <View style={styles.healthLabelRow}>
            <Text style={styles.hLabel}>🟢 ON TRACK ({stats.onTrack} projects)</Text>
            <Text style={styles.hPct}>{onTrackPct}%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${onTrackPct}%`, backgroundColor: '#4CAF50' }]} />
          </View>
        </View>

        <View style={styles.healthRow}>
          <View style={styles.healthLabelRow}>
            <Text style={styles.hLabel}>🟡 AT RISK ({stats.atRisk} projects)</Text>
            <Text style={styles.hPct}>{atRiskPct}%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${atRiskPct}%`, backgroundColor: '#FBC02D' }]} />
          </View>
        </View>

        <View style={styles.healthRow}>
          <View style={styles.healthLabelRow}>
            <Text style={styles.hLabel}>🔴 DELAYED ({stats.delayed} projects)</Text>
            <Text style={styles.hPct}>{delayedPct}%</Text>
          </View>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${delayedPct}%`, backgroundColor: '#D32F2F' }]} />
          </View>
        </View>

        {criticalProjects.length > 0 && (
          <>
            <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>Critical Projects:</Text>
            {criticalProjects.map(p => (
              <TouchableOpacity 
                key={p._id} 
                style={styles.criticalProjectCard}
                onPress={() => navigation.navigate('ProjectDetails', { projectId: p._id })}
              >
                <Text style={styles.criticalProjectTitle}>🔴 {p.title}</Text>
                <Text style={styles.criticalProjectSub}>High priority • {p.status}</Text>
                <Text style={styles.viewDetailsLink}>View Details →</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <TouchableOpacity 
          style={styles.viewAllBtn}
          onPress={() => navigation.getParent()?.navigate('Projects')}
        >
          <Text style={styles.viewAllText}>View All Projects ({projects.length}) →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const TeamAndResources = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>👥 TEAM & RESOURCES</Text>
      
      <View style={styles.teamStatsGrid}>
        <View style={styles.teamStatCard}>
          <Text style={styles.teamStatNumber}>{teamStats.totalEmployees || 0}</Text>
          <Text style={styles.teamStatLabel}>ACTIVE USERS</Text>
        </View>
        <View style={styles.teamStatCard}>
          <Text style={styles.teamStatNumber}>{teamStats.totalVendors || 0}</Text>
          <Text style={styles.teamStatLabel}>VENDORS</Text>
          {teamStats.pendingVendorApprovals > 0 && (
            <Text style={styles.teamStatSub}>{teamStats.pendingVendorApprovals} pending approval</Text>
          )}
        </View>
      </View>

      <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>Team Utilization:</Text>
      <View style={styles.barBg}>
        {(() => {
          const totalEmployees = Number(teamStats.totalEmployees) || 0;
          const assignedEmployeeIds = new Set(
            (projects || []).flatMap(p => (p?.assignedEmployees || []).map(e => (typeof e === 'string' ? e : e?._id))).filter(Boolean)
          );
          const assignedCount = assignedEmployeeIds.size;
          const utilizationRate = totalEmployees > 0 ? Math.round((assignedCount / totalEmployees) * 100) : 0;
          return (
            <View style={[styles.barFill, { width: `${utilizationRate}%`, backgroundColor: '#1976D2' }]} />
          );
        })()}
      </View>
      <Text style={styles.utilizationText}>
        {(() => {
          const totalEmployees = Number(teamStats.totalEmployees) || 0;
          const assignedEmployeeIds = new Set(
            (projects || []).flatMap(p => (p?.assignedEmployees || []).map(e => (typeof e === 'string' ? e : e?._id))).filter(Boolean)
          );
          const assignedCount = assignedEmployeeIds.size;
          return `${assignedCount} of ${totalEmployees} members assigned`;
        })()}
      </Text>

      <View style={styles.teamActionRow}>
        <TouchableOpacity 
          style={styles.teamActionBtn}
          onPress={() => navigation.getParent()?.navigate('Employees')}
        >
          <Text style={styles.teamActionText}>Manage Team →</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.teamActionBtn}
          onPress={() => navigation.getParent()?.navigate('Vendors')}
        >
          <Text style={styles.teamActionText}>Manage Vendors →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const RecentActivity = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>🕒 RECENT ACTIVITY</Text>
      
      {recentActivity.map((activity, index) => (
        <View key={activity._id || index} style={styles.timelineItem}>
          <Text style={styles.tDot}>{activity.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.tHead}>{activity.title}</Text>
            <Text style={styles.tSub}>{activity.subtitle}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.viewAllBtn}>
        <Text style={styles.viewAllText}>View All Activity →</Text>
      </TouchableOpacity>
    </View>
  );

  // Client Section - Shows client overview
  const ClientSection = () => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>👥 CLIENTS</Text>
      </View>
      
      <View style={styles.clientStatsRow}>
        <View style={styles.clientStatBox}>
          <Text style={styles.clientStatNumber}>{clients.length}</Text>
          <Text style={styles.clientStatLabel}>Total Clients</Text>
        </View>
        <View style={styles.clientStatBox}>
          <Text style={styles.clientStatNumber}>{projects.filter(p => p.status === 'in-progress').length}</Text>
          <Text style={styles.clientStatLabel}>Active Projects</Text>
        </View>
      </View>

      {clients.length > 0 ? (
        clients.slice(0, 3).map(client => (
          <TouchableOpacity 
            key={client._id} 
            style={styles.clientCard}
            onPress={() => navigation.navigate('Clients', { clientId: client._id })}
          >
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>
                {(client.firstName?.[0] || 'C').toUpperCase()}
              </Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>
                {client.firstName} {client.lastName}
              </Text>
              <Text style={styles.clientEmail}>{client.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.emptyText}>No clients yet</Text>
      )}

      <TouchableOpacity 
        style={styles.viewAllBtn}
        onPress={() => navigation.navigate('Clients')}
      >
        <Text style={styles.viewAllText}>Manage Clients ({clients.length}) →</Text>
      </TouchableOpacity>
    </View>
  );

  // Vendor Orders Updates - Shows status transitions
  const VendorOrdersUpdates = () => {
    const getStatusInfo = (status) => {
      switch (status) {
        case 'sent': return { icon: '📤', label: 'Sent to Vendor', color: '#2196F3' };
        case 'in_negotiation': return { icon: '💬', label: 'In Negotiation', color: '#FF9800' };
        case 'accepted': return { icon: '✅', label: 'Accepted', color: '#4CAF50' };
        case 'in_progress': return { icon: '🔧', label: 'In Progress', color: '#9C27B0' };
        case 'shipped': return { icon: '🚚', label: 'Shipped', color: '#00BCD4' };
        case 'delivered': return { icon: '📦', label: 'Delivered', color: '#8BC34A' };
        case 'completed': return { icon: '🏁', label: 'Completed', color: '#4CAF50' };
        default: return { icon: '📋', label: status, color: '#666' };
      }
    };

    // Sort orders by updatedAt (most recent first)
    const sortedOrders = [...allOrders].sort((a, b) => 
      new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    );

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📦 VENDOR ORDER UPDATES</Text>
        </View>

        {sortedOrders.length > 0 ? (
          sortedOrders.slice(0, 5).map(order => {
            const statusInfo = getStatusInfo(order.status);
            const vendorName = order.vendor?.firstName || order.vendor?.vendorDetails?.companyName || 'Unknown';
            const projectName = order.project?.title || 'Unknown Project';
            
            return (
              <TouchableOpacity 
                key={order._id} 
                style={styles.orderUpdateCard}
                onPress={() => navigation.navigate('NegotiationChat', {
                  orderId: order._id,
                  userRole: 'owner',
                })}
              >
                <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]}>
                  <Text style={styles.statusIcon}>{statusInfo.icon}</Text>
                </View>
                <View style={styles.orderUpdateInfo}>
                  <Text style={styles.orderUpdateTitle}>{order.purchaseOrderNumber}</Text>
                  <Text style={styles.orderUpdateVendor}>{vendorName} • {projectName}</Text>
                  <View style={styles.orderStatusRow}>
                    <Text style={[styles.orderStatusLabel, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                    <Text style={styles.orderUpdateTime}>
                      {new Date(order.updatedAt || order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {order.totalAmount > 0 && (
                    <Text style={styles.orderAmount}>₹{order.totalAmount.toLocaleString()}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No vendor orders yet</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.viewAllBtn}
          onPress={() => navigation.getParent()?.navigate('Vendors')}
        >
          <Text style={styles.viewAllText}>View All Orders ({allOrders.length}) →</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.viewAllBtn, { backgroundColor: '#E3F2FD', marginTop: 8 }]}
          onPress={() => navigation.navigate('AdminDeliveryTracking')}
        >
          <Text style={[styles.viewAllText, { color: '#1976D2' }]}>🚚 Track All Deliveries →</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CommonHeader title="Dashboard" userRole="Owner" showNotifications={true} />
      <AddUserModal />
      <AddProjectModal />
      <QuotationDetailModal />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <PaymentTrackerCard />
        <QuickActions />
        <VendorOrdersUpdates />
        <ProjectHealth />
        <TeamAndResources />
        <RecentActivity />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    padding: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  greeting: { fontSize: 13, color: '#666' },
  name: { fontSize: 20, fontWeight: 'bold' },
  profileIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFC107',
    justifyContent: 'center', alignItems: 'center'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 14, fontWeight: '800', color: '#444', letterSpacing: 0.5, marginBottom: 8
  },
  subsectionTitle: {
    fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8
  },

  // Filters
  filterPillContainer: { flexDirection: 'row', marginBottom: 12 },
  filterPill: { 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, 
    backgroundColor: '#eee', marginRight: 8 
  },
  activePill: { backgroundColor: '#333' },
  pillText: { fontSize: 11, color: '#666', fontWeight: '600' },
  activePillText: { color: '#fff' },

  // Cards
  cardContainer: {},
  paymentCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4
  },
  payHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap' },
  payProject: { fontSize: 15, fontWeight: 'bold', flex: 1 },
  badgeLate: { 
    backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, 
    borderRadius: 4, marginLeft: 8 
  },
  badgeLateText: { fontSize: 10, color: '#D32F2F', fontWeight: 'bold' },
  payClient: { fontSize: 12, color: '#666', marginBottom: 12 },
  payRow: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'flex-end', marginBottom: 16 
  },
  payLabel: { fontSize: 13, color: '#888' },
  payAmount: { fontSize: 18, fontWeight: 'bold' },
  payActions: { flexDirection: 'row', gap: 10 },
  btnAction: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEE',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, gap: 4,
    justifyContent: 'center'
  },
  btnActionSecondary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#eee',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6
  },
  btnActionText: { fontSize: 12, fontWeight: '600', color: '#333' },
  emptyText: { textAlign: 'center', color: '#999', paddingVertical: 20, fontStyle: 'italic' },

  // Quick Actions
  quickGrid: { flexDirection: 'row', gap: 12 },
  quickCard: {
    flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#eee', flexDirection: 'row', alignItems: 'center', gap: 12
  },
  quickIconBg: { 
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFECB3', 
    justifyContent: 'center', alignItems: 'center' 
  },
  quickTitle: { fontSize: 12, fontWeight: 'bold' },
  quickSub: { fontSize: 10, color: '#666' },

  // Quotations
  quotationCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#1976D2',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4
  },
  quoteNumber: { fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  quoteVendor: { fontSize: 13, color: '#666', marginBottom: 2 },
  quoteProject: { fontSize: 13, color: '#666', marginBottom: 2 },
  quoteAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  quoteSubmitted: { fontSize: 12, color: '#888', marginBottom: 12 },
  quoteActions: { flexDirection: 'row', gap: 6 },

  // Project Health
  healthRow: { marginBottom: 12 },
  healthLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  hLabel: { fontSize: 12, fontWeight: '600', color: '#444' },
  hPct: { fontSize: 12, fontWeight: 'bold' },
  barBg: { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  criticalProjectCard: {
    backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#D32F2F'
  },
  criticalProjectTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  criticalProjectSub: { fontSize: 12, color: '#666', marginBottom: 4 },
  viewDetailsLink: { fontSize: 12, color: '#1976D2', fontWeight: '600' },

  // Team & Resources
  teamStatsGrid: { flexDirection: 'row', gap: 12 },
  teamStatCard: {
    flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#eee', alignItems: 'center'
  },
  teamStatNumber: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  teamStatLabel: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 4 },
  teamStatSub: { fontSize: 10, color: '#FBC02D', marginTop: 4 },
  utilizationText: { fontSize: 12, color: '#666', marginTop: 4 },
  teamActionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  teamActionBtn: {
    flex: 1, backgroundColor: '#333', padding: 12, borderRadius: 8,
    alignItems: 'center'
  },
  teamActionText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Timeline
  timelineItem: { 
    flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start',
    paddingLeft: 8 
  },
  tDot: { fontSize: 16, marginRight: 12, marginTop: 2 },
  tHead: { fontSize: 13, fontWeight: '500', color: '#333' },
  tSub: { fontSize: 11, color: '#888' },

  // View All Button
  viewAllBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  viewAllText: { color: '#1976D2', fontSize: 13, fontWeight: '600' },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    height: '90%', padding: 20
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  stepIndicator: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 
  },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#eee' },
  activeDot: { backgroundColor: '#333' },
  stepLine: { width: 40, height: 2, backgroundColor: '#eee' },
  stepText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  modalBody: { flex: 1 },
  modalFooter: { 
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20,
    borderTopWidth: 1, borderTopColor: '#eee'
  },
  backBtn: { padding: 15 },
  backBtnText: { color: '#666', fontWeight: '600' },
  nextBtn: { 
    backgroundColor: '#333', paddingVertical: 15, paddingHorizontal: 30, 
    borderRadius: 8, justifyContent: 'center', alignItems: 'center'
  },
  nextBtnText: { color: '#fff', fontWeight: 'bold' },
  
  // Form Inputs
  inputLabel: { 
    fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 12 
  },
  input: { 
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, 
    fontSize: 16, backgroundColor: '#fafafa' 
  },
  roleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  roleBtn: { 
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, 
    borderWidth: 1, borderColor: '#ddd' 
  },
  activeRoleBtn: { backgroundColor: '#333', borderColor: '#333' },
  roleText: { color: '#666' },
  activeRoleText: { color: '#fff' },
  sectionHeaderTitle: { 
    fontSize: 16, fontWeight: 'bold', marginBottom: 16, marginTop: 10 
  },
  permissionBox: { 
    backgroundColor: '#f5f5f5', padding: 16, borderRadius: 8, marginTop: 16 
  },
  permTitle: { fontWeight: 'bold', marginBottom: 8 },
  permItem: { marginBottom: 4, color: '#555', fontSize: 13 },
  projectSelectRow: { 
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, 
    borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  projectSelectText: { marginLeft: 12, fontSize: 16 },
  subText: { fontSize: 13, color: '#666', marginBottom: 12 },

  // Quotation Detail Modal
  detailRow: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  detailLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  detailValue: { fontSize: 14, color: '#333' },
  itemRow: { 
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 
  },
  itemText: { fontSize: 13, color: '#333' },
  itemQty: { fontSize: 13, color: '#666' },
  attachmentSection: { marginTop: 20 },
  attachmentBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: '#E3F2FD', borderRadius: 8, marginTop: 8
  },
  attachmentText: { marginLeft: 8, fontSize: 13, color: '#1976D2' },
  infoBox: {
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: '#E3F2FD', 
    borderRadius: 8, 
    padding: 12, 
    marginTop: 20,
    gap: 10,
  },
  infoText: { 
    flex: 1, 
    fontSize: 13, 
    color: '#1976D2', 
    lineHeight: 18 
  },

  // Client Section Styles
  clientStatsRow: { 
    flexDirection: 'row', gap: 12, marginBottom: 16 
  },
  clientStatBox: {
    flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: '#eee', alignItems: 'center'
  },
  clientStatNumber: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  clientStatLabel: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 4 },
  clientCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 12, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee'
  },
  clientAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFC107',
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  clientAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: '600', color: '#333' },
  clientEmail: { fontSize: 12, color: '#888', marginTop: 2 },

  // Vendor Order Updates Styles
  orderUpdateCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    padding: 12, borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee'
  },
  statusIndicator: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 12
  },
  statusIcon: { fontSize: 18 },
  orderUpdateInfo: { flex: 1 },
  orderUpdateTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  orderUpdateVendor: { fontSize: 12, color: '#666', marginTop: 2 },
  orderStatusRow: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    alignItems: 'center', marginTop: 4 
  },
  orderStatusLabel: { fontSize: 12, fontWeight: '600' },
  orderUpdateTime: { fontSize: 11, color: '#999' },
  orderAmount: { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 30 }
});

export default OwnerDashboardScreen;
