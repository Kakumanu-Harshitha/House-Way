import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import theme from '../../../styles/theme';

export default function MaterialCard({ 
  item, 
  onAccept, 
  onDecline, 
  onView, 
  onChat,
  showAcceptButton = true, 
  acceptButtonText = 'Accept',
  quotationStatus = null,
  index = 0
}) {
  console.log('[MaterialCard] Rendering with quotationStatus:', quotationStatus);
  
  // Animation reference
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Trigger animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 100, // Staggered animation
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 100, // Staggered animation
        useNativeDriver: true,
      })
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  // Extract relevant data from the material request item
  const title = item.title || 'Untitled Request';
  const projectTitle = item.project?.title || 'Unknown Project';
  const materialsCount = item.materials?.length || 0;
  const totalQuantity = item.materials ? item.materials.reduce((total, material) => total + (material.quantity || 0), 0) : 0;
  const deadline = item.requiredBy ? new Date(item.requiredBy).toLocaleDateString() : 'No deadline';
  const status = item.status || 'pending';
  const priority = item.priority || 'medium';
  
  // Priority color mapping
  const getPriorityColor = () => {
    switch(priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'medium': return '#3B82F6';
      case 'low': return '#10B981';
      default: return theme.colors.text.muted;
    }
  };

  // Status color mapping
  const getStatusColor = () => {
    switch(status) {
      case 'pending': return '#F59E0B';
      case 'approved': return '#10B981';
      case 'rejected': return '#EF4444';
      default: return theme.colors.text.muted;
    }
  };

  return (
    <Animated.View 
      style={[
        styles.card,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="package" size={20} color={theme.colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.projectText} numberOfLines={1}>{projectTitle}</Text>
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
          <Text style={styles.priorityText}>{priority.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Feather name="layers" size={16} color={theme.colors.text.muted} />
            <Text style={styles.infoText}>{materialsCount} items</Text>
          </View>
          <View style={styles.infoItem}>
            <Feather name="calendar" size={16} color={theme.colors.text.muted} />
            <Text style={styles.infoText}>{deadline}</Text>
          </View>
        </View>

        {quotationStatus && (
          <View style={styles.quotationRow}>
            <Feather name="file-text" size={16} color={theme.colors.primary} />
            <Text style={styles.quotationText}>Quotation: {quotationStatus}</Text>
          </View>
        )}

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.viewButton} 
          onPress={() => {
            console.log('[MaterialCard] View button clicked');
            onView();
          }}
          activeOpacity={0.7}
        >
          <Feather name="eye" size={16} color={theme.colors.primary} />
          <Text style={styles.viewText}>View</Text>
        </TouchableOpacity>
        
        {quotationStatus && onChat && (
          <TouchableOpacity 
            style={styles.chatButton} 
            onPress={() => {
              console.log('[MaterialCard] Chat button clicked');
              onChat();
            }}
            activeOpacity={0.7}
          >
            <Feather name="message-circle" size={16} color="#fff" />
            <Text style={styles.chatText}>Chat</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.acceptButton, quotationStatus && styles.updateButton]} 
          onPress={() => {
            console.log('[MaterialCard] Action button clicked:', acceptButtonText);
            if (onAccept) onAccept();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.acceptText}>{quotationStatus ? 'Update' : acceptButtonText}</Text>
          <Feather name={quotationStatus ? 'edit-2' : 'arrow-right'} size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  projectText: {
    fontSize: 14,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  body: {
    padding: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quotationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  quotationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C5046',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 16,
    backgroundColor: '#fff',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background.primary,
    marginRight: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  viewText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary[500],
    marginLeft: 6,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginRight: 6,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success[500],
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 80,
  },
  chatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  updateButton: {
    backgroundColor: theme.colors.warning[500],
  },
  placeholderButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.text.muted,
  },
});