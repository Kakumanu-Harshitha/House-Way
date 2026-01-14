import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../theme';

export default function QuotationCard({ q, onOpen }) {
  // Extract relevant data from the quotation object
  const projectTitle = q.materialRequest?.project?.title || 'Untitled Project';
  const status = q.status || 'draft';
  const amount = q.totalAmount || 0;
  const createdAt = q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'Unknown date';
  
  // Determine status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return theme.colors.success;
      case 'submitted': return theme.colors.warning;
      case 'rejected': return theme.colors.danger;
      case 'draft': return theme.colors.muted;
      default: return theme.colors.primary;
    }
  };

  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={styles.project} numberOfLines={1}>{projectTitle}</Text>
        <Text style={[styles.badge, { backgroundColor: getStatusColor(status) }]}>{status}</Text>
      </View>
      <Text style={styles.amount}>${amount.toLocaleString()}</Text>
      <Text style={styles.meta}>#{q.quotationNumber || q._id?.slice(-8)} · {createdAt}</Text>
      <TouchableOpacity style={styles.open} onPress={onOpen}>
        <Text style={{color: theme.colors.primary}}>Open</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    padding: 14, 
    borderRadius: theme.radius, 
    backgroundColor: theme.colors.card, 
    marginBottom: 12, 
    shadowColor: theme.colors.shadow, 
    elevation: 2 
  },
  project: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: theme.colors.text,
    flex: 1,
    marginRight: 10
  },
  badge: { 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12, 
    color: '#fff', 
    fontWeight: '700' 
  },
  amount: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginTop: 8 
  },
  meta: { 
    color: theme.colors.muted, 
    marginTop: 6 
  },
  open: { 
    marginTop: 12, 
    alignSelf: 'flex-end' 
  }
});