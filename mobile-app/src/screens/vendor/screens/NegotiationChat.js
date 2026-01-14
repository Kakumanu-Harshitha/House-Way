import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Animated, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../../styles/theme';
import { purchaseOrdersAPI } from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';

export default function NegotiationChat({ route, navigation }) {
  // Support both old (quotationId) and new (orderId) navigation params
  const { orderId, quotationId, userRole } = route.params || {};
  const { user } = useAuth();
  const effectiveOrderId = orderId || quotationId; // Fallback for old navigation
  
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationAmount, setQuotationAmount] = useState('');
  const [quotationNote, setQuotationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);
  
  // Determine current user role
  const currentUserRole = userRole || user?.role || 'vendor';

  useFocusEffect(
    useCallback(() => {
      if (effectiveOrderId) {
        loadOrderAndMessages();
      }
    }, [effectiveOrderId])
  );

  const loadOrderAndMessages = async () => {
    try {
      setLoading(true);
      
      // Load order details
      const orderRes = await purchaseOrdersAPI.getPurchaseOrderById(effectiveOrderId);
      if (orderRes.success) {
        setOrder(orderRes.data.purchaseOrder || orderRes.data);
      }
      
      // Load messages
      const messagesRes = await purchaseOrdersAPI.getMessages(effectiveOrderId);
      if (messagesRes.success) {
        const chatMessages = (messagesRes.data || []).map(msg => ({
          id: msg._id,
          from: msg.senderRole || (msg.sender?._id === user?._id ? currentUserRole : 'owner'),
          messageType: msg.messageType || 'text',
          text: msg.content || '',
          quotation: msg.quotation,
          delivery: msg.delivery,
          invoice: msg.invoice,
          senderName: msg.sender ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() : 'System',
          ts: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(chatMessages);
        
        // Mark messages as read
        await purchaseOrdersAPI.markMessagesRead(effectiveOrderId);
      }
    } catch (error) {
      console.error('Error loading order/messages:', error);
      Alert.alert('Error', 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    
    try {
      setSending(true);
      const res = await purchaseOrdersAPI.sendMessage(effectiveOrderId, text.trim());
      
      if (res.success) {
        const newMessage = {
          id: res.data?._id || Date.now().toString(),
          from: currentUserRole,
          messageType: 'text',
          text: text.trim(),
          senderName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You',
          ts: 'Now'
        };
        setMessages(prev => [...prev, newMessage]);
        setText('');
        
        // Reload to sync with server
        setTimeout(() => loadOrderAndMessages(), 500);
      } else {
        Alert.alert('Error', res.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const submitQuotation = async () => {
    const amount = parseFloat(quotationAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    try {
      setSubmitting(true);
      const res = await purchaseOrdersAPI.submitQuotation(effectiveOrderId, {
        amount,
        currency: 'INR',
        note: quotationNote.trim(),
        items: order?.items || [],
      });
      
      if (res.success) {
        Alert.alert('Success', 'Quotation submitted successfully');
        setShowQuotationModal(false);
        setQuotationAmount('');
        setQuotationNote('');
        loadOrderAndMessages();
      } else {
        Alert.alert('Error', res.message || 'Failed to submit quotation');
      }
    } catch (error) {
      console.error('Error submitting quotation:', error);
      Alert.alert('Error', 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptQuotation = async (messageId) => {
    try {
      const res = await purchaseOrdersAPI.acceptQuotation(effectiveOrderId, messageId);
      if (res.success) {
        Alert.alert('Success', 'Quotation accepted!');
        loadOrderAndMessages();
      } else {
        Alert.alert('Error', res.message || 'Failed to accept quotation');
      }
    } catch (error) {
      console.error('Error accepting quotation:', error);
      Alert.alert('Error', 'Failed to accept quotation');
    }
  };

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingMessageId, setRejectingMessageId] = useState(null);

  const handleRejectQuotation = async (messageId) => {
    setRejectingMessageId(messageId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const confirmRejectQuotation = async () => {
    if (!rejectingMessageId) return;
    try {
      const res = await purchaseOrdersAPI.rejectQuotation(effectiveOrderId, rejectingMessageId, rejectReason || '');
      if (res.success) {
        Alert.alert('Success', 'Quotation rejected');
        loadOrderAndMessages();
      } else {
        Alert.alert('Error', res.message || 'Failed to reject quotation');
      }
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      Alert.alert('Error', 'Failed to reject quotation');
    } finally {
      setRejectModalVisible(false);
      setRejectingMessageId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={{ color: theme.colors.text.secondary, marginTop: 12 }}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header with Back Button and Centered Title */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {order?.title || order?.purchaseOrderNumber || 'Negotiation Chat'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {order?.status === 'accepted' ? 'Order Accepted' : 
             order?.status === 'in_negotiation' ? 'Negotiating' : 
             order?.status || 'Price Negotiation'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => Alert.alert(
            'Order Info', 
            `Status: ${order?.status || 'N/A'}\nPO#: ${order?.purchaseOrderNumber || 'N/A'}\nItems: ${order?.items?.length || 0}`
          )}
          activeOpacity={0.7}
        >
          <Feather name="info" size={20} color={theme.colors.text.muted} />
        </TouchableOpacity>
      </View>
      
      {/* Messages List */}
      <View style={styles.messagesContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={styles.messagesList}
          refreshing={loading}
          onRefresh={loadOrderAndMessages}
          renderItem={({ item, index }) => (
            <MessageBubble 
              item={item} 
              index={index} 
              userRole={currentUserRole}
              onAccept={currentUserRole === 'owner' && item.messageType === 'quotation' && item.quotation?.status === 'pending' 
                ? () => handleAcceptQuotation(item.id) 
                : null}
              onReject={currentUserRole === 'owner' && item.messageType === 'quotation' && item.quotation?.status === 'pending'
                ? () => handleRejectQuotation(item.id)
                : null}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={64} color={theme.colors.text.muted} />
              <Text style={styles.emptyText}>Start the negotiation</Text>
              <Text style={styles.emptySubtext}>
                {currentUserRole === 'vendor' 
                  ? 'Submit a quotation or send a message to begin'
                  : 'Waiting for vendor quotation'}
              </Text>
              <TouchableOpacity 
                style={styles.refreshButton} 
                onPress={loadOrderAndMessages}
              >
                <Feather name="refresh-cw" size={16} color={theme.colors.primary[500]} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      </View>

      {/* Vendor Actions - Submit Quotation Button */}
      {currentUserRole === 'vendor' && order?.status !== 'accepted' && !order?.negotiation?.chatClosed && (
        <TouchableOpacity 
          style={styles.quotationButton}
          onPress={() => setShowQuotationModal(true)}
        >
          <Feather name="file-text" size={18} color="#fff" />
          <Text style={styles.quotationButtonText}>Submit Quotation</Text>
        </TouchableOpacity>
      )}

      {/* Input Row */}
      {!order?.negotiation?.chatClosed && (
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput 
              placeholder="Type your message..." 
              value={text} 
              onChangeText={setText} 
              style={styles.input} 
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[styles.send, (!text.trim() || sending) && styles.sendDisabled]} 
              onPress={send}
              disabled={!text.trim() || sending}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Chat Closed Indicator */}
      {order?.negotiation?.chatClosed && (
        <View style={styles.chatClosedBar}>
          <Feather name="lock" size={16} color={theme.colors.text.muted} />
          <Text style={styles.chatClosedText}>This negotiation has ended</Text>
        </View>
      )}

      {/* Quotation Modal */}
      <Modal
        visible={showQuotationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuotationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Submit Quotation</Text>
              <TouchableOpacity onPress={() => setShowQuotationModal(false)}>
                <Feather name="x" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Total Amount (₹) *</Text>
              <TextInput
                style={styles.modalInput}
                value={quotationAmount}
                onChangeText={setQuotationAmount}
                placeholder="Enter total amount"
                keyboardType="decimal-pad"
                placeholderTextColor={theme.colors.text.muted}
              />
              
              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={quotationNote}
                onChangeText={setQuotationNote}
                placeholder="Add any notes or terms..."
                multiline
                numberOfLines={4}
                placeholderTextColor={theme.colors.text.muted}
              />

              {order?.items && order.items.length > 0 && (
                <View style={styles.itemsPreview}>
                  <Text style={styles.inputLabel}>Items in this order:</Text>
                  {order.items.map((item, idx) => (
                    <Text key={idx} style={styles.itemText}>
                      • {item.materialName || item.name} - {item.quantity} {item.unit}
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>

      {/* Reject Quotation Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Quotation</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Feather name="x" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Reason (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Please provide a reason for rejection..."
                multiline
                numberOfLines={3}
                placeholderTextColor={theme.colors.text.muted}
              />
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: theme.colors.error[500] }]}
                onPress={confirmRejectQuotation}
              >
                <Text style={styles.submitButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowQuotationModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={submitQuotation}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MessageBubble = ({ item, index, userRole, onAccept, onReject }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const isOwnMessage = item.from === userRole;
  const isSystem = item.messageType === 'system';
  const isQuotation = item.messageType === 'quotation';
  const isDelivery = item.messageType === 'delivery';
  const isInvoice = item.messageType === 'invoice';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 5,
        delay: index * 50,
        useNativeDriver: true,
      })
    ]).start();
  }, [opacity, scale, index]);

  // System message styling
  if (isSystem) {
    return (
      <Animated.View style={[styles.systemBubble, { opacity, transform: [{ scale }] }]}>
        <Feather name="info" size={14} color={theme.colors.text.muted} />
        <Text style={styles.systemText}>{item.text}</Text>
      </Animated.View>
    );
  }

  // Quotation message
  if (isQuotation && item.quotation) {
    const statusColor = item.quotation.status === 'accepted' ? theme.colors.success[500] :
                        item.quotation.status === 'rejected' ? theme.colors.error[500] :
                        theme.colors.warning[500];
    return (
      <Animated.View style={[styles.quotationBubble, { opacity, transform: [{ scale }] }]}>
        <View style={styles.quotationHeader}>
          <Feather name="file-text" size={16} color={theme.colors.primary[500]} />
          <Text style={styles.quotationTitle}>Quotation</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusBadgeText}>{item.quotation.status}</Text>
          </View>
        </View>
        <Text style={styles.quotationAmount}>₹{item.quotation.amount?.toLocaleString()}</Text>
        {item.quotation.note && <Text style={styles.quotationNote}>{item.quotation.note}</Text>}
        <Text style={styles.timestamp}>{item.ts}</Text>
        
        {/* Accept/Reject buttons for owner */}
        {item.quotation.status === 'pending' && onAccept && onReject && (
          <View style={styles.quotationActions}>
            <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    );
  }

  // Delivery message
  if (isDelivery && item.delivery) {
    return (
      <Animated.View style={[styles.deliveryBubble, { opacity, transform: [{ scale }] }]}>
        <View style={styles.deliveryHeader}>
          <Feather name="truck" size={16} color={theme.colors.primary[500]} />
          <Text style={styles.deliveryTitle}>Delivery Details</Text>
        </View>
        {item.delivery.estimatedDeliveryDate && (
          <Text style={styles.deliveryText}>ETA: {new Date(item.delivery.estimatedDeliveryDate).toLocaleDateString()}</Text>
        )}
        {item.delivery.trackingNumber && (
          <Text style={styles.deliveryText}>Tracking: {item.delivery.trackingNumber}</Text>
        )}
        {item.delivery.carrier && (
          <Text style={styles.deliveryText}>Carrier: {item.delivery.carrier}</Text>
        )}
        <Text style={styles.timestamp}>{item.ts}</Text>
      </Animated.View>
    );
  }

  // Invoice message
  if (isInvoice && item.invoice) {
    return (
      <Animated.View style={[styles.invoiceBubble, { opacity, transform: [{ scale }] }]}>
        <View style={styles.invoiceHeader}>
          <Feather name="file" size={16} color={theme.colors.success[500]} />
          <Text style={styles.invoiceTitle}>Invoice Generated</Text>
        </View>
        <Text style={styles.invoiceNumber}>{item.invoice.invoiceNumber}</Text>
        <Text style={styles.invoiceAmount}>₹{item.invoice.amount?.toLocaleString()}</Text>
        <Text style={styles.timestamp}>{item.ts}</Text>
      </Animated.View>
    );
  }

  // Regular text message
  return (
    <Animated.View 
      style={[
        styles.bubble, 
        isOwnMessage ? styles.right : styles.left,
        {
          opacity,
          transform: [{ scale }],
        }
      ]}
    >
      {!isOwnMessage && item.senderName && (
        <Text style={styles.senderName}>{item.senderName}</Text>
      )}
      <Text style={[styles.messageText, isOwnMessage && styles.messageTextOwn]}>
        {item.text}
      </Text>
      <Text style={[styles.timestamp, isOwnMessage && styles.timestampOwn]}>
        {item.ts}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  bubble: {
    padding: 16,
    borderRadius: 20,
    marginVertical: 6,
    maxWidth: '80%',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  left: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.background.secondary,
    borderBottomLeftRadius: 6,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  right: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary[500],
    borderBottomRightRadius: 6,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.muted,
    marginBottom: 4,
  },
  messageText: {
    color: theme.colors.text.primary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  messageTextOwn: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 8,
    textAlign: 'right',
  },
  timestampOwn: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // System message styles
  systemBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 13,
    color: theme.colors.text.muted,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  // Quotation bubble styles
  quotationBubble: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary[200],
    alignSelf: 'stretch',
  },
  quotationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  quotationAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  quotationNote: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  quotationActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error[500],
    alignItems: 'center',
  },
  rejectButtonText: {
    color: theme.colors.error[500],
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.success[500],
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Delivery bubble styles
  deliveryBubble: {
    backgroundColor: theme.colors.secondary[50],
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    alignSelf: 'stretch',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
    marginLeft: 8,
  },
  deliveryText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  // Invoice bubble styles
  invoiceBubble: {
    backgroundColor: theme.colors.success[50],
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.success[200],
    alignSelf: 'stretch',
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success[500],
    marginLeft: 8,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  invoiceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.success[600],
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.muted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  refreshButtonText: {
    color: theme.colors.primary[500],
    fontWeight: '600',
    marginLeft: 8,
  },
  // Quotation button
  quotationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary[500],
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  quotationButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  // Chat closed bar
  chatClosedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary[100],
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  chatClosedText: {
    color: theme.colors.text.muted,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    padding: 16,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: theme.colors.background.primary,
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  send: {
    marginLeft: 12,
    backgroundColor: theme.colors.primary[500],
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sendDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.neutral[400],
  },
  // Modal styles
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
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  itemsPreview: {
    marginTop: 16,
    padding: 12,
    backgroundColor: theme.colors.secondary[50],
    borderRadius: 8,
  },
  itemText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});