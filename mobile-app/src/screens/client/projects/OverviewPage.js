import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DynamicElevatorTimeline from "./TimelineScreen";
import { projectsAPI, clientsAPI, filesAPI } from "../../../utils/api";
import { useAuth } from "../../../context/AuthContext";
import { getServerBaseUrl } from "../../../utils/network";

// Helper to open PDF/document
const openDocument = (url) => {
  if (!url) {
    Alert.alert('No File', 'This document has no attached file.');
    return;
  }
  Linking.openURL(url).catch(err => {
    console.error('Error opening document:', err);
    Alert.alert('Error', 'Failed to open document');
  });
};

export default function ProjectOverview({ route, navigation }) {
  const { projectId } = route?.params || {};
  const { user } = useAuth();
  const serverBaseUrl = getServerBaseUrl();
  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (__DEV__) {
      console.log(" Route :", route);
      console.log("🟡 Route params:", route?.params);
      console.log("🟡 Extracted projectId:", projectId);
    }

    if (!projectId) {
      if (__DEV__) console.warn("⚠️ No projectId passed to ProjectOverview");
      setLoading(false);
      return;
    }

    const loadProject = async () => {
      try {
        if (__DEV__) console.log(`📡 Fetching project with ID: ${projectId}`);
        const res = await projectsAPI.getProjectById(projectId);
        if (__DEV__) console.log("🟢 API Response:", res.data);

        setProject(res.data?.project || null);

        // Fetch invoices for this project
        if (user && user.role === 'client' && user._id) {
          try {
            const invRes = await clientsAPI.getClientProjectInvoices(user._id, projectId);
            if (invRes.success) {
              setInvoices(invRes.data.invoices || []);
            }
          } catch (invErr) {
            if (__DEV__) console.log('Error loading invoices:', invErr.message);
          }
        }

        // Fetch files uploaded by employees
        try {
          const filesRes = await filesAPI.getFiles({ projectId, category: 'documents' });
          if (filesRes.success) {
            setDocuments(filesRes.data.files || []);
          }
        } catch (filesErr) {
          if (__DEV__) console.log('Error loading files:', filesErr.message);
        }
      } catch (err) {
        if (__DEV__) console.error("🔴 Error loading project details:", err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, user]);

  if (loading) {
    if (__DEV__) console.log("⏳ Still loading...");
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#9B59B6" />
        <Text style={{ marginTop: 10 }}>Loading project...</Text>
      </View>
    );
  }

  if (!project) {
    if (__DEV__) console.log("⚠️ No project found after loading");
    return (
      <View style={styles.centered}>
        <Text>No project found</Text>
      </View>
    );
  }

  if (__DEV__) console.log("✅ Rendering project:", project.title);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Project Header Card */}
      <View style={styles.card}>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.subtitle}>
          {project.location?.city && project.location?.state
            ? `${project.location.city}, ${project.location.state}`
            : project.location?.address || "Location not specified"}
        </Text>

        <View style={styles.rowBetween}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{project.status}</Text>
          </View>
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>
              {project.progress?.percentage || 0}% Done
            </Text>
          </View>
        </View>
      </View>

      {/* Project Dates Card */}
      <View style={styles.datesCard}>
        <Text style={styles.datesSectionTitle}>Project Timeline</Text>
        <View style={styles.datesRow}>
          <View style={styles.dateBox}>
            <View style={styles.dateIconBox}>
              <Ionicons name="flag-outline" size={20} color="#388E3C" />
            </View>
            <View>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>
                {project.timeline?.startDate
                  ? new Date(project.timeline.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Not Set'}
              </Text>
            </View>
          </View>
          <View style={styles.dateDivider} />
          <View style={styles.dateBox}>
            <View style={[styles.dateIconBox, { backgroundColor: 'rgba(211, 47, 47, 0.1)' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#D32F2F" />
            </View>
            <View>
              <Text style={styles.dateLabel}>Expected End</Text>
              <Text style={styles.dateValue}>
                {project.timeline?.expectedEndDate || project.timeline?.actualEndDate || project.timeline?.endDate
                  ? new Date(project.timeline.expectedEndDate || project.timeline.actualEndDate || project.timeline.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'Not Set'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Elevator Animation */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Progress Visualization</Text>
        <DynamicElevatorTimeline isEmbedded={true} />
      </View>

      {/* Project Invoices - PDF Style */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={22} color={COLORS.primary} />
          <Text style={styles.sectionTitleInline}>Invoices</Text>
        </View>
        {invoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={32} color="#ccc" />
            <Text style={styles.emptyStateText}>No invoices available</Text>
          </View>
        ) : (
          invoices.map((invoice, index) => {
            const fileUrl = invoice.attachments?.[0]?.url || null;
            return (
              <TouchableOpacity
                key={invoice._id || index}
                style={styles.documentRow}
                onPress={() => openDocument(fileUrl)}
                activeOpacity={0.7}
              >
                <View style={styles.docIconBox}>
                  <Ionicons name="document-text" size={24} color="#E53935" />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle}>{invoice.invoiceNumber || `Invoice #${index + 1}`}</Text>
                  <Text style={styles.docMeta}>
                    ₹{(invoice.totalAmount || 0).toLocaleString()} • {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}
                  </Text>
                </View>
                <View style={[styles.docStatusBadge, { backgroundColor: invoice.status === 'paid' ? 'rgba(56, 142, 60, 0.1)' : 'rgba(245, 124, 0, 0.1)' }]}>
                  <Text style={[styles.docStatusText, { color: invoice.status === 'paid' ? '#388E3C' : '#F57C00' }]}>
                    {invoice.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
                <Ionicons name="open-outline" size={18} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Project Documents - PDF Style */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="folder-open" size={22} color={COLORS.primary} />
          <Text style={styles.sectionTitleInline}>Documents</Text>
        </View>
        {documents.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-outline" size={32} color="#ccc" />
            <Text style={styles.emptyStateText}>No documents uploaded</Text>
          </View>
        ) : (
          documents.map((doc, index) => {
            // Handle URL - files API returns full URL or path
            const docUrl = doc.url || doc.path || null;
            const fullUrl = docUrl?.startsWith('http') ? docUrl : (docUrl ? `${serverBaseUrl}${docUrl}` : null);
            return (
              <TouchableOpacity
                key={doc._id || index}
                style={styles.documentRow}
                onPress={() => openDocument(fullUrl)}
                activeOpacity={0.7}
              >
                <View style={[styles.docIconBox, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
                  <Ionicons
                    name={doc.mimeType?.includes('pdf') || doc.originalName?.includes('.pdf') ? 'document-text' : 'document-attach'}
                    size={24}
                    color="#2196F3"
                  />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docTitle} numberOfLines={1}>{doc.originalName || doc.name || 'Document'}</Text>
                  <Text style={styles.docMeta}>
                    {doc.category || 'File'} • {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>

      {(project.activities || []).map((activity, index) => (
        <View key={index} style={styles.activityCard}>
          <Ionicons name={activity.icon || "document-text-outline"} size={26} color="#3498DB" />
          <View style={styles.activityTextBox}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activitySub}>{activity.date}</Text>
          </View>
          <Text style={styles.tagBlue}>{activity.tag}</Text>
        </View>
      ))}

      {/* Meet the Team */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Meet Your Design Team</Text>
      {project.assignedEmployees && project.assignedEmployees.map((member, index) => (
        <View key={index} style={styles.teamMemberCard}>
          <View style={styles.teamAvatar}>
            <Text style={styles.avatarText}>{member.firstName?.[0]}{member.lastName?.[0]}</Text>
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName}>{member.firstName} {member.lastName}</Text>
            <Text style={styles.teamRole}>{member.employeeDetails?.position || 'Project Designer'}</Text>
          </View>
          <TouchableOpacity style={styles.contactIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#9B59B6" />
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const COLORS = {
  primary: '#D4AF37',        // Dark Golden Rod
  primaryLight: 'rgba(184, 134, 11, 0.15)',
  background: '#FFFFFF',     // Clean White
  cardBg: '#FFFFFF',         // White
  cardBorder: 'rgba(184, 134, 11, 0.1)',
  text: '#1A1A1A',           // Dark text
  textMuted: '#666666',      // Muted text
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 150,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    fontWeight: '500',
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  progressBadge: {
    backgroundColor: 'rgba(56, 142, 60, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.success,
  },
  activityCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activityTextBox: {
    flex: 1,
    marginLeft: 16,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  activitySub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tagBlue: {
    fontSize: 11,
    color: COLORS.cardBg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: '700',
  },
  teamMemberCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  teamAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  teamInfo: {
    flex: 1,
    marginLeft: 16,
  },
  teamName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  teamRole: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  contactIcon: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
  },
  // NEW: Dates Card Styles
  datesCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  datesSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 16,
    color: COLORS.text,
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 142, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  dateDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.cardBorder,
    marginHorizontal: 10,
  },
  // NEW: Invoice Styles
  invoiceCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invoiceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  invoiceDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  invoiceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  invoiceStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyInvoicesCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  emptyInvoicesText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
    fontWeight: '500',
  },
  // NEW: Document/PDF Row Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleInline: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginLeft: 10,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  docMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  docStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  docStatusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
    fontWeight: '500',
  },
});
