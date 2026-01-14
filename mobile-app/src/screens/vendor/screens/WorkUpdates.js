import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AppHeader from '../components/AppHeader';
import theme from '../../../styles/theme';
import { quotationsAPI } from '../../../utils/api';

export default function WorkUpdates({ navigation }) {
  const [approvedQuotations, setApprovedQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    loadApprovedQuotations(); 
  }, []);

  const loadApprovedQuotations = async () => {
    try {
      setLoading(true);
      console.log('[WorkUpdates] Loading approved quotations...');
      
      // Get all quotations for vendor
      const res = await quotationsAPI.getQuotations({ status: 'approved' });
      console.log('[WorkUpdates] Response:', res);
      
      if (res.success) {
        setApprovedQuotations(res.data.quotations || []);
        console.log('[WorkUpdates] Found', res.data.quotations?.length || 0, 'approved quotations');
      }
    } catch (error) {
      console.error('[WorkUpdates] Error loading:', error);
      Alert.alert('Error', 'Failed to load approved quotations');
    } finally {
      setLoading(false);
    }
  };

  const uploadWorkStatus = (quotation) => {
    navigation.navigate('UploadWorkStatus', { 
      quotation: quotation,
      materialRequest: quotation.materialRequest
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader title="Work Updates" onMenu={() => navigation.openDrawer()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading approved quotations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Work Updates" onMenu={() => navigation.openDrawer()} />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {approvedQuotations.map(quotation => (
          <View key={quotation._id} style={styles.card}>
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
                  ${quotation.totalAmount?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="calendar" size={16} color={theme.colors.text.muted} />
                <Text style={styles.infoText}>
                  Delivery: {quotation.deliveryTerms?.deliveryTime || 'N/A'} days
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => uploadWorkStatus(quotation)}
              activeOpacity={0.7}
            >
              <Feather name="upload" size={18} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Work Status</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}

        {approvedQuotations.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="clipboard" size={64} color={theme.colors.text.muted} />
            <Text style={styles.emptyText}>
              No approved quotations found
            </Text>
            <Text style={styles.emptySubtext}>
              Once your quotations are approved, you can upload work status here
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginLeft: 12,
    flex: 1,
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  cardBody: {
    padding: 16,
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
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: 16,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    marginRight: 8,
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
    color: theme.colors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.text.muted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});