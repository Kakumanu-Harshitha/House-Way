import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { projectsAPI } from "../../../utils/api";

// Premium White Theme with Yellow Fade Accents
const COLORS = {
  primary: '#F4D03F',        // Yellow Fade
  primaryDark: '#D4AC0D',    // Darker Yellow
  primaryLight: 'rgba(244, 208, 63, 0.15)',
  background: '#FFFFFF',     // Clean White
  cardBg: '#FFFFFF',         // White
  cardBorder: 'rgba(244, 208, 63, 0.1)',
  text: '#1A1A1A',           // Dark text
  textMuted: '#666666',      // Muted text
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const PaymentPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { projectId } = route.params || {};

  const [paymentSchedule, setPaymentSchedule] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState(null);

  // Fetch project payment data
  useEffect(() => {
    if (projectId) {
      loadProjectPayments();
    } else {
      setIsLoading(false);
      Alert.alert('Error', 'No project selected');
    }
  }, [projectId]);

  const loadProjectPayments = async () => {
    try {
      setIsLoading(true);

      const projectResponse = await projectsAPI.getProjectById(projectId);

      let schedule = [];

      if (projectResponse.success && projectResponse.data.project) {
        const projectData = projectResponse.data.project;
        setProject(projectData);

        // Use real payment schedule if available
        if (projectData.paymentSchedule && projectData.paymentSchedule.length > 0) {
          schedule = projectData.paymentSchedule.map(item => ({
            id: item.id || item._id || Math.random().toString(),
            type: item.name || 'Payment Installment',
            amount: item.amount || 0,
            status: item.status || 'pending',
            dueDate: item.dueDate
          }));
        }
        // Fallback to installments if no paymentSchedule
        else if (projectData.installments && projectData.installments.length > 0) {
          schedule = projectData.installments.map(item => ({
            id: item._id || Math.random().toString(),
            type: item.title || 'Installment',
            amount: item.amount || 0,
            status: item.status || 'pending',
            dueDate: item.dueDate
          }));
        }
        // Fallback to paymentDeadlines if no schedule/installments
        else if (projectData.paymentDeadlines) {
          const deadlines = projectData.paymentDeadlines;
          const budget = projectData.budget?.estimated || 0;
          if (deadlines.firstPayment) {
            schedule.push({ id: 'first', type: '1st Payment (Booking)', dueDate: deadlines.firstPayment, status: 'pending', amount: budget * 0.25 });
          }
          if (deadlines.secondPayment) {
            schedule.push({ id: 'second', type: '2nd Payment', dueDate: deadlines.secondPayment, status: 'pending', amount: budget * 0.25 });
          }
          if (deadlines.thirdPayment) {
            schedule.push({ id: 'third', type: '3rd Payment', dueDate: deadlines.thirdPayment, status: 'pending', amount: budget * 0.25 });
          }
          if (deadlines.fourthPayment) {
            schedule.push({ id: 'fourth', type: 'Final Payment', dueDate: deadlines.fourthPayment, status: 'pending', amount: budget * 0.25 });
          }
        }
      }

      setPaymentSchedule(schedule);
    } catch (error) {
      console.error('Error loading project payments:', error);
      Alert.alert('Error', 'Failed to load payment information');
      setPaymentSchedule([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1A3A5A" />
        <Text style={styles.loadingText}>Loading payment information...</Text>
      </SafeAreaView>
    );
  }

  // Calculate payment progress
  const paidCount = paymentSchedule.filter(p => p.status === 'paid').length;
  const totalCount = paymentSchedule.length || 1;
  const progressPercent = Math.round((paidCount / totalCount) * 100);

  // Calculate total paid and pending amounts
  const totalPaid = paymentSchedule.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending = paymentSchedule.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1A3A5A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Project Summary Card */}
        {project && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryGradient}>
              <View style={styles.summaryRow}>
                <View>
                  <Text style={styles.summaryLabel}>Total Project Value</Text>
                  <Text style={styles.summaryValue}>₹{(project.budget?.estimated || 0).toLocaleString()}</Text>
                </View>
                <Ionicons name="card-outline" size={32} color="rgba(255,255,255,0.8)" />
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.summarySubRow}>
                  <Text style={styles.progressLabel}>Payment Progress</Text>
                  <Text style={styles.progressValue}>{progressPercent}%</Text>
                </View>
                <View style={styles.summaryProgressBar}>
                  <View
                    style={[
                      styles.summaryProgressFill,
                      { width: `${progressPercent}%` }
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Payment Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(76, 175, 80, 0.1)' }]}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.statLabel}>Paid</Text>
            <Text style={[styles.statValue, { color: COLORS.success }]}>₹{totalPaid.toLocaleString()}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(255, 152, 0, 0.1)' }]}>
            <Ionicons name="time" size={24} color={COLORS.warning} />
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: COLORS.warning }]}>₹{totalPending.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Schedule</Text>
          {paymentSchedule.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No payment schedule available</Text>
                <Text style={styles.emptySubText}>Payment installments will appear here once set up</Text>
              </View>
            </View>
          ) : (
            <View style={styles.card}>
              {paymentSchedule.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleLeft}>
                      <View style={[
                        styles.indicator,
                        { backgroundColor: item.status === 'paid' ? COLORS.success : COLORS.warning }
                      ]} />
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.textPrimary}>{item.type}</Text>
                        {item.dueDate && (
                          <View style={styles.dueDateRow}>
                            <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                            <Text style={styles.textSecondary}>
                              Due: {new Date(item.dueDate).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.amountText}>
                        ₹{(item.amount || 0).toLocaleString()}
                      </Text>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === 'paid' ? 'rgba(76,175,80,0.15)' : 'rgba(255,152,0,0.15)' }
                      ]}>
                        <Ionicons
                          name={item.status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                          size={12}
                          color={item.status === 'paid' ? COLORS.success : COLORS.warning}
                        />
                        <Text style={[
                          styles.statusText,
                          { color: item.status === 'paid' ? COLORS.success : COLORS.warning }
                        ]}>
                          {item.status === 'paid' ? 'PAID' : 'PENDING'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index !== paymentSchedule.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentPage;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
  },
  headerBtn: {
    padding: 8,
    borderRadius: 22,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    flex: 1,
    textAlign: "center",
  },
  section: { marginVertical: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: COLORS.text },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    marginVertical: 8
  },
  divider: { height: 1, backgroundColor: COLORS.cardBorder, marginVertical: 12 },
  textPrimary: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  textSecondary: { fontSize: 13, color: COLORS.textMuted, marginLeft: 4 },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryGradient: {
    padding: 24,
    backgroundColor: COLORS.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  summarySubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryProgressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  scheduleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduleInfo: {
    flex: 1,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  amountText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
});
