import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { materialRequestsAPI, quotationsAPI } from "../../../utils/api";



const CatalogPage = () => {
  const route = useRoute();
  const { projectId } = route.params || {};

  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch project catalog (material requests and quotations)
  useEffect(() => {
    if (projectId) {
      loadProjectCatalog();
    } else {
      setIsLoading(false);
      Alert.alert('Error', 'No project selected');
    }
  }, [projectId]);

  const loadProjectCatalog = async () => {
    try {
      setIsLoading(true);

      // Fetch material requests for this project
      const mrResponse = await materialRequestsAPI.getByProject(projectId);

      if (mrResponse.success && mrResponse.data.materialRequests?.length > 0) {
        // Group material requests by category
        const catalogSections = {};

        for (const mr of mrResponse.data.materialRequests) {
          const category = mr.category || 'General';

          if (!catalogSections[category]) {
            catalogSections[category] = {
              section: category,
              items: [],
            };
          }

          // Get quotations for this material request
          let vendorName = 'Pending';
          let quotationStatus = null;

          if (mr.assignedVendors && mr.assignedVendors.length > 0) {
            vendorName = mr.assignedVendors[0].vendor?.name || mr.assignedVendors[0].vendor?.companyName || 'Vendor Assigned';
          }

          // Map material request status to catalog status
          if (mr.status === 'approved') {
            quotationStatus = 'approved';
          } else if (mr.status === 'rejected') {
            quotationStatus = 'rejected';
          }

          catalogSections[category].items.push({
            id: mr._id,
            category: category,
            name: mr.title || 'Untitled Material',
            vendor: vendorName,
            image: mr.images?.[0]?.url || 'https://images.unsplash.com/photo-1616627981981-c22610e03c2f?auto=format&fit=crop&w=300&q=80',
            status: quotationStatus,
            description: mr.description || '',
          });
        }

        // Convert to array
        const catalogArray = Object.values(catalogSections);
        setCatalog(catalogArray);
      } else {
        setCatalog([]);
      }
    } catch (error) {
      console.error('Error loading project catalog:', error);
      Alert.alert('Error', 'Failed to load catalog');
      setCatalog([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Update item status
  const handleStatusChange = (sectionIndex, itemIndex, status) => {
    const newCatalog = [...catalog];
    newCatalog[sectionIndex].items[itemIndex].status = status;
    setCatalog(newCatalog);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0A2342" />
        <Text style={styles.loadingText}>Loading catalog...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="arrow-back" size={24} color="#0A2342" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catalog</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {catalog.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#999" />
            <Text style={styles.emptyText}>No catalog items available</Text>
            <Text style={styles.emptySubtext}>Items will appear here once material requests are created</Text>
          </View>
        ) : (
          catalog.map((section, sIdx) => (
            <View key={sIdx} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.section}</Text>
              {section.items.map((item, iIdx) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardContent}>
                    <View style={styles.cardText}>
                      <Text style={styles.cardCategory}>{item.category}</Text>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.cardVendor}>
                        Vendor: <Text style={styles.vendorLink}>{item.vendor}</Text>
                      </Text>
                    </View>
                    <Image source={{ uri: item.image }} style={styles.cardImage} />
                  </View>

                  <View style={styles.cardButtons}>
                    {item.status === "approved" ? (
                      <View style={[styles.approveBtn, { backgroundColor: "#BFA46F" }]}>
                        <Ionicons name="checkmark-circle" size={18} color="white" />
                        <Text style={[styles.btnText, { color: "white", marginLeft: 6 }]}>
                          Approved
                        </Text>
                      </View>
                    ) : item.status === "rejected" ? (
                      <View style={[styles.rejectBtn, { backgroundColor: "#FECACA" }]}>
                        <Ionicons name="close-circle" size={18} color="#0A2342" />
                        <Text style={[styles.btnText, { marginLeft: 6 }]}>Rejected</Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => handleStatusChange(sIdx, iIdx, "approved")}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="white" />
                          <Text style={[styles.btnText, { color: "white", marginLeft: 6 }]}>
                            Approve
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => handleStatusChange(sIdx, iIdx, "rejected")}
                        >
                          <Ionicons name="close-circle" size={18} color="#0A2342" />
                          <Text style={[styles.btnText, { marginLeft: 6 }]}>Reject</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

    </View>
  );
};

export default CatalogPage;

// ------------------ Styles ------------------
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
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 60,
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text, letterSpacing: 0.5 },
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
    flexGrow: 1,
  },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  cardContent: { flexDirection: "row", gap: 16, alignItems: "center" },
  cardText: { flex: 1 },
  cardCategory: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "700",
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardName: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  cardVendor: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  vendorLink: { color: COLORS.primary, fontWeight: '700' },
  cardImage: { width: 90, height: 90, borderRadius: 12 },
  cardButtons: { flexDirection: "row", marginTop: 20, gap: 12 },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.2)',
  },
  btnText: { fontWeight: "700", fontSize: 14 },
  centerContent: { justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.textMuted },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 40
  },
});
