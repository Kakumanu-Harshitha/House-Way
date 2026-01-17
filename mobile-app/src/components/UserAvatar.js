import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { getProfileImageUrl } from '../utils/api';
import theme from '../styles/theme';

const UserAvatar = ({ 
  user, 
  initials,
  size = 40, 
  style, 
  showInitials = true, 
  backgroundColor,
  textColor 
}) => {
  const [imageError, setImageError] = useState(false);

  // Reset error state when user or photo changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profilePhoto, user?.profileImage, user?._id]);

  if (!user && !initials) {
    if (showInitials) {
      return (
        <View style={[
          styles.container, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: backgroundColor || theme.colors.surface,
          }, 
          style
        ]}>
          <Text style={[
            styles.text, 
            { 
              fontSize: size * 0.4,
              color: textColor || theme.colors.text.primary 
            }
          ]}>
            ?
          </Text>
        </View>
      );
    }
    return null;
  }

  // Strict check: profilePhoto takes precedence, alias to profileImage if needed
  const profilePhotoUrl = user?.profilePhoto || user?.profileImage;
  const hasPhoto = !!profilePhotoUrl;

  const getInitials = () => {
    if (initials) return initials;

    if (!user) return '?';

    // Handle case where user might be just an ID or partial object
    if (!user.firstName && !user.lastName && user.name) {
        return user.name.charAt(0).toUpperCase();
    }
    
    // Check for nested details if flat fields are missing (e.g. vendorDetails)
    // But typically user object should be flattened or have firstName/lastName
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    
    if (!first && !last) {
        // Fallback for objects like vendors/clients that might have companyName
        if (user.vendorDetails?.companyName) return user.vendorDetails.companyName[0].toUpperCase();
        if (user.clientDetails?.propertyType) return 'C'; 
        return '?';
    }
    
    return `${first}${last}`.toUpperCase();
  };

  // Debug log for troubleshooting image loading
  useEffect(() => {
    if (hasPhoto && imageError) {
      console.log('UserAvatar: Image failed to load for user:', user?._id, 'URL:', profilePhotoUrl);
    }
  }, [hasPhoto, imageError, user?._id, profilePhotoUrl]);

  // Use a stable timestamp for cache busting to avoid re-fetching on every render
  const [timestamp] = useState(new Date().getTime());

  if (hasPhoto && !imageError) {
    // Add cache busting for all URLs to ensure fresh image
    const imageUrl = getProfileImageUrl(profilePhotoUrl);
    // Ensure we don't double-append timestamp if getProfileImageUrl already did it
    const finalUrl = imageUrl ? (imageUrl.includes('?t=') ? imageUrl : `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${timestamp}`) : null;

    if (!finalUrl) return null; // Should not happen given hasPhoto check

    return (
      <Image
        source={{ uri: finalUrl }}
        style={[
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2,
            backgroundColor: 'transparent'
          }, 
          style
        ]}
        onError={(e) => {
          console.log('UserAvatar: Image load error:', e.nativeEvent?.error);
          setImageError(true);
        }}
        resizeMode="cover"
      />
    );
  }

  if (showInitials) {
    return (
      <View style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor: backgroundColor || theme.colors.primary[50], // Default light background
          borderWidth: 1,
          borderColor: 'transparent' // theme.colors.border
        }, 
        style
      ]}>
        <Text style={[
          styles.text, 
          { 
            fontSize: size * 0.4,
            color: textColor || theme.colors.primary[700] 
          }
        ]}>
          {getInitials()}
        </Text>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '600',
  }
});

export default UserAvatar;
