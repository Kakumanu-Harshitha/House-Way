/**
 * NegotiationChatScreen
 * 
 * A professional, shared chat interface for quotation negotiations.
 * Used by both Admin (Owner) and Vendor roles.
 * 
 * Features:
 * - Real-time chat with text messages
 * - Quotation nodes with Accept/Negotiate actions
 * - Invoice display nodes
 * - System messages for order events
 * - Order header with status and details
 * - Socket.io real-time updates
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Import chat components
import QuotationNode from '../../components/chat/QuotationNode';
import InvoiceNode from '../../components/chat/InvoiceNode';
import SystemMessageNode from '../../components/chat/SystemMessageNode';
import TextMessageNode from '../../components/chat/TextMessageNode';
import QuotationInputModal from '../../components/chat/QuotationInputModal';
import DeliveryStatusNode from '../../components/chat/DeliveryStatusNode';

// Import API and Context
import { ordersAPI } from '../../services/ordersAPI';
import { useAuth } from '../../context/AuthContext';
import socket from '../../utils/socket';

const NegotiationChatScreen = ({ route, navigation }) => {
  const { orderId, userRole: routeUserRole } = route.params || {};
  
  // Get user from auth context
  const { user } = useAuth();
  
  // Determine user role from auth or route params
  const userRole = user?.role || routeUserRole || 'owner';
  const currentUserId = user?._id || (userRole === 'vendor' ? 'vendor_1' : 'owner_001');
  
  // State
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isRevision, setIsRevision] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pendingRejectId, setPendingRejectId] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  // Refs
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  
  // Load order and messages
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    
    try {
      console.log('[NegotiationChat] Loading order:', orderId);
      
      // Fetch both order and messages in parallel
      const [orderResponse, messagesResponse] = await Promise.all([
        ordersAPI.getOrder(orderId),
        ordersAPI.getMessages(orderId)
      ]);
      
      if (orderResponse.success && orderResponse.data) {
        const orderData = orderResponse.data.purchaseOrder || orderResponse.data.order || orderResponse.data;
        console.log('[NegotiationChat] Order loaded:', orderData?.purchaseOrderNumber);
        setOrder(orderData);
      } else {
        console.error('[NegotiationChat] Load order failed:', orderResponse.message);
        Alert.alert('Error', orderResponse.message || 'Failed to load order');
        navigation.goBack();
        return;
      }
      
      if (messagesResponse.success) {
        const messages = messagesResponse.data || [];
        console.log('[NegotiationChat] Messages count:', messages.length);
        setMessages(messages);
      } else {
        console.error('[NegotiationChat] Load messages failed:', messagesResponse.message);
        // Don't fail - just show empty messages
        setMessages([]);
      }
    } catch (error) {
      console.error('[NegotiationChat] Load error:', error);
      Alert.alert('Error', 'Failed to load order data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orderId, navigation]);
  
  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Mark messages as read when entering the chat
  useEffect(() => {
    if (orderId) {
      ordersAPI.markMessagesRead(orderId).catch(err => {
        console.log('[NegotiationChat] Failed to mark messages as read:', err);
      });
    }
  }, [orderId]);
  
  // Auto-open quotation form for vendor when order is 'sent' status (first quotation)
  useEffect(() => {
    if (order && userRole === 'vendor' && order.status === 'sent' && messages.length === 0 && !isLoading) {
      // Vendor is opening a new order for the first time - auto-open quotation form
      console.log('[NegotiationChat] Auto-opening quotation form for new order');
      setTimeout(() => {
        setSelectedQuotation(null);
        setIsRevision(false);
        setShowQuotationModal(true);
      }, 500);
    }
  }, [order, userRole, messages.length, isLoading]);
  
  // Socket connection for real-time updates
  useEffect(() => {
    if (!orderId) return;
    
    console.log('[NegotiationChat] Setting up socket listeners for order:', orderId);
    
    // Join the order room
    socket.emit('joinOrder', { orderId, userId: currentUserId, userRole });
    
    // Listen for new messages
    const handleNewMessage = (message) => {
      console.log('[NegotiationChat] New message received:', message);
      if (message.order === orderId || message.order?._id === orderId) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === message._id)) {
            return prev;
          }
          return [...prev, message];
        });
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    };
    
    // Listen for quotation updates
    const handleQuotationUpdate = (data) => {
      console.log('[NegotiationChat] Quotation update:', data);
      if (data.orderId === orderId) {
        // Reload to get fresh data
        loadData(false);
      }
    };
    
    // Listen for order status updates
    const handleOrderUpdate = (data) => {
      console.log('[NegotiationChat] Order update:', data);
      if (data.orderId === orderId || data._id === orderId) {
        setOrder(prev => ({ ...prev, ...data }));
      }
    };
    
    // Listen for typing indicator
    const handleTyping = ({ userId, isTyping }) => {
      if (userId !== currentUserId) {
        setIsOtherTyping(isTyping);
        // Auto-clear typing after 3 seconds
        if (isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsOtherTyping(false);
          }, 3000);
        }
      }
    };
    
    socket.on('newMessage', handleNewMessage);
    socket.on('quotationSubmitted', handleQuotationUpdate);
    socket.on('quotationAccepted', handleQuotationUpdate);
    socket.on('quotationRejected', handleQuotationUpdate);
    socket.on('orderUpdated', handleOrderUpdate);
    socket.on('userTyping', handleTyping);
    
    return () => {
      console.log('[NegotiationChat] Cleaning up socket listeners');
      socket.off('newMessage', handleNewMessage);
      socket.off('quotationSubmitted', handleQuotationUpdate);
      socket.off('quotationAccepted', handleQuotationUpdate);
      socket.off('quotationRejected', handleQuotationUpdate);
      socket.off('orderUpdated', handleOrderUpdate);
      socket.off('userTyping', handleTyping);
      socket.emit('leaveOrder', { orderId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [orderId, currentUserId, userRole, loadData]);
  
  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };
  
  // Handle text input change and emit typing status
  const handleTextChange = (text) => {
    setInputText(text);
    // Emit typing indicator
    socket.emit('typing', { orderId, userId: currentUserId, isTyping: text.length > 0 });
  };
  
  // Send text message
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    if (!canSendMessages) {
      Alert.alert('Chat closed', 'This negotiation is closed after invoice generation. Please use delivery updates.');
      return;
    }
    
    setIsSending(true);
    setInputText('');
    
    try {
      const response = await ordersAPI.sendMessage(orderId, text);
      
      if (response.success) {
        // Add message locally immediately (optimistic update)
        setMessages(prev => [...prev, response.data]);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', response.message || 'Failed to send message');
        setInputText(text); // Restore text
      }
    } catch (error) {
      console.error('Send error:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };
  
  // Submit quotation
  const handleSubmitQuotation = async (quotationData) => {
    if (!canSubmitQuotation) {
      Alert.alert('Chat closed', 'Negotiation is locked after invoice generation. No new quotations can be submitted.');
      return;
    }

    try {
      const response = await ordersAPI.submitQuotation(orderId, quotationData);
      
      if (response.success) {
        setMessages(prev => [...prev, response.data]);
        setShowQuotationModal(false);
        setSelectedQuotation(null);
        setIsRevision(false);
        
        // Update order status if changed
        if (response.order) {
          setOrder(response.order);
        }
        
        // Emit socket event for real-time update
        socket.emit('quotationSubmitted', {
          orderId,
          quotation: response.data,
          userId: currentUserId,
        });
        
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        
        Alert.alert('Success', 'Quotation submitted successfully');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      console.error('Submit quotation error:', error);
      Alert.alert('Error', error.message || 'Failed to submit quotation');
    }
  };
  
  // Handle negotiate action
  const handleNegotiate = (messageId, quotation) => {
    setSelectedQuotation(quotation);
    setIsRevision(true);
    setShowQuotationModal(true);
  };
  
  // Handle accept quotation
  const handleAcceptQuotation = async (messageId, quotation) => {
    console.log('=== ACCEPT QUOTATION START ===');
    console.log('messageId:', messageId);
    console.log('orderId:', orderId);
    console.log('quotation:', quotation);
    
    // Validate quotation before accepting
    if (!quotation || !quotation.amount) {
      Alert.alert('Error', 'Invalid quotation data - cannot accept');
      return;
    }
    
    if (quotation.status !== 'pending') {
      Alert.alert('Error', `Quotation is not pending (status: ${quotation.status})`);
      return;
    }
    
    if (!orderId) {
      Alert.alert('Error', 'Order ID missing');
      return;
    }

    // Update UI immediately to show processing
    setAcceptingId(messageId);
    
    // Immediately update local state for instant feedback
    setMessages(prev => prev.map(msg => {
      if (msg._id === messageId && msg.quotation) {
        return { ...msg, quotation: { ...msg.quotation, status: 'accepted' } };
      }
      return msg;
    }));

    try {
      console.log('Calling API...');
      const response = await ordersAPI.acceptQuotation(orderId, messageId);
      console.log('API Response:', response);
      console.log('Response debug:', response.debug);
      
      if (response.success) {
        // Update order state
        setOrder(prev => ({ ...prev, status: 'accepted', chatClosed: true }));
        
        // Reload to get invoice and system messages
        await loadData(false);
        
        Alert.alert('Success', 'Quotation accepted! Invoice generated.');
      } else {
        // Reload data to sync with server state
        console.log('[Accept] Failed - reloading to sync state');
        await loadData(false);
        
        const debugInfo = response.debug ? 
          `\n\nDebug Info:\nStatus: ${response.debug.currentStatus}\nAmount: ₹${response.debug.quotationAmount || 'N/A'}\nOrder Status: ${response.debug.purchaseOrderStatus}` 
          : '';
        Alert.alert('Error', (response.message || 'Failed to accept') + debugInfo);
      }
    } catch (error) {
      console.error('Accept error:', error);
      // Reload data to sync with server state
      await loadData(false);
      Alert.alert('Error', error.message || 'Network error. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };
  
  // Handle reject quotation
  const handleRejectQuotation = async (messageId, quotation) => {
    if (userRole !== 'owner' && userRole !== 'employee') {
      Alert.alert('Not allowed', 'Only admins can decline quotations.');
      return;
    }

    if (chatLocked) {
      Alert.alert('Chat closed', 'This negotiation is locked after invoice generation.');
      return;
    }

    setPendingRejectId(messageId);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!pendingRejectId) return;

    try {
      setIsRejecting(true);
      const response = await ordersAPI.rejectQuotation(orderId, pendingRejectId, rejectReason.trim());

      if (response.success) {
        await loadData(false);
      } else {
        Alert.alert('Error', response.message || 'Failed to reject quotation');
      }
    } catch (error) {
      console.error('Reject error:', error);
      Alert.alert('Error', 'Failed to reject quotation');
    } finally {
      setIsRejecting(false);
      setRejectModalVisible(false);
      setPendingRejectId(null);
      setRejectReason('');
    }
  };
  
  // View invoice
  const handleViewInvoice = async (invoiceData) => {
    try {
      // Fetch full invoice details
      const response = await ordersAPI.getInvoice(invoiceData.invoiceId);
      
      if (response.success && response.data) {
        const invoice = response.data;
        
        // Format invoice details for display
        const itemsList = invoice.items?.map((item, idx) => 
          `${idx + 1}. ${item.name || item.description} - ${item.quantity} ${item.unit} @ ₹${item.unitPrice} = ₹${item.total.toLocaleString()}`
        ).join('\n') || '';
        
        const details = `
Invoice: ${invoice.invoiceNumber}
Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}
Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}

Items:
${itemsList}

Subtotal: ₹${invoice.subtotal.toLocaleString()}
Tax (${invoice.tax?.rate}%): ₹${invoice.tax?.amount.toLocaleString()}
Discount: ₹${invoice.discount?.amount || 0}

Total Amount: ₹${invoice.totalAmount.toLocaleString()}
Amount Paid: ₹${invoice.amountPaid || 0}
Amount Due: ₹${invoice.amountDue.toLocaleString()}

Status: ${invoice.status.toUpperCase()}
        `.trim();
        
        Alert.alert('Invoice Details', details, [
          { text: 'Download', onPress: () => handleDownloadInvoice(invoiceData) },
          { text: 'Close' }
        ]);
      } else {
        Alert.alert('Error', 'Failed to load invoice details');
      }
    } catch (error) {
      console.error('View invoice error:', error);
      Alert.alert('Error', 'Failed to load invoice');
    }
  };
  
  // Download invoice
  const handleDownloadInvoice = async (invoiceData) => {
    try {
      const response = await ordersAPI.downloadInvoice(invoiceData.invoiceId);
      if (response.success && response.data?.fileUrl) {
        const url = response.data.fileUrl;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Download', 'Invoice link is ready, but cannot be opened on this device.');
        }
      } else {
        Alert.alert('Info', response.message || 'Invoice download link is not available yet.');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download invoice');
    }
  };
  // Track delivery (navigate to delivery screen)
  const handleTrackDelivery = () => {
    if (userRole === 'vendor') {
      navigation.navigate('VendorDelivery', { orderId });
    } else {
      navigation.navigate('AdminDeliveryTracking', { orderId });
    }
  };
  
  // Get sender name for message
  const getSenderName = (message) => {
    if (message.sender) {
      return `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim();
    }
    return message.senderRole === 'vendor' ? 'Vendor' : 'Admin';
  };
  
  // Check if message is from current user
  const isOwnMessage = (message) => {
    if (message.sender?._id) {
      return message.sender._id === currentUserId;
    }
    return message.senderRole === userRole;
  };
  
  // Render message item
  const renderMessage = ({ item: message, index }) => {
    const own = isOwnMessage(message);
    const senderName = getSenderName(message);
    
    // Show date separator
    const showDateSeparator = index === 0 || 
      new Date(messages[index - 1]?.createdAt).toDateString() !== 
      new Date(message.createdAt).toDateString();
    
    return (
      <View>
        {showDateSeparator && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateSeparatorText}>
              {new Date(message.createdAt).toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        )}
        
        {message.messageType === 'system' && (
          <SystemMessageNode 
            message={message} 
            systemEvent={message.systemEvent}
            onNavigateToDelivery={
              (message.systemEvent === 'quotation_accepted' || message.systemEvent === 'invoice_generated') 
                ? handleTrackDelivery 
                : null
            }
            userRole={userRole}
          />
        )}
        
        {message.messageType === 'text' && (
          <TextMessageNode 
            message={message} 
            isOwnMessage={own}
            senderName={!own ? senderName : null}
          />
        )}
        
        {message.messageType === 'quotation' && (
          <QuotationNode
            message={message}
            quotation={message.quotation}
            isOwnMessage={own}
            userRole={userRole}
            isProcessing={acceptingId === message._id}
            onAccept={handleAcceptQuotation}
            onNegotiate={handleNegotiate}
            onReject={handleRejectQuotation}
            disabled={chatLocked || order?.status === 'accepted' || order?.status === 'completed'}
          />
        )}
        
        {message.messageType === 'invoice' && (
          <InvoiceNode
            message={message}
            invoice={message.invoice}
            isOwnMessage={own}
            userRole={userRole}
            onViewInvoice={handleViewInvoice}
            onDownloadInvoice={handleDownloadInvoice}
          />
        )}
        
        {message.messageType === 'delivery' && (
          <DeliveryStatusNode
            message={message}
            deliveryDetails={message.delivery}
            isOwnMessage={own}
            userRole={userRole}
            onTrackDelivery={handleTrackDelivery}
          />
        )}
      </View>
    );
  };
  
  // Get status badge config
  const getStatusConfig = (status) => {
    const configs = {
      draft: { color: '#6B7280', bgColor: '#F3F4F6', label: 'Draft' },
      sent: { color: '#3B82F6', bgColor: '#DBEAFE', label: 'Sent' },
      in_negotiation: { color: '#F59E0B', bgColor: '#FEF3C7', label: 'Negotiating' },
      accepted: { color: '#10B981', bgColor: '#D1FAE5', label: 'Accepted' },
      rejected: { color: '#EF4444', bgColor: '#FEE2E2', label: 'Rejected' },
      completed: { color: '#059669', bgColor: '#D1FAE5', label: 'Completed' },
      cancelled: { color: '#6B7280', bgColor: '#F3F4F6', label: 'Cancelled' },
    };
    return configs[status] || configs.draft;
  };

  const hasInvoiceMessage = messages.some(message => message.messageType === 'invoice');
  const chatLocked = !!order?.chatClosed || hasInvoiceMessage || order?.status === 'accepted' || order?.status === 'completed';
  
  // Can user send messages?
  const canSendMessages = order && 
    !chatLocked &&
    order.status !== 'draft' && 
    order.status !== 'cancelled';
  
  // Can user submit quotation?
  const canSubmitQuotation = canSendMessages && 
    userRole === 'vendor';
  
  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const statusConfig = getStatusConfig(order?.status);
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {order?.title || 'Order Negotiation'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>
              {userRole === 'vendor' 
                ? `${order?.createdBy?.firstName || 'Admin'} • ${order?.project?.title || 'Project'}`
                : `${order?.vendor?.vendorDetails?.companyName || order?.vendor?.firstName || 'Vendor'} • ${order?.project?.title || 'Project'}`
              }
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => Alert.alert('Order Details', `Order: ${order?.purchaseOrderNumber || order?.orderNumber || 'N/A'}`)}
          >
            <MaterialIcons name="more-vert" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {/* Order Info Banner */}
        {order?.totalAmount && (
          <View style={styles.infoBanner}>
            <MaterialIcons name="receipt" size={18} color="#059669" />
            <Text style={styles.infoBannerText}>
              Order Amount: ₹{order.totalAmount.toLocaleString()}
            </Text>
          </View>
        )}
        
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
            />
          }
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
          ListFooterComponent={null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="message-text-outline" 
                size={60} 
                color="#D1D5DB" 
              />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                {userRole === 'vendor' 
                  ? 'Submit a quotation to start the negotiation'
                  : 'Waiting for vendor to submit a quotation'
                }
              </Text>
            </View>
          }
        />
        
        {/* Typing Indicator */}
        {isOtherTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {userRole === 'vendor' ? 'Admin' : 'Vendor'} is typing...
            </Text>
          </View>
        )}
        
        {/* Input Area */}
        {canSendMessages && (
          <View style={styles.inputArea}>
            {/* Quotation Button */}
            {canSubmitQuotation && (
              <TouchableOpacity 
                style={styles.quotationButton}
                onPress={() => {
                  setSelectedQuotation(null);
                  setIsRevision(false);
                  setShowQuotationModal(true);
                }}
              >
                <MaterialCommunityIcons 
                  name="file-document-outline" 
                  size={22} 
                  color="#3B82F6" 
                />
              </TouchableOpacity>
            )}
            
            {/* Text Input */}
            <View style={styles.inputContainer}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={inputText}
                onChangeText={handleTextChange}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={1000}
              />
            </View>
            
            {/* Send Button */}
            <TouchableOpacity 
              style={[
                styles.sendButton,
                (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {/* Disabled message input notice */}
        {!canSendMessages && order?.status !== 'draft' && (
          <View style={styles.disabledNotice}>
            <MaterialIcons name="info-outline" size={16} color="#6B7280" />
            <Text style={styles.disabledNoticeText}>
              {chatLocked
                ? 'Negotiation closed after invoice. Use delivery updates instead.'
                : order?.status === 'completed' 
                  ? 'This order has been completed'
                  : order?.status === 'cancelled'
                    ? 'This order was cancelled'
                    : 'Messaging is not available'
              }
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setRejectModalVisible(false);
          setPendingRejectId(null);
          setRejectReason('');
        }}
      >
        <View style={styles.rejectModalOverlay}>
          <View style={styles.rejectModal}>
            <Text style={styles.rejectTitle}>Decline quotation</Text>
            <Text style={styles.rejectSubtitle}>Add a short reason (optional). The vendor will see this in chat.</Text>

            <View style={styles.rejectInputWrapper}>
              <TextInput
                style={styles.rejectTextInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Reason for decline"
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={240}
              />
            </View>

            <View style={styles.rejectActions}>
              <TouchableOpacity
                style={styles.rejectActionButton}
                onPress={() => {
                  setRejectModalVisible(false);
                  setPendingRejectId(null);
                  setRejectReason('');
                }}
              >
                <Text style={styles.rejectActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectActionButton, styles.rejectActionPrimary, isRejecting && styles.rejectActionDisabled]}
                disabled={isRejecting}
                onPress={handleConfirmReject}
              >
                <Text style={[styles.rejectActionText, styles.rejectActionPrimaryText]}>
                  {isRejecting ? 'Declining...' : 'Decline'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Quotation Modal */}
      <QuotationInputModal
        visible={showQuotationModal}
        onClose={() => {
          setShowQuotationModal(false);
          setSelectedQuotation(null);
          setIsRevision(false);
        }}
        onSubmit={handleSubmitQuotation}
        order={order}
        previousQuotation={selectedQuotation}
        isRevision={isRevision}
        userRole={userRole}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  infoBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  quotationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 80,
    padding: 0,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  disabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  disabledNoticeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  rejectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  rejectModal: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 16,
    padding: 20,
  },
  rejectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  rejectSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },
  rejectInputWrapper: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  rejectTextInput: {
    minHeight: 80,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },
  rejectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  rejectActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  rejectActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rejectActionPrimary: {
    backgroundColor: '#EF4444',
  },
  rejectActionPrimaryText: {
    color: '#FFFFFF',
  },
  rejectActionDisabled: {
    opacity: 0.7,
  },
});

export default NegotiationChatScreen;
