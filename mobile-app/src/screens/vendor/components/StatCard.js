import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../theme';

export default function StatCard({ label, value }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius,
    padding: 16, width: '48%', marginBottom: 12,
    shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, elevation: 3
  },
  value: { fontSize: 26, fontWeight: '700', color: theme.colors.primary },
  label: { fontSize: 13, color: theme.colors.muted, marginTop: 6 }
});
