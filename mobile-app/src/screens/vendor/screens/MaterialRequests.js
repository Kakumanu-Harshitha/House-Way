import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, Text, Alert, TouchableOpacity, StyleSheet, Platform, Modal, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import io from 'socket.io-client';
import AppHeader from '../components/AppHeader';
import MaterialCard from '../components/MaterialCard';
import theme from '../../../styles/theme';
import { materialRequestsAPI, quotationsAPI } from '../../../utils/api';
import { getSocketBaseUrl } from '../../../utils/network';

export default function MaterialRequests({ navigation, route }) {
  const [myRequests, setMyRequests] = useState([]);
  const [approvedQuotations, setApprovedQuotations] = useState([]);
  const [activeTab, setActiveTab] = useState(() => {
    const requestedTab = route?.params?.initialTab;
    return requestedTab === 'accepted' || requestedTab === 'approved'
      ? requestedTab
      : 'accepted';
  }); // 'accepted' or 'approved'
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailsModal, setDetailsModal] = useState({ visible: false, request: null });
  const [socketConnected, setSocketConnected] = useState(false);
  const [quotations, setQuotations] = useState({}); // Store quotations by materialRequestId
  const socketRef = useRef(null);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  useEffect(() => {
    const requestedTab = route?.params?.initialTab;
    if (requestedTab !== 'accepted' && requestedTab !== 'approved') return;
    if (requestedTab !== activeTab) setActiveTab(requestedTab);
  }, [route?.params?.initialTab]);

  // Initialize socket connection
  useEffect(() => {
    const SOCKET_URL = getSocketBaseUrl();
    
    console.log('[MaterialRequests] Connecting to socket:', SOCKET_URL);
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current.on('connect', () => {
      console.log('[MaterialRequests] Socket connected:', socketRef.current.id);
      setSocketConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('[MaterialRequests] Socket disconnected');
      setSocketConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('[MaterialRequests] Socket connection error:', error);
    });

    // Listen for material request events
    socketRef.current.on('materialRequest', (data) => {
      console.log('[MaterialRequests] Material request event received:', data);
      handleMaterialRequestUpdate(data);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('[MaterialRequests] Disconnecting socket');
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Handle real-time material request updates
  const handleMaterialRequestUpdate = (data) => {
    const { operation, materialRequest } = data;
    
    console.log('[MaterialRequests] Processing update:', operation, materialRequest?._id);

    switch (operation) {
      case 'created':
      case 'approved':
        // Refresh available requests if new request is created or approved
        if (activeTab === 'available') {
          loadData();
        }
        break;
      
      case 'vendorAccepted':
        // Refresh both tabs when a vendor accepts a request
        loadData();
        break;
      
      case 'updated':
      case 'rejected':
        // Refresh current view
        loadData();
        break;
      
      default:
        console.log('[MaterialRequests] Unknown operation:', operation);
    }
  };

  useEffect(() => { 
    loadData(); 
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      console.log(`[MaterialRequests] Loading ${activeTab} requests...`);
      
      if (activeTab === 'approved') {
        // Load approved quotations
        const res = await quotationsAPI.getQuotations({ status: 'approved' });
        console.log('[MaterialRequests] Approved quotations response:', res);
        
        if (res.success) {
          setApprovedQuotations(res.data.quotations || []);
          console.log('[MaterialRequests] Found', res.data.quotations?.length || 0, 'approved quotations');
        }
      } else {
        // Load requests assigned to me (all statuses)
        const res = await materialRequestsAPI.getMaterialRequests({ limit: 100, status: 'all' });
        console.log('[MaterialRequests] My requests response:', res);
        
        if (res.success) {
          const requests = res.data.materialRequests || [];
          setMyRequests(requests);
          console.log('[MaterialRequests] Found', requests.length, 'accepted requests');
          
          // Load quotations for each accepted request
          await loadQuotations(requests);
        }
      }
    } catch (error) {
      console.error('[MaterialRequests] Error loading:', error);
      setErrorMessage(error?.message || 'Failed to load material requests');
      showAlert('Error', error?.message || 'Failed to load material requests');
    } finally {
      setLoading(false);
    }
  };

  const loadQuotations = async (requests) => {
    try {
      if (!requests || requests.length === 0) {
        setQuotations({});
        return;
      }

      // Get all request IDs
      const requestIds = requests.map(r => r._id);
      
      // Load all quotations for these requests in a single batch request
      const res = await quotationsAPI.getQuotations({ 
        materialRequestIds: requestIds.join(','),
        limit: requestIds.length * 5 // Allow up to 5 quotations per request
      });
      
      if (res.success && res.data.quotations) {
        // Group quotations by material request ID
        const quotationsByRequest = {};
        res.data.quotations.forEach(quotation => {
          if (quotation.materialRequest) {
            const requestId = quotation.materialRequest._id || quotation.materialRequest;
            if (!quotationsByRequest[requestId]) {
              quotationsByRequest[requestId] = [];
            }
            quotationsByRequest[requestId].push(quotation);
          }
        });
        
        // For each request, get the most recent quotation
        const latestQuotations = {};
        Object.keys(quotationsByRequest).forEach(requestId => {
          const quotations = quotationsByRequest[requestId];
          if (quotations && quotations.length > 0) {
            // Sort by creation date and get the most recent
            const sorted = quotations.sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            );
            latestQuotations[requestId] = sorted[0];
          }
        });
        
        setQuotations(latestQuotations);
        console.log('[MaterialRequests] Loaded quotations:', latestQuotations);
      } else {
        setQuotations({});
      }
    } catch (error) {
      console.error('[MaterialRequests] Error loading quotations:', error);
      setQuotations({}); // Set empty object on error
    }
  };

  const acceptRequest = async (request) => {
    try {
      console.log('[MaterialRequests] Accepting request:', request._id);
      const res = await materialRequestsAPI.acceptMaterialRequest(request._id);

      const purchaseOrderId = res?.data?.purchaseOrder?._id;
      
      if (res.success) {
        // Show success message
        const successMessage = purchaseOrderId
          ? 'Material request accepted. Order created for negotiation.'
          : 'Material request accepted.';

        if (Platform.OS === 'web') {
          window.alert(successMessage);
          loadData();
          setActiveTab('accepted');
          if (purchaseOrderId) {
            navigation.navigate('NegotiationChat', {
              orderId: purchaseOrderId,
              userRole: 'vendor',
            });
          }
        } else {
          Alert.alert(
            'Success!',
            successMessage,
            [
              { text: 'OK', onPress: () => {
                loadData();
                setActiveTab('accepted');
                if (purchaseOrderId) {
                  navigation.navigate('NegotiationChat', {
                    orderId: purchaseOrderId,
                    userRole: 'vendor',
                  });
                }
              }}
            ]
          );
        }
      } else {
        const existingPurchaseOrderId = res?.data?.purchaseOrder?._id;
        if (Platform.OS === 'web') {
          window.alert(res.message || 'Failed to accept request');
          if (existingPurchaseOrderId) {
            navigation.navigate('NegotiationChat', {
              orderId: existingPurchaseOrderId,
              userRole: 'vendor',
            });
          }
        } else {
          Alert.alert(
            'Error',
            res.message || 'Failed to accept request',
            existingPurchaseOrderId
              ? [
                  {
                    text: 'Open Chat',
                    onPress: () =>
                      navigation.navigate('NegotiationChat', {
                        orderId: existingPurchaseOrderId,
                        userRole: 'vendor',
                      }),
                  },
                  { text: 'OK' },
                ]
              : [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('[MaterialRequests] Error accepting:', error);
      const errorMsg = error?.message || 'Failed to accept material request';
      const existingPurchaseOrderId = error?.data?.purchaseOrder?._id;
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
        if (existingPurchaseOrderId) {
          navigation.navigate('NegotiationChat', {
            orderId: existingPurchaseOrderId,
            userRole: 'vendor',
          });
        }
      } else {
        Alert.alert(
          'Error',
          errorMsg,
          existingPurchaseOrderId
            ? [
                {
                  text: 'Open Chat',
                  onPress: () =>
                    navigation.navigate('NegotiationChat', {
                      orderId: existingPurchaseOrderId,
                      userRole: 'vendor',
                    }),
                },
                { text: 'OK' },
              ]
            : [{ text: 'OK' }]
        );
      }
    }
  };

  const createQuotation = (request) => {
    const existingQuotation = quotations[request._id];
    
    if (existingQuotation) {
      // If quotation is approved, only allow viewing (no updates)
      if (existingQuotation.status === 'approved') {
        if (Platform.OS === 'web') {
          window.alert('This quotation has been approved and cannot be modified.');
        } else {
          Alert.alert('Quotation Approved', 'This quotation has been approved and cannot be modified.');
        }
        return;
      }
      
      // If quotation exists but not approved, navigate to edit/update mode
      navigation.navigate('QuotationManagement', { 
        materialRequest: request,
        quotation: existingQuotation,
        mode: 'update'
      });
    } else {
      // No quotation exists, create new
      navigation.navigate('QuotationManagement', { 
        materialRequest: request,
        mode: 'create'
      });
    }
  };

  const viewQuotationDetails = (request, quotation) => {
    // Show quotation details in a read-only alert
    const details = `Quotation: ${quotation.title}
Status: ${quotation.status}
Total: ₹${quotation.totalAmount?.toFixed(2) || '0.00'}
Items: ${quotation.items?.length || 0}
Delivery: ${quotation.deliveryTerms?.deliveryTime || 'N/A'} days`;
    
    if (Platform.OS === 'web') {
      window.alert(details);
    } else {
      Alert.alert('Quotation Details', details);
    }
  };

  const openNegotiationChat = (request) => {
    // The new flow uses purchase orders for negotiation
    // When vendor accepts a material request, a purchase order is created
    // We need to navigate to the negotiation chat with the order ID
    
    // First check if there's a purchase order for this material request
    // For now, navigate with the material request ID and the chat will handle it
    navigation.navigate('NegotiationChat', {
      orderId: request.purchaseOrder?._id || request._id,
      materialRequestId: request._id,
      userRole: 'vendor'
    });
  };

  const viewDetails = (request) => {
    console.log('[MaterialRequests] View details for:', request._id);
    
    if (!request.materials || request.materials.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('This material request does not have any materials listed.');
      } else {
        Alert.alert('No Materials', 'This material request does not have any materials listed.');
      }
      return;
    }

    // For web, use custom modal; for native, use Alert
    if (Platform.OS === 'web') {
      setDetailsModal({ visible: true, request });
    } else {
      const materialsText = request.materials.map((m, i) => 
        `${i + 1}. ${m.name || 'Unnamed Material'}\n   Qty: ${m.quantity || 0} ${m.unit || 'units'}\n   Est. Cost: ₹${m.estimatedCost || 'N/A'}${m.specifications ? `\n   Specs: ${Object.entries(m.specifications).map(([k,v]) => `${k}: ${v}`).join(', ')}` : ''}`
      ).join('\n\n');

      const message = `Project: ${request.project?.title || 'N/A'}

Description: ${request.description || 'No description provided'}

Materials:
${materialsText}

Required by: ${request.requiredBy ? new Date(request.requiredBy).toLocaleDateString() : 'N/A'}

Priority: ${request.priority || 'medium'}
Status: ${request.status || 'pending'}`;

      Alert.alert(
        request.title || 'Material Request',
        message,
        activeTab === 'available' 
          ? [
              { text: 'Close', style: 'cancel' },
              { text: 'Accept Request', onPress: () => acceptRequest(request) }
            ]
          : [
              { text: 'Close', style: 'cancel' },
              { text: 'Create Quotation', onPress: () => createQuotation(request) }
            ]
      );
    }
  };

  const requests = activeTab === 'approved' ? [] : myRequests;

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Material Requests" onMenu={() => navigation.openDrawer()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading material requests...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Material Requests" onMenu={() => navigation.openDrawer()} />
      
      {/* Real-time connection indicator - only show when disconnected */}
      {!socketConnected && (
        <View style={styles.connectionBar}>
          <View style={[styles.connectionDot, socketConnected && styles.connectionDotActive]} />
          <Text style={styles.connectionText}>Connecting to live updates...</Text>
        </View>
      )}
      
      {/* Details Modal for Web */}
      {Platform.OS === 'web' && detailsModal.visible && detailsModal.request && (
        <Modal
          visible={detailsModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailsModal({ visible: false, request: null })}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{detailsModal.request.title}</Text>
                <TouchableOpacity onPress={() => setDetailsModal({ visible: false, request: null })}>
                  <Feather name="x" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Project</Text>
                  <Text style={styles.detailValue}>{detailsModal.request.project?.title || 'N/A'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{detailsModal.request.description || 'No description provided'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Materials</Text>
                  {detailsModal.request.materials?.map((m, i) => (
                    <View key={i} style={styles.materialItem}>
                      <Text style={styles.materialName}>{i + 1}. {m.name || 'Unnamed Material'}</Text>
                      <Text style={styles.materialDetail}>Qty: {m.quantity || 0} {m.unit || 'units'}</Text>
                      <Text style={styles.materialDetail}>Est. Cost: ₹{m.estimatedCost || 'N/A'}</Text>
                      {m.specifications && (
                        <Text style={styles.materialSpecs}>
                          Specs: {Object.entries(m.specifications).map(([k,v]) => `${k}: ${v}`).join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>

                <View style={styles.detailRow}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Required By</Text>
                    <Text style={styles.detailValue}>
                      {detailsModal.request.requiredBy ? new Date(detailsModal.request.requiredBy).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Priority</Text>
                    <Text style={[styles.detailValue, styles.priorityText]}>
                      {detailsModal.request.priority || 'medium'}
                    </Text>
                  </View>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>{detailsModal.request.status || 'pending'}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.modalButtonSecondary}
                  onPress={() => setDetailsModal({ visible: false, request: null })}
                >
                  <Text style={styles.modalButtonSecondaryText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalButtonPrimary}
                  onPress={() => {
                    setDetailsModal({ visible: false, request: null });
                    createQuotation(detailsModal.request);
                  }}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    Create Quotation
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'accepted' && styles.activeTab]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
            Assigned ({myRequests.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
            Approved ({approvedQuotations.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'approved' ? (
          // Approved Quotations Section
          approvedQuotations.map(quotation => (
            <View key={quotation._id} style={styles.approvedCard}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Feather name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {quotation.title || 'Quotation'}
                  </Text>
                </View>
                <View style={styles.approvedBadge}>
                  <Text style={styles.approvedText}>Approved</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Feather name="package" size={16} color={theme.colors.text.muted} />
                  <Text style={styles.infoText}>
                    {quotation.items?.length || 0} items
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Feather name="dollar-sign" size={16} color={theme.colors.text.muted} />
                  <Text style={styles.infoText}>
                    ₹{quotation.totalAmount?.toFixed(2) || '0.00'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="calendar" size={16} color={theme.colors.text.muted} />
                  <Text style={styles.infoText}>
                    Delivery: {quotation.deliveryTerms?.deliveryTime || 'N/A'} days
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity 
                  style={styles.uploadButton}
                  onPress={() => navigation.navigate('UploadWorkStatus', { 
                    quotation: quotation,
                    materialRequest: quotation.materialRequest
                  })}
                  activeOpacity={0.7}
                >
                  <Feather name="upload" size={18} color="#fff" />
                  <Text style={styles.uploadButtonText}>Upload Work Status</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          // Material Requests Section (Assigned/Accepted)
          requests.map(r => {
            const quotation = quotations[r._id];
            const quotationStatus = quotation ? quotation.status : null;
            const isApproved = quotationStatus === 'approved';
            const canStartOrder =
              activeTab === 'accepted' &&
              (r.status === 'pending' || r.status === 'approved') &&
              !quotationStatus;
            
            return (
              <MaterialCard 
                key={r._id} 
                item={r} 
                index={requests.indexOf(r)} // Pass index for staggered animation
                onAccept={
                  canStartOrder
                    ? () => acceptRequest(r)
                    : isApproved 
                    ? () => viewQuotationDetails(r, quotation) 
                    : () => createQuotation(r)
                } 
                onDecline={null} 
                onView={() => viewDetails(r)}
                onChat={quotationStatus && !isApproved ? () => openNegotiationChat(r) : null}
                showAcceptButton={true}
                acceptButtonText={
                  canStartOrder
                    ? 'Accept & Create Order'
                    : isApproved 
                    ? 'View Quote' 
                    : quotationStatus 
                    ? 'Update Quote' 
                    : 'Create Quotation'
                }
                quotationStatus={quotationStatus}
              />
            );
          })
        )}
        {((activeTab === 'approved' && approvedQuotations.length === 0) || (activeTab !== 'approved' && requests.length === 0)) && (
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={64} color={theme.colors.text.muted} />
            <Text style={styles.emptyText}>
              {errorMessage ? `${errorMessage}\n\n` : ''}
              {activeTab === 'available' 
                ? 'No available material requests'
                : activeTab === 'approved'
                ? 'No approved quotations\n\nOnce your quotations are approved, they will appear here'
                : 'No accepted material requests\n\nAccept requests from the Available tab to create quotations'
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary[50],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.text.muted,
    marginRight: 8,
  },
  connectionDotActive: {
    backgroundColor: theme.colors.success[500],
  },
  connectionText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary[500],
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.muted,
  },
  activeTabText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: theme.colors.text.muted,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  // Modal styles for web
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    flex: 1,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.muted,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
  priorityText: {
    textTransform: 'capitalize',
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
  materialItem: {
    backgroundColor: theme.colors.secondary[50],
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  materialName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  materialDetail: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  materialSpecs: {
    fontSize: 13,
    color: theme.colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.white,
  },
  // Approved quotations card styles
  approvedCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  approvedBadge: {
    backgroundColor: theme.colors.success[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success[500],
  },
  cardBody: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 8,
  },
  cardFooter: {
    padding: 0,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    padding: 16,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.white,
    marginLeft: 8,
    marginRight: 8,
  },
});