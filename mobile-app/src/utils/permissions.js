import { Platform, Alert, Linking } from 'react-native';
// import * as ImagePicker from 'expo-image-picker';
// import * as MediaLibrary from 'expo-media-library';
// import { Camera } from 'expo-camera';

/**
 * Request camera permissions
 */
export const requestCameraPermission = async () => {
  try {
    if (Platform.OS === 'web') {
      return { granted: true };
    }

    // Request camera permission - temporarily disabled
    // const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const cameraPermission = { status: 'granted' }; // Mock for now
    
    if (cameraPermission.status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'This app needs camera access to take photos. Please enable camera permission in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return { granted: false, message: 'Camera permission denied' };
    }

    return { granted: true };
  } catch (error) {
    console.error('Error requesting camera permission:', error);
    return { granted: false, message: 'Failed to request camera permission' };
  }
};

/**
 * Request media library permissions
 */
export const requestMediaLibraryPermission = async () => {
  try {
    if (Platform.OS === 'web') {
      return { granted: true };
    }

    // Request media library permission - temporarily disabled
    // const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const mediaPermission = { status: 'granted' }; // Mock for now
    
    if (mediaPermission.status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'This app needs access to your photo library to select images. Please enable photo library permission in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() }
        ]
      );
      return { granted: false, message: 'Media library permission denied' };
    }

    return { granted: true };
  } catch (error) {
    console.error('Error requesting media library permission:', error);
    return { granted: false, message: 'Failed to request media library permission' };
  }
};

/**
 * Check if camera permission is granted
 */
export const checkCameraPermission = async () => {
  try {
    if (Platform.OS === 'web') {
      return { granted: true };
    }

    // const permission = await ImagePicker.getCameraPermissionsAsync();
    const permission = { status: 'granted' }; // Mock for now
    return { granted: permission.status === 'granted' };
  } catch (error) {
    console.error('Error checking camera permission:', error);
    return { granted: false };
  }
};

/**
 * Check if media library permission is granted
 */
export const checkMediaLibraryPermission = async () => {
  try {
    if (Platform.OS === 'web') {
      return { granted: true };
    }

    // const permission = await ImagePicker.getMediaLibraryPermissionsAsync();
    const permission = { status: 'granted' }; // Mock for now
    return { granted: permission.status === 'granted' };
  } catch (error) {
    console.error('Error checking media library permission:', error);
    return { granted: false };
  }
};

/**
 * Request all necessary permissions for image picking
 */
export const requestAllImagePermissions = async () => {
  try {
    const cameraResult = await requestCameraPermission();
    const mediaResult = await requestMediaLibraryPermission();

    return {
      camera: cameraResult.granted,
      mediaLibrary: mediaResult.granted,
      allGranted: cameraResult.granted && mediaResult.granted
    };
  } catch (error) {
    console.error('Error requesting all permissions:', error);
    return {
      camera: false,
      mediaLibrary: false,
      allGranted: false
    };
  }
};

/**
 * Show permission explanation dialog
 */
export const showPermissionExplanation = (type = 'both') => {
  let title = 'Permissions Required';
  let message = '';

  switch (type) {
    case 'camera':
      message = 'To take photos for your profile, this app needs access to your camera. This allows you to capture new photos directly within the app.';
      break;
    case 'gallery':
      message = 'To select photos from your gallery, this app needs access to your photo library. This allows you to choose existing photos for your profile.';
      break;
    default:
      message = 'To manage your profile photos, this app needs access to your camera and photo library. This allows you to take new photos or select existing ones from your gallery.';
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { 
          text: 'Not Now', 
          style: 'cancel',
          onPress: () => resolve(false)
        },
        { 
          text: 'Grant Permissions', 
          onPress: () => resolve(true)
        }
      ]
    );
  });
};

/**
 * Handle permission denied scenario
 */
export const handlePermissionDenied = (permissionType) => {
  const messages = {
    camera: 'Camera access is required to take photos. Please enable it in Settings > Privacy > Camera.',
    gallery: 'Photo library access is required to select images. Please enable it in Settings > Privacy > Photos.',
    both: 'Camera and photo library access are required for full functionality. Please enable them in your device settings.'
  };

  Alert.alert(
    'Permission Required',
    messages[permissionType] || messages.both,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() }
    ]
  );
};
