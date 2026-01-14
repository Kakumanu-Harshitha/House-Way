import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  RefreshControl,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import WaveHeader from "../../components/clientManagement/WaveHeader";
import api from "../../utils/api";
import { downloadFile, openFile } from "../../utils/fileUtils";

const { width } = Dimensions.get('window');

const ViewInvoicesScreen = ({ route, navigation }) => {
  const { projectId, projectTitle } = route?.params || {};
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [projectId]);

  const fetchInvoices = async () => {
    try {
      const token = await AsyncStorage.getItem("@houseway_token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found");
        setLoading(false);
        return;
      }

      setLoading(true);
      if (__DEV__) console.log("📥 Fetching invoices for project:", projectId);

      const response = await api.get(`/files/invoices?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (__DEV__) console.log("✅ Response:", JSON.stringify(response, null, 2));

      // The axios interceptor already unwraps response.data
      // So 'response' here IS the data object
      let files = [];

      if (response?.success) {
        // Standard format: { success: true, data: { files: [...] } }
        files = response.data?.files || response.data || [];
      } else if (response?.files) {
        // Alternative: { files: [...] }
        files = response.files;
      } else if (Array.isArray(response)) {
        // Direct array response
        files = response;
      }

      if (__DEV__) console.log(`📊 Found ${files.length} invoices:`, files);
      setInvoices(files);

      if (files.length === 0) {
        if (__DEV__) console.log("⚠️ No invoices found - check if they exist in database");
      }

    } catch (error) {
      if (__DEV__) {
        console.error("❌ Fetch Invoices Error:", error);
        console.error("❌ Error Details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }
      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not fetch invoices. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const handleDelete = (invoice) => {
    Alert.alert(
      "Delete Invoice",
      `Are you sure you want to delete "${invoice.originalName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("@houseway_token");
              const response = await api.delete(`/files/invoice/${invoice._id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.data?.success) {
                Alert.alert("Success", "Invoice deleted successfully");
                fetchInvoices(); // Reload list
              } else {
                Alert.alert("Error", "Failed to delete invoice");
              }
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Could not delete invoice");
            }
          },
        },
      ]
    );
  };

  const handleImagePress = (invoice) => {
    if (invoice.url) {
      setSelectedImage(invoice);
      setModalVisible(true);
    } else {
      Alert.alert("Error", "Image URL not available");
    }
  };

  const handleDownload = async (invoice) => {
    if (!invoice?.url) {
      Alert.alert("Error", "No file URL available for download");
      return;
    }

    try {
      setIsDownloading(true);
      const fileName = invoice.originalName || invoice.filename || `Invoice_${Date.now()}`;
      
      if (Platform.OS === 'web') {
        // For web, open in new tab
        await openFile(invoice.url, fileName);
      } else {
        // For mobile, download the file
        const result = await downloadFile(invoice.url, fileName);
        if (result.success) {
          Alert.alert(
            "Download Complete",
            `File saved: ${result.filename}`,
            [
              { text: "Open", onPress: () => openFile(result.localUri) },
              { text: "OK" }
            ]
          );
        } else {
          Alert.alert("Error", result.error || "Failed to download file");
        }
      }
    } catch (err) {
      console.error('Download error:', err);
      Alert.alert("Error", "Failed to download file");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderInvoiceCard = (invoice, index) => {
    // Clean and encode the URL properly
    let imageUrl = invoice.url;

    // Replace spaces with %20
    if (imageUrl) {
      imageUrl = imageUrl.replace(/ /g, '%20');
    }

    const hasImage = imageUrl && (
      imageUrl.startsWith('http://') ||
      imageUrl.startsWith('https://')
    );

    const invoiceDate = invoice.invoiceDate || invoice.uploadedAt;

    // 🔥 DETAILED LOGGING
    console.log('='.repeat(50));
    console.log(`📸 Invoice ${index + 1}:`, invoice.originalName);
    console.log('Original URL:', invoice.url);
    console.log('Cleaned URL:', imageUrl);
    console.log('Has Image:', hasImage);
    console.log('MIME Type:', invoice.mimeType);
    console.log('='.repeat(50));

    return (
      <View key={invoice._id || index} style={styles.card}>
        {/* Image Section */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => handleImagePress(invoice)}
          activeOpacity={0.9}
          disabled={!hasImage}
        >
          {hasImage ? (
            <>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoadStart={() => {
                  console.log(`🔄 Loading started: ${invoice.originalName}`);
                }}
                onLoad={(e) => {
                  console.log(`✅ Image loaded successfully: ${invoice.originalName}`);
                  console.log('Image dimensions:', e.nativeEvent.source);
                }}
                onError={(error) => {
                  console.error(`❌ Image load FAILED: ${invoice.originalName}`);
                  console.error('Error details:', error.nativeEvent);
                  console.error('Failed URL:', imageUrl);
                }}
                onProgress={(e) => {
                  console.log(`📊 Loading progress: ${Math.round((e.nativeEvent.loaded / e.nativeEvent.total) * 100)}%`);
                }}
              />
              {/* Debug overlay - Remove after fixing */}
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: 4,
              }}>
                <Text style={{ color: 'white', fontSize: 10 }} numberOfLines={2}>
                  {imageUrl}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noImage}>
              <Feather name="image" size={48} color="#C9B89A" />
              <Text style={styles.noImageText}>No preview available</Text>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                {invoice.url || 'No URL'}
              </Text>
            </View>
          )}

          {/* Image Overlay */}
          {hasImage && (
            <View style={styles.imageOverlay}>
              <Feather name="maximize-2" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Details Section - Keep existing */}
        <View style={styles.cardContent}>
          {/* ... your existing card content ... */}
          <View style={styles.cardHeader}>
            <View style={styles.fileNameContainer}>
              <Feather name="file-text" size={16} color="#3E60D8" />
              <Text style={styles.fileName} numberOfLines={1}>
                {invoice.originalName || invoice.filename || "Invoice"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDelete(invoice)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="trash-2" size={18} color="#D75A5A" />
            </TouchableOpacity>
          </View>

          {invoice.invoiceInfo && (
            <View style={styles.infoRow}>
              <Feather name="info" size={14} color="#7487C1" />
              <Text style={styles.infoText} numberOfLines={2}>
                {invoice.invoiceInfo}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Feather name="calendar" size={14} color="#7487C1" />
            <Text style={styles.dateText}>
              {new Date(invoiceDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.uploadedInfo}>
              <Feather name="upload" size={12} color="#7487C1" />
              <Text style={styles.uploadedText}>
                Uploaded {new Date(invoice.uploadedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {hasImage && (
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleImagePress(invoice)}
              >
                <Feather name="eye" size={16} color="#3E60D8" />
                <Text style={styles.viewButtonText}>View</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      {/* Wave Header */}
      <WaveHeader
        title={projectTitle || "Project Invoices"}
        subtitle={
          loading
            ? "Loading..."
            : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`
        }
        height={200}
        showBackButton
        backButtonPress={() => navigation.goBack()}
      />

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3E60D8" />
          <Text style={styles.loadingText}>Loading invoices...</Text>
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyContent}>
            <Feather name="file-text" size={64} color="#C9B89A" />
            <Text style={styles.emptyTitle}>No Invoices Yet</Text>
            <Text style={styles.emptyText}>
              Upload your first invoice to track project expenses
            </Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => navigation.navigate('CreateInvoice', { projectId })}
            >
              <Feather name="upload-cloud" size={20} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3E60D8"
            />
          }
        >
          {/* Stats Header */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{invoices.length}</Text>
              <Text style={styles.statLabel}>Total Invoices</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {invoices.filter(inv => {
                  const date = new Date(inv.uploadedAt);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                }).length}
              </Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>

          {/* Add Invoice Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateInvoice', { projectId })}
          >
            <Feather name="plus-circle" size={20} color="#3E60D8" />
            <Text style={styles.addButtonText}>Add New Invoice</Text>
          </TouchableOpacity>

          {/* Invoice List */}
          {invoices.map((invoice, index) => renderInvoiceCard(invoice, index))}
        </ScrollView>
      )}

      {/* Full Screen Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setModalVisible(false)}
          >
            <Feather name="x" size={28} color="#fff" />
          </TouchableOpacity>

          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalFileName}>
                  {selectedImage.originalName || selectedImage.filename}
                </Text>
                {selectedImage.invoiceInfo && (
                  <Text style={styles.modalDescription}>
                    {selectedImage.invoiceInfo}
                  </Text>
                )}
                <View style={styles.modalDates}>
                  <Text style={styles.modalDate}>
                    📅 {new Date(selectedImage.invoiceDate || selectedImage.uploadedAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.modalDate}>
                    ⬆️ Uploaded {new Date(selectedImage.uploadedAt).toLocaleDateString()}
                  </Text>
                </View>
                
                {/* Download Button */}
                <TouchableOpacity 
                  style={[styles.modalDownloadButton, isDownloading && styles.buttonDisabled]}
                  onPress={() => handleDownload(selectedImage)}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="download" size={18} color="#fff" />
                  )}
                  <Text style={styles.modalDownloadText}>
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default ViewInvoicesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FBF7EE",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#7487C1",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyContent: {
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B2540",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#7487C1",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3E60D8",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#3E60D8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#3E60D8",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#7487C1",
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: "#3E60D8",
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3E60D8",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 220,
    backgroundColor: "#F0F4F8",
  },
  noImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    marginTop: 8,
    fontSize: 14,
    color: "#7487C1",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(62, 96, 216, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fileNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1B2540",
  },
  deleteButton: {
    padding: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1B2540",
    lineHeight: 20,
  },
  dateText: {
    fontSize: 14,
    color: "#7487C1",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F4F8",
  },
  uploadedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadedText: {
    fontSize: 12,
    color: "#7487C1",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3E60D8",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalImage: {
    width: width - 40,
    height: width - 40,
  },
  modalInfo: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    padding: 20,
    borderRadius: 16,
  },
  modalFileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 12,
    lineHeight: 20,
  },
  modalDates: {
    gap: 4,
  },
  modalDate: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  modalDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3E60D8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  modalDownloadText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});