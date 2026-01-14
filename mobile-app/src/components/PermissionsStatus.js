import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import {
  checkCameraPermission,
  checkMediaLibraryPermission,
  requestCameraPermission,
  requestMediaLibraryPermission,
} from '../utils/permissions';
import theme from '../styles/theme';

const PermissionsStatus = ({ onPermissionsChange }) => {
  const [permissions, setPermissions] = useState({
    camera: false,
    mediaLibrary: false,
    loading: true,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'web') {
      setPermissions({
        camera: true,
        mediaLibrary: true,
        loading: false,
      });
      return;
    }

    try {
      const [cameraResult, mediaResult] = await Promise.all([
        checkCameraPermission(),
        checkMediaLibraryPermission(),
      ]);

      const newPermissions = {
        camera: cameraResult.granted,
        mediaLibrary: mediaResult.granted,
        loading: false,
      };

      setPermissions(newPermissions);
      
      if (onPermissionsChange) {
        onPermissionsChange(newPermissions);
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({
        camera: false,
        mediaLibrary: false,
        loading: false,
      });
    }
  };

  const requestPermission = async (type) => {
    try {
      let result;
      if (type === 'camera') {
        result = await requestCameraPermission();
      } else {
        result = await requestMediaLibraryPermission();
      }

      if (result.granted) {
        // Refresh permissions status
        await checkPermissions();
        Alert.alert('Success', `${type === 'camera' ? 'Camera' : 'Photo Library'} permission granted!`);
      }
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error);
    }
  };

  if (Platform.OS === 'web' || permissions.loading) {
    return null;
  }

  const allGranted = permissions.camera && permissions.mediaLibrary;

  if (allGranted) {
    return (
      <View style={styles.container}>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>✅ Camera and Photo Library access granted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissions Required</Text>
      <Text style={styles.description}>
        To upload profile photos, please grant the following permissions:
      </Text>
      
      <View style={styles.permissionsList}>
        <View style={styles.permissionItem}>
          <Text style={styles.permissionText}>
            {permissions.camera ? '✅' : '❌'} Camera Access
          </Text>
          {!permissions.camera && (
            <TouchableOpacity
              style={styles.grantButton}
              onPress={() => requestPermission('camera')}
            >
              <Text style={styles.grantButtonText}>Grant</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.permissionItem}>
          <Text style={styles.permissionText}>
            {permissions.mediaLibrary ? '✅' : '❌'} Photo Library Access
          </Text>
          {!permissions.mediaLibrary && (
            <TouchableOpacity
              style={styles.grantButton}
              onPress={() => requestPermission('mediaLibrary')}
            >
              <Text style={styles.grantButtonText}>Grant</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.secondary,
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  permissionsList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    flex: 1,
  },
  grantButton: {
    backgroundColor: theme.colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  grantButtonText: {
    color: theme.colors.primary.contrast,
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.success.main,
    fontWeight: '500',
  },
});

export default PermissionsStatus;
