import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Platform } from 'react-native';
import 'react-native-gesture-handler';

// Import providers and navigation
import { AuthProvider } from './src/context/AuthContext';
import { AttendanceProvider } from './src/context/AttendanceContext';
import AppNavigator from './src/navigation/AppNavigator';
import WebStyleInjector from './src/components/WebStyleInjector.js';

export default function App() {
  useEffect(() => {
    console.log('[App] Component mounted');
    
    // Ensure web scrolling is enabled
    if (Platform.OS === 'web') {
      document.documentElement.style.overflow = 'auto';
      document.body.style.overflow = 'auto';
    }
  }, []);

  console.log('[App] Rendering App component');

  return (
    <AuthProvider>
      <AttendanceProvider>
        <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
          <WebStyleInjector />
          <StatusBar style="auto" />
          <AppNavigator />
        </View>
      </AttendanceProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webContainer: {
    width: '100%',
    height: '100%',
    minHeight: '100vh',
  },
});