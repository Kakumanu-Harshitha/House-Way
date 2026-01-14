import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../theme';

export default function FloatingButton({ onPress, label }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress}>
      <Text style={styles.text}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute', right: 18, bottom: 24,
    width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary, shadowColor: theme.colors.shadow, elevation: 6
  },
  text: { color: '#fff', fontSize: 28, fontWeight: '700' }
});
