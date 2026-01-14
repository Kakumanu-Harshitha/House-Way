import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import api from '../utils/api';

const ApiDebugger = () => {
  const [apiStatus, setApiStatus] = useState('checking...');
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    checkApiConnection();
  }, []);

  const checkApiConnection = async () => {
    try {
      // Get the base URL being used
      const url = api.defaults.baseURL;
      setBaseUrl(url);
      
      // Test the health endpoint
      const response = await api.get('/health');
      if (response.status === 'OK') {
        setApiStatus('✅ Connected');
      } else {
        setApiStatus('❌ API Error');
      }
    } catch (error) {
      console.error('API Debug Error:', error);
      setApiStatus(`❌ Failed: ${error.message}`);
    }
  };

  if (!__DEV__ || Platform.OS !== 'web') {
    return null; // Only show on web for debugging
  }

  return (
    <View style={styles.debugContainer}>
      <Text style={styles.debugTitle}>🔧 API Debug Info</Text>
      <Text style={styles.debugText}>Platform: {Platform.OS}</Text>
      <Text style={styles.debugText}>Base URL: {baseUrl}</Text>
      <Text style={styles.debugText}>Status: {apiStatus}</Text>
      <TouchableOpacity style={styles.refreshButton} onPress={checkApiConnection}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  debugContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 5,
    zIndex: 1000,
    minWidth: 200,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugText: {
    color: '#fff',
    fontSize: 10,
    marginBottom: 2,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    padding: 5,
    borderRadius: 3,
    marginTop: 5,
    alignItems: 'center',
  },
  refreshText: {
    color: '#fff',
    fontSize: 10,
  },
});

export default ApiDebugger;
