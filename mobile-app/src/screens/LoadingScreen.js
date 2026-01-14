import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';

const LoadingScreen = () => {
  useEffect(() => {
    console.log('[LoadingScreen] Component mounted');
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo placeholder */}
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🏠</Text>
          <Text style={styles.companyName}>Houseway</Text>
          <Text style={styles.tagline}>House Design Company</Text>
        </View>
        
        {/* Loading indicator */}
        <ActivityIndicator 
          size="large" 
          color="#2196F3" 
          style={styles.loader}
        />
        
        <Text style={styles.loadingText}>Loading...</Text>
        <Text style={styles.debugText}>If this screen persists, check console logs</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoText: {
    fontSize: 80,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 5,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  debugText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default LoadingScreen;