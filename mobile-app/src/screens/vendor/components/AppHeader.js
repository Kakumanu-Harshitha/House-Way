import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import theme from '../../../styles/theme';

export default function AppHeader({ title, onBack, onMenu, onNotifications }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      ) : onMenu ? (
        <TouchableOpacity onPress={onMenu}>
          <Feather name="menu" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 24 }} />
      )}
      
      <Text style={styles.title}>{title}</Text>
      
      {onNotifications ? (
        <TouchableOpacity onPress={onNotifications}>
          <Feather name="bell" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 24 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 18, 
    paddingHorizontal: 18, 
    paddingBottom: 12,
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: theme.colors.text.primary
  },
});