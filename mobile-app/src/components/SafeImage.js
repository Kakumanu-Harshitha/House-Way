/**
 * SafeImage Component
 * A wrapper around Image that handles loading states, errors, and provides fallbacks
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * @param {Object} props
 * @param {string} props.uri - Image URI to load
 * @param {Object} props.style - Image style
 * @param {string} props.fallbackIcon - Icon name for fallback (default: 'image-outline')
 * @param {string} props.fallbackText - Text to show on error (default: 'Image unavailable')
 * @param {string} props.fallbackColor - Color for fallback icon/text (default: '#999')
 * @param {boolean} props.showLoader - Show loading indicator (default: true)
 * @param {string} props.loaderColor - Loading indicator color (default: '#2196F3')
 * @param {Function} props.onLoad - Callback when image loads successfully
 * @param {Function} props.onError - Callback when image fails to load
 * @param {string} props.resizeMode - Image resize mode (default: 'cover')
 */
const SafeImage = ({
  uri,
  style,
  fallbackIcon = 'image-outline',
  fallbackText = 'Image unavailable',
  fallbackColor = '#999',
  showLoader = true,
  loaderColor = '#2196F3',
  onLoad,
  onError,
  resizeMode = 'cover',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // If no URI provided, show fallback immediately
  if (!uri) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Ionicons name={fallbackIcon} size={40} color={fallbackColor} />
        {fallbackText && <Text style={[styles.fallbackText, { color: fallbackColor }]}>{fallbackText}</Text>}
      </View>
    );
  }

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
    if (onLoad) onLoad();
  };

  const handleError = (error) => {
    setIsLoading(false);
    setHasError(true);
    if (__DEV__) console.log('[SafeImage] Load error for:', uri, error?.nativeEvent?.error);
    if (onError) onError(error);
  };

  if (hasError) {
    return (
      <View style={[styles.fallbackContainer, style]}>
        <Ionicons name={fallbackIcon} size={40} color={fallbackColor} />
        {fallbackText && <Text style={[styles.fallbackText, { color: fallbackColor }]}>{fallbackText}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, style]}
        onLoad={handleLoad}
        onError={handleError}
        resizeMode={resizeMode}
        {...props}
      />
      {isLoading && showLoader && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="small" color={loaderColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  fallbackText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
});

export default SafeImage;
