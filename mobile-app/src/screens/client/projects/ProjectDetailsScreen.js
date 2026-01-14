import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { projectsAPI, filesAPI } from '../../../utils/api';
import theme from '../../../styles/theme';
import { StandardCard } from '../../../components/StandardCard';
// Removed problematic animation components and gradients
// Removed animation imports to prevent CSS errors

const { width: screenWidth } = Dimensions.get('window');

const ProjectDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { projectId } = route.params || {};

  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]); // For uploaded media

  // Image viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Construction phases for timeline display
  const TIMELINE_STEPS = [
    { id: 1, name: 'Foundation', description: 'Site preparation and foundation work', icon: '🏗️' },
    { id: 2, name: 'Structure', description: 'Main building structure and framing', icon: '🧱' },
    { id: 3, name: 'MEP', description: 'Mechanical, Electrical, and Plumbing', icon: '⚡' },
    { id: 4, name: 'Finishing', description: 'Interior and exterior finishing', icon: '🎨' },
    { id: 5, name: 'Handover', description: 'Final inspection and handover', icon: '🔑' },
  ];

  useEffect(() => {
    if (projectId) {
      loadProjectDetails();
    }
  }, [projectId]);

  const loadProjectDetails = async () => {
    try {
      setIsLoading(true);
      // Fetch project, timeline events, and media files together
      const [projectResponse, timelineResponse, filesResponse] = await Promise.all([
        projectsAPI.getProjectById(projectId),
        projectsAPI.getTimeline(projectId).catch(() => ({ success: false, data: { events: [] } })),
        filesAPI.getProjectFiles(projectId).catch(() => ({ success: false, data: { files: [] } }))
      ]);

      if (projectResponse.success) {
        setProject(projectResponse.data.project);
      }

      if (timelineResponse.success) {
        setTimelineEvents(timelineResponse.data.events || []);
      }

      if (filesResponse.success || filesResponse.data) {
        // Filter for images/videos only
        const mediaOnly = (filesResponse.data?.files || []).filter(f =>
          f.mimeType?.startsWith('image/') || f.mimeType?.startsWith('video/')
        );
        setMediaFiles(mediaOnly);
      }
    } catch (error) {
      console.error('Error loading project details:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProjectDetails();
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    // Animation removed for web compatibility
  };

  const getStatusColor = (status) => {
    return theme.statusColors.project[status] || theme.colors.primary[500];
  };

  // Combine project images and uploaded media files for gallery
  const allMedia = [
    ...(project?.images || []),
    ...mediaFiles.map(f => ({
      url: f.url || f.downloadUrl || f.path,
      name: f.originalName || f.filename,
      type: f.mimeType
    }))
  ];

  // Filter only images for slideshow (exclude videos)
  const imageOnlyMedia = allMedia.filter(m => !m.type?.startsWith('video/'));

  const openImageViewer = (index) => {
    // Find the index in imageOnlyMedia
    const imageIndex = imageOnlyMedia.findIndex(img => img.url === allMedia[index]?.url);
    if (imageIndex >= 0) {
      setCurrentImageIndex(imageIndex);
      setViewerVisible(true);
    }
  };

  const goToPrev = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : imageOnlyMedia.length - 1));
  };

  const goToNext = () => {
    setCurrentImageIndex(prev => (prev < imageOnlyMedia.length - 1 ? prev + 1 : 0));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={styles.errorContainer}>
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={getStatusColor(project.status)} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: getStatusColor(project.status) }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {project.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              Project Details
            </Text>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Text style={styles.moreButtonText}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => switchTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'timeline' && styles.activeTab]}
          onPress={() => switchTab('timeline')}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.activeTabText]}>Timeline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => switchTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'team' && styles.activeTab]}
          onPress={() => switchTab('team')}
        >
          <Text style={[styles.tabText, activeTab === 'team' && styles.activeTabText]}>Team</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'media' && styles.activeTab]}
          onPress={() => switchTab('media')}
        >
          <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => switchTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>Files</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && (
          <>
            {/* 3D Project Viewer - Replaced with placeholder */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3D Visualization</Text>
              <TouchableOpacity
                style={styles.viewer3D}
                onPress={() => {
                  console.log('Open full-screen 3D viewer');
                }}
              >
                <View style={styles.viewer3DPlaceholder}>
                  <Text style={styles.viewer3DIcon}>🏗️</Text>
                  <Text style={styles.viewer3DText}>3D View</Text>
                  <Text style={styles.viewer3DSubtext}>Tap to view project in 3D</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Project Progress */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Progress</Text>
              <StandardCard variant="accent" style={styles.progressCard}>
                <View style={styles.progressContent}>
                  <View style={styles.progressHeader}>
                    <View>
                      <Text style={styles.progressTitle}>Overall Progress</Text>
                      <Text style={styles.progressSubtitle}>
                        {project?.progress?.percentage || 0}% Complete
                      </Text>
                    </View>
                    <View style={styles.progressCircle}>
                      <View style={styles.progressBackground}>
                        <View
                          style={{
                            ...styles.progressFill,
                            width: `${project?.progress?.percentage || 0}%`,
                            backgroundColor: theme.statusColors.project[project?.status] || theme.colors.primary[500]
                          }}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {project?.progress?.percentage || 0}%
                      </Text>
                    </View>
                  </View>
                </View>
              </StandardCard>
            </View>

            {/* Project Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Project Information</Text>
              <StandardCard variant="secondary" style={styles.infoCard}>
                <View style={styles.infoContent}>
                  {project?.projectId && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Project ID:</Text>
                      <Text style={[styles.infoValue, { fontWeight: '700', color: '#667eea' }]}>
                        {project.projectId}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <View style={{ ...styles.statusBadge, backgroundColor: getStatusColor(project?.status) }}>
                      <Text style={styles.statusText}>
                        {project?.status?.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Budget:</Text>
                    <Text style={styles.infoValue}>
                      ${project?.budget?.estimated?.toLocaleString() || 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location:</Text>
                    <Text style={styles.infoValue}>
                      {project?.location?.address || 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Start Date:</Text>
                    <Text style={styles.infoValue}>
                      {project?.timeline?.startDate
                        ? new Date(project.timeline.startDate).toLocaleDateString()
                        : 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Expected End Date:</Text>
                    <Text style={styles.infoValue}>
                      {project?.timeline?.expectedEndDate
                        ? new Date(project.timeline.expectedEndDate).toLocaleDateString()
                        : 'Not specified'}
                    </Text>
                  </View>
                </View>
              </StandardCard>
            </View>

            {/* Description */}
            {project?.description && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <StandardCard variant="secondary" style={styles.descriptionCard}>
                  <Text style={styles.descriptionText}>{project.description}</Text>
                </StandardCard>
              </View>
            )}
          </>
        )}

        {activeTab === 'timeline' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Construction Progress</Text>
            <Text style={styles.sectionSubtitle}>Track your project's journey through 5 key phases</Text>

            {TIMELINE_STEPS.map((step, index) => {
              // Check if step has events and get status
              const stepEvents = timelineEvents.filter(event =>
                event.title?.toLowerCase().includes(step.name.toLowerCase())
              );
              const hasCompleted = stepEvents.some(e => e.status === 'completed');
              const hasInProgress = stepEvents.some(e => e.status === 'in-progress');
              const status = hasCompleted ? 'completed' : hasInProgress ? 'in-progress' : 'pending';

              const statusColors = {
                completed: '#388E3C',
                'in-progress': '#D4AF37',
                pending: '#9E9E9E'
              };

              return (
                <View key={step.id} style={styles.timelineStepContainer}>
                  <View style={styles.timelineIndicator}>
                    <View style={[styles.timelineCircle, { backgroundColor: statusColors[status] }]}>
                      {status === 'completed' ? (
                        <Text style={styles.timelineCircleIcon}>✓</Text>
                      ) : (
                        <Text style={styles.timelineCircleText}>{step.id}</Text>
                      )}
                    </View>
                    {index < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: status === 'completed' ? '#388E3C' : '#E0E0E0' }]} />
                    )}
                  </View>
                  <View style={[styles.timelineContent, status === 'in-progress' && styles.timelineContentActive]}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineIcon}>{step.icon}</Text>
                      <Text style={styles.timelineStepName}>{step.name}</Text>
                      <View style={[styles.timelineStatusBadge, { backgroundColor: statusColors[status] + '20' }]}>
                        <Text style={[styles.timelineStatusText, { color: statusColors[status] }]}>
                          {status.replace('-', ' ').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.timelineDescription}>{step.description}</Text>
                    {stepEvents.length > 0 && (
                      <View style={styles.timelineUpdates}>
                        {stepEvents.slice(0, 2).map((event, i) => (
                          <View key={i} style={styles.timelineUpdate}>
                            <Text style={styles.timelineUpdateTitle}>{event.title}</Text>
                            <Text style={styles.timelineUpdateDate}>
                              {new Date(event.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'payments' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            <Text style={styles.sectionSubtitle}>Your payment deadlines and status</Text>

            {/* Payment Summary */}
            <StandardCard variant="accent" style={styles.paymentSummaryCard}>
              <View style={styles.paymentSummaryContent}>
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Total Budget</Text>
                  <Text style={styles.paymentSummaryValue}>
                    ₹{project?.budget?.estimated?.toLocaleString() || '0'}
                  </Text>
                </View>
                <View style={styles.paymentSummaryDivider} />
                <View style={styles.paymentSummaryRow}>
                  <Text style={styles.paymentSummaryLabel}>Amount Paid</Text>
                  <Text style={[styles.paymentSummaryValue, { color: '#388E3C' }]}>
                    ₹{project?.paymentSchedule?.filter(p => p.status === 'paid')
                      .reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString() || '0'}
                  </Text>
                </View>
              </View>
            </StandardCard>

            {/* Payment Schedule List */}
            <Text style={[styles.sectionTitle, { fontSize: 18, marginTop: 20 }]}>Upcoming Deadlines</Text>
            {project?.paymentSchedule?.length > 0 ? (
              project.paymentSchedule.map((payment, index) => (
                <View key={index} style={styles.paymentItem}>
                  <View style={styles.paymentItemLeft}>
                    <View style={[styles.paymentStatusDot, {
                      backgroundColor: payment.status === 'paid' ? '#388E3C' :
                        payment.status === 'overdue' ? '#D32F2F' : '#D4AF37'
                    }]} />
                    <View>
                      <Text style={styles.paymentInstallment}>
                        Installment {index + 1}: {payment.description || 'Payment'}
                      </Text>
                      <Text style={styles.paymentDueDate}>
                        Due: {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'Not set'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.paymentItemRight}>
                    <Text style={styles.paymentAmount}>₹{payment.amount?.toLocaleString() || '0'}</Text>
                    <View style={[styles.paymentStatusBadge, {
                      backgroundColor: payment.status === 'paid' ? '#388E3C20' :
                        payment.status === 'overdue' ? '#D32F2F20' : '#D4AF3720'
                    }]}>
                      <Text style={[styles.paymentStatusText, {
                        color: payment.status === 'paid' ? '#388E3C' :
                          payment.status === 'overdue' ? '#D32F2F' : '#D4AF37'
                      }]}>
                        {payment.status?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No payment schedule set yet.</Text>
            )}

            {/* View All Invoices Button */}
            <TouchableOpacity
              style={styles.paymentLinkBtn}
              onPress={() => navigation.navigate('Projects', { screen: 'Payments', params: { projectId: project._id } })}
            >
              <Text style={styles.paymentLinkText}>View All Invoices & Payment History</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'team' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meet Your Design Team</Text>
            {project?.assignedEmployees?.length > 0 ? (
              project.assignedEmployees.map((member, index) => (
                <StandardCard key={member._id || index} variant="secondary" style={styles.teamCard}>
                  <View style={styles.teamMemberRow}>
                    <View style={styles.teamAvatar}>
                      {member.profileImage ? (
                        <Image source={{ uri: member.profileImage }} style={styles.teamAvatarImg} />
                      ) : (
                        <Text style={styles.teamAvatarText}>{member.firstName?.[0]}{member.lastName?.[0]}</Text>
                      )}
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{member.firstName} {member.lastName}</Text>
                      <Text style={styles.teamRole}>{member.employeeDetails?.position || 'Project Designer'}</Text>
                      <Text style={styles.teamEmail}>{member.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.contactBtn}>
                      <Text style={styles.contactBtnText}>📞</Text>
                    </TouchableOpacity>
                  </View>
                </StandardCard>
              ))
            ) : (
              <Text style={styles.emptyText}>No team members assigned yet.</Text>
            )}

            {project?.assignedVendors?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Assigned Vendors</Text>
                {project.assignedVendors.map((vendor, index) => (
                  <StandardCard key={vendor._id || index} variant="secondary" style={styles.teamCard}>
                    <View style={styles.teamMemberRow}>
                      <View style={[styles.teamAvatar, { backgroundColor: '#EADBC8' }]}>
                        <Text style={styles.teamAvatarText}>🏢</Text>
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={styles.teamName}>{vendor.vendorDetails?.companyName || 'Vendor'}</Text>
                        <Text style={styles.teamRole}>{vendor.vendorDetails?.specialization?.join(', ') || 'Service Provider'}</Text>
                        <Text style={styles.teamEmail}>{vendor.email}</Text>
                      </View>
                    </View>
                  </StandardCard>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'media' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Media</Text>
            <Text style={styles.sectionSubtitle}>
              {allMedia.length} {allMedia.length === 1 ? 'file' : 'files'} uploaded
            </Text>
            <View style={styles.imageGrid}>
              {allMedia.length > 0 ? (
                allMedia.map((media, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.gridImageContainer}
                    onPress={() => !media.type?.startsWith('video/') && openImageViewer(index)}
                  >
                    {media.type?.startsWith('video/') ? (
                      <View style={[styles.gridImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
                        <Text style={{ fontSize: 24 }}>▶️</Text>
                        <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>Video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: media.url }} style={styles.gridImage} />
                    )}
                    <Text style={styles.gridImageLabel} numberOfLines={1}>
                      {media.name || `File ${index + 1}`}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📷</Text>
                  <Text style={styles.emptyText}>No media uploaded yet</Text>
                  <Text style={styles.emptySubText}>Progress photos and videos will appear here</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'documents' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Documents</Text>
            {project?.documents?.length > 0 ? (
              project.documents.map((doc, index) => (
                <TouchableOpacity key={index} style={styles.docItem}>
                  <View style={styles.docIconContainer}>
                    <Text style={styles.docIcon}>📄</Text>
                  </View>
                  <View style={styles.docDetails}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docMeta}>{doc.type?.toUpperCase()} • {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.downloadIcon}>⬇️</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>No documents shared yet.</Text>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Project Media</Text>
            <Text style={styles.sectionSubtitle}>
              {(project?.images?.length || 0) + mediaFiles.length} files uploaded
            </Text>
            <View style={styles.imageGrid}>
              {/* Display combined media with click to view */}
              {allMedia.length > 0 ? (
                allMedia.map((media, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.gridImageContainer}
                    onPress={() => !media.type?.startsWith('video/') && openImageViewer(index)}
                  >
                    {media.type?.startsWith('video/') ? (
                      <View style={[styles.gridImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#222' }]}>
                        <Text style={{ fontSize: 24 }}>▶️</Text>
                        <Text style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>Video</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: media.url }} style={styles.gridImage} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>No progress media uploaded yet.</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.paymentLinkBtn}
              onPress={() => navigation.navigate('Projects', { screen: 'Payments', params: { projectId: project._id } })}
            >
              <Text style={styles.paymentLinkText}>View Invoices & Payments</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Image Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Close Button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 30,
              right: 20,
              zIndex: 10,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              padding: 10,
            }}
            onPress={() => setViewerVisible(false)}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>

          {/* Image Counter */}
          <View style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 55 : 35,
            left: 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 15,
          }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              {currentImageIndex + 1} / {imageOnlyMedia.length}
            </Text>
          </View>

          {/* Main Image */}
          {imageOnlyMedia.length > 0 && (
            <Image
              source={{ uri: imageOnlyMedia[currentImageIndex]?.url }}
              style={{
                width: '90%',
                height: '70%',
                resizeMode: 'contain',
              }}
            />
          )}

          {/* Image Name */}
          <Text style={{
            color: '#fff',
            fontSize: 14,
            marginTop: 15,
            textAlign: 'center',
            paddingHorizontal: 20,
          }}>
            {imageOnlyMedia[currentImageIndex]?.name || `Image ${currentImageIndex + 1}`}
          </Text>

          {/* Navigation Buttons */}
          {imageOnlyMedia.length > 1 && (
            <>
              {/* Previous Button */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 25,
                  padding: 12,
                }}
                onPress={goToPrev}
              >
                <Text style={{ color: '#fff', fontSize: 24 }}>‹</Text>
              </TouchableOpacity>

              {/* Next Button */}
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 25,
                  padding: 12,
                }}
                onPress={goToNext}
              >
                <Text style={{ color: '#fff', fontSize: 24 }}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginTop: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: theme.colors.error[500],
    marginBottom: 20,
    textAlign: 'center',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },

  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 15,
  },
  viewer3D: {
    height: 300,
    borderRadius: 20,
  },
  progressCard: {
    minHeight: 150,
  },
  progressContent: {
    flex: 1,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  progressSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  infoCard: {
    minHeight: 120,
  },
  infoContent: {
    flex: 1,
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  descriptionCard: {
    minHeight: 100,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    padding: 20,
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBackground: {
    width: 80,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  viewer3DPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  viewer3DIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  viewer3DText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  viewer3DSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 10,
  },
  tab: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginRight: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary[500],
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: theme.colors.primary[500],
  },
  teamCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  teamMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  teamAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  teamAvatarImg: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  teamAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary[700],
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  teamRole: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[600],
    marginBottom: 4,
  },
  teamEmail: {
    fontSize: 12,
    color: '#777',
  },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactBtnText: {
    fontSize: 18,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  docIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  docIcon: {
    fontSize: 24,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 12,
    color: '#888',
  },
  downloadIcon: {
    fontSize: 18,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  gridImageContainer: {
    width: (screenWidth - 60) / 2,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  paymentLinkBtn: {
    marginTop: 30,
    backgroundColor: '#1A3A5A',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  paymentLinkText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    marginTop: -10,
  },
  // Timeline styles
  timelineStepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 15,
  },
  timelineCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timelineCircleIcon: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  timelineLine: {
    width: 3,
    flex: 1,
    minHeight: 60,
    marginTop: 5,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  timelineContentActive: {
    borderColor: '#D4AF37',
    borderWidth: 2,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  timelineStepName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  timelineStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timelineStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  timelineUpdates: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  timelineUpdate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  timelineUpdateTitle: {
    fontSize: 13,
    color: '#555',
    flex: 1,
  },
  timelineUpdateDate: {
    fontSize: 12,
    color: '#888',
  },
  // Payment styles
  paymentSummaryCard: {
    marginBottom: 15,
  },
  paymentSummaryContent: {
    padding: 20,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentSummaryLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  paymentSummaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  paymentSummaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 15,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  paymentInstallment: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  paymentDueDate: {
    fontSize: 12,
    color: '#888',
  },
  paymentItemRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Media Grid Styles
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -5,
  },
  gridImageContainer: {
    width: '31%',
    margin: '1%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  gridImage: {
    width: '100%',
    height: 100,
    borderRadius: 10,
  },
  gridImageLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 5,
    paddingHorizontal: 3,
    backgroundColor: '#fafafa',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: -10,
    marginBottom: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    width: '100%',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 5,
  },
});

export default ProjectDetailsScreen;