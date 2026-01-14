// MediaScreen.js
import React, { useState, useEffect, useRef } from "react";
import { Video } from "expo-av";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  FlatList,
  Dimensions,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { projectsAPI, clientsAPI, filesAPI } from "../../../utils/api";
import { useAuth } from "../../../context/AuthContext";
import { getServerBaseUrl } from "../../../utils/network";

export default function MediaScreen() {
  const route = useRoute();
  const { projectId } = route.params || {};
  const { user } = useAuth();

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [mediaData, setMediaData] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const screenWidth = Dimensions.get("window").width;
  const serverBaseUrl = getServerBaseUrl();

  // Fetch project media
  useEffect(() => {
    if (projectId) {
      loadProjectMedia();
    } else {
      setIsLoading(false);
      Alert.alert('Error', 'No project selected');
    }
  }, [projectId]);

  const loadProjectMedia = async () => {
    try {
      setIsLoading(true);
      if (__DEV__) console.log('[MediaScreen] Loading media for project:', projectId);

      // Fetch project data which includes images and documents
      const response = await projectsAPI.getProjectById(projectId);
      if (__DEV__) console.log('[MediaScreen] Project API response:', response);

      if (response.success && response.data.project) {
        const project = response.data.project;

        // Combine images and documents from project data
        let allMedia = [];

        // Process images
        if (project.images && Array.isArray(project.images)) {
          const imageMedia = project.images.map((image, index) => ({
            id: `image-${index}`,
            type: 'photo',
            title: image.name || 'Project Image',
            subtitle: image.type || 'Image',
            date: image.uploadedAt ? new Date(image.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            image: image.url ? `${serverBaseUrl}${image.url}` : null,
            thumbnail: image.url ? `${serverBaseUrl}${image.url}` : null,
            fileUrl: image.url ? `${serverBaseUrl}${image.url}` : null,
            uploadedBy: image.uploadedBy,
            uploadedAt: image.uploadedAt,
          }));
          allMedia = [...allMedia, ...imageMedia];
        }

        // Process documents
        if (project.documents && Array.isArray(project.documents)) {
          const documentMedia = project.documents.map((doc, index) => ({
            id: `doc-${index}`,
            type: 'document',
            title: doc.name || 'Project Document',
            subtitle: doc.type || 'Document',
            date: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
            image: null,
            thumbnail: null,
            fileUrl: doc.url ? `${serverBaseUrl}${doc.url}` : null,
            uploadedBy: doc.uploadedBy,
            uploadedAt: doc.uploadedAt,
          }));
          allMedia = [...allMedia, ...documentMedia];
        }

        // Sort by upload date (newest first)
        allMedia.sort((a, b) => {
          const dateA = new Date(a.uploadedAt || 0);
          const dateB = new Date(b.uploadedAt || 0);
          return dateB - dateA;
        });

        if (__DEV__) console.log('[MediaScreen] Combined media data:', allMedia);
        setMediaData(allMedia);
      } else {
        if (__DEV__) console.log('[MediaScreen] No project data found or API error:', response.message);
        setMediaData([]);
      }

      // Fetch invoices for clients
      if (user && user.role === 'client') {
        try {
          const invRes = await clientsAPI.getClientProjectInvoices(user._id, projectId);
          if (invRes.success) {
            const invData = (invRes.data.invoices || []).map((inv, index) => ({
              id: inv._id || `invoice-${index}`,
              type: 'invoice',
              title: inv.invoiceNumber || `Invoice #${index + 1}`,
              subtitle: `₹${(inv.totalAmount || 0).toLocaleString()}`,
              date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
              status: inv.status,
              fileUrl: inv.attachments?.[0]?.url || null,
              total: inv.totalAmount,
            }));
            setInvoices(invData);
          }
        } catch (e) {
          if (__DEV__) console.log('[MediaScreen] Error loading invoices:', e);
        }
      }

      // Fetch files from files API (uploaded by employees)
      try {
        // Fetch ALL files for this project, not just documents
        const filesRes = await filesAPI.getProjectFiles(projectId);
        if (__DEV__) console.log('[MediaScreen] Files API response:', filesRes);

        if (filesRes.success || filesRes.data) {
          const allFiles = filesRes.data?.files || [];

          // Separate media (images/videos) from documents
          const mediaFiles = allFiles.filter(file =>
            file.mimeType?.startsWith('image/') || file.mimeType?.startsWith('video/')
          ).map((file, index) => {
            const fileUrl = file.url || file.path || file.downloadUrl || null;
            const fullUrl = fileUrl?.startsWith('http') ? fileUrl : (fileUrl ? `${serverBaseUrl}${fileUrl}` : null);
            return {
              id: file._id || `file-media-${index}`,
              type: file.mimeType?.startsWith('video/') ? 'video' : 'photo',
              title: file.originalName || file.name || 'Media File',
              subtitle: file.category || 'Progress',
              date: file.createdAt ? new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
              image: fullUrl,
              thumbnail: fullUrl,
              fileUrl: fullUrl,
              mimeType: file.mimeType,
              uploadedAt: file.createdAt,
            };
          });

          // Add uploaded media files to existing media data
          setMediaData(prevMedia => [...prevMedia, ...mediaFiles]);
          if (__DEV__) console.log('[MediaScreen] Added media files:', mediaFiles.length);

          // Documents only
          const documentFiles = allFiles.filter(file =>
            !file.mimeType?.startsWith('image/') && !file.mimeType?.startsWith('video/')
          ).map((file, index) => {
            const fileUrl = file.url || file.path || null;
            const fullUrl = fileUrl?.startsWith('http') ? fileUrl : (fileUrl ? `${serverBaseUrl}${fileUrl}` : null);
            return {
              id: file._id || `file-${index}`,
              type: 'document',
              title: file.originalName || file.name || 'Document',
              subtitle: file.category || 'File',
              date: file.createdAt ? new Date(file.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A',
              fileUrl: fullUrl,
              mimeType: file.mimeType,
            };
          });
          setFiles(documentFiles);
        }
      } catch (e) {
        if (__DEV__) console.log('[MediaScreen] Error loading files:', e);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading project media:', error);
      Alert.alert('Error', `Failed to load project media: ${error.message || 'Unknown error'}`);
      setMediaData([]);
    } finally {
      setIsLoading(false);
    }
  };



  // Mapping tabs to actual type values
  const typeMap = {
    All: "all",
    Photos: "photo",
    Videos: "video",
    Documents: "document",
    Invoices: "invoice",
  };

  const getFilteredData = () => {
    if (activeFilter === "All") return mediaData;
    if (activeFilter === "Invoices") return invoices;
    if (activeFilter === "Documents") return files;
    return mediaData.filter((item) => item.type === typeMap[activeFilter]);
  };

  const filteredData = getFilteredData();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#d4bda5" />
        <Text style={styles.loadingText}>Loading media...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Section Header */}
        <Text style={styles.sectionHeader}>Project Media & Files</Text>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {["All", "Photos", "Videos", "Documents", "Invoices"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterButton,
                activeFilter === tab && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(tab)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === tab && styles.activeFilterText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Media Grid for Photos/Videos OR Link List for Documents/Invoices */}
        {(activeFilter === "Documents" || activeFilter === "Invoices") ? (
          // Link-style list for Documents and Invoices
          <View style={styles.linkList}>
            {filteredData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name={activeFilter === "Invoices" ? "receipt-outline" : "folder-outline"} size={64} color="#666" />
                <Text style={styles.emptyText}>No {activeFilter.toLowerCase()} available</Text>
                <Text style={styles.emptySubtext}>{activeFilter} will appear here once uploaded</Text>
              </View>
            ) : (
              filteredData.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.linkRow}
                  onPress={() => {
                    if (item.fileUrl) {
                      Linking.openURL(item.fileUrl).catch(err => {
                        if (__DEV__) console.log('Error opening file:', err);
                        Alert.alert('Error', 'Unable to open file');
                      });
                    } else {
                      Alert.alert('No File', 'This item has no attached file.');
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.linkIconBox, {
                    backgroundColor: item.type === 'invoice' ? 'rgba(229, 57, 53, 0.1)' : 'rgba(33, 150, 243, 0.1)'
                  }]}>
                    <Ionicons
                      name={item.type === 'invoice' ? 'receipt-outline' : 'document-text-outline'}
                      size={24}
                      color={item.type === 'invoice' ? '#E53935' : '#2196F3'}
                    />
                  </View>
                  <View style={styles.linkInfo}>
                    <Text style={styles.linkTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.linkMeta}>
                      {item.subtitle} • {item.date}
                    </Text>
                  </View>
                  {item.type === 'invoice' && item.status && (
                    <View style={[styles.linkStatusBadge, {
                      backgroundColor: item.status === 'paid' ? 'rgba(56, 142, 60, 0.1)' : 'rgba(245, 124, 0, 0.1)'
                    }]}>
                      <Text style={[styles.linkStatusText, {
                        color: item.status === 'paid' ? '#388E3C' : '#F57C00'
                      }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Ionicons
                    name={item.type === 'invoice' ? 'open-outline' : 'download-outline'}
                    size={20}
                    color={COLORS.primary}
                    style={{ marginLeft: 8 }}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          // Grid for Photos, Videos, All
          <View style={styles.grid}>
            {filteredData.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={64} color="#666" />
                <Text style={styles.emptyText}>No {activeFilter.toLowerCase()} available</Text>
                <Text style={styles.emptySubtext}>Media will appear here once uploaded to the project</Text>
              </View>
            ) : (
              filteredData.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.gridItem}
                  onPress={() => {
                    if (item.type === "document" || item.type === "invoice") {
                      if (item.fileUrl) {
                        Linking.openURL(item.fileUrl);
                      }
                    } else {
                      setSelectedMedia(item);
                      setGalleryVisible(true);
                    }
                  }}
                >
                  {item.type === "photo" && (
                    <View style={styles.gridImageContainer}>
                      {item.imageLoadError ? (
                        <View style={[styles.gridImage, styles.imageFallback]}>
                          <Ionicons name="image-outline" size={40} color="#ccc" />
                          <Text style={styles.fallbackText}>{item.title}</Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: item.image }}
                          style={styles.gridImage}
                          onError={(error) => {
                            if (__DEV__) console.log('Image load error for:', item.image, error);
                            setMediaData(prevData =>
                              prevData.map(mediaItem =>
                                mediaItem.id === item.id
                                  ? { ...mediaItem, imageLoadError: true }
                                  : mediaItem
                              )
                            );
                          }}
                        />
                      )}
                    </View>
                  )}
                  {item.type === "video" && (
                    <View style={styles.videoItem}>
                      <Image
                        source={{ uri: item.thumbnail }}
                        style={styles.gridImage}
                        onError={(error) => {
                          if (__DEV__) console.log('Thumbnail load error for:', item.thumbnail, error);
                        }}
                      />
                      <Ionicons
                        name="play-circle"
                        size={40}
                        color="white"
                        style={styles.playIcon}
                      />
                    </View>
                  )}
                  {item.type === "document" && (
                    <View style={styles.docItem}>
                      <Ionicons name="document-text-outline" size={40} color="#fff" />
                      <Text style={styles.docText}>{item.title}</Text>
                    </View>
                  )}
                  {item.type === "invoice" && (
                    <View style={[styles.docItem, { backgroundColor: '#4CAF50' }]}>
                      <Ionicons name="receipt-outline" size={40} color="#fff" />
                      <Text style={styles.docText}>{item.title}</Text>
                      <Text style={[styles.docText, { fontSize: 11, opacity: 0.9 }]}>{item.subtitle}</Text>
                      <View style={[styles.invoiceStatus, { backgroundColor: item.status === 'paid' ? '#2E7D32' : '#FF9800' }]}>
                        <Text style={styles.invoiceStatusText}>{item.status?.toUpperCase()}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={galleryVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setGalleryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {selectedMedia && (
            <View style={styles.modalContent}>
              {selectedMedia.type === "photo" && (
                <Image
                  source={{ uri: selectedMedia.image }}
                  style={styles.modalImage}
                />
              )}
              {selectedMedia.type === "video" && (
                <Video
                  source={{ uri: selectedMedia.videoUrl }}
                  style={styles.modalImage}
                  useNativeControls
                  resizeMode="contain"
                  isLooping
                />
              )}
              {selectedMedia.type === "document" && (
                <Text style={{ color: "#fff", fontSize: 16 }}>
                  (Open Document: {selectedMedia.title})
                </Text>
              )}
              <View style={styles.modalDetails}>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedMedia.title}</Text>
                    <Text style={styles.modalDate}>{selectedMedia.date}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setGalleryVisible(false)}>
                    <Text style={styles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>{selectedMedia.subtitle}</Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
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
  accent: '#FFF8E7',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "800",
    marginHorizontal: 20,
    marginVertical: 15,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  highlightCard: {
    height: 220,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  highlightImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  highlightText: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  highlightTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  highlightDate: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 25,
  },
  filterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: "600",
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 10,
  },
  gridItem: {
    width: "48%",
    aspectRatio: 1,
    marginBottom: 15,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gridImageContainer: {
    flex: 1,
  },
  imageFallback: {
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackText: {
    color: COLORS.primary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 10,
    fontWeight: '600',
  },
  videoItem: {
    flex: 1,
    backgroundColor: "#000",
  },
  playIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  docItem: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  docText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    width: '100%',
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "95%",
    height: "80%",
    backgroundColor: "#000",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalImage: {
    width: "100%",
    height: "75%",
    resizeMode: "contain",
  },
  modalDetails: {
    padding: 24,
    backgroundColor: COLORS.cardBg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalDate: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "300",
  },
  modalSubtitle: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
  },
  invoiceStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  invoiceStatusText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  // NEW: Link-style list for Documents and Invoices
  linkList: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
  },
  linkIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  linkMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  linkStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  linkStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
