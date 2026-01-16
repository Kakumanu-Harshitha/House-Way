import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import theme from '../../../styles/theme';
import { getProfileImageUrl } from '../../../utils/api';

export default function AppHeader({ title, onBack, onMenu, onNotifications, user, onProfile }) {
  const renderProfileImage = () => {
    if (user?.profilePhoto) {
      return (
        <Image
          source={{ uri: getProfileImageUrl(user.profilePhoto) }}
          style={styles.profileImage}
          resizeMode="cover"
        />
      );
    }
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {user?.firstName?.[0] || user?.name?.[0] || 'U'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.leftButton}>
          <Feather name="arrow-left" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      ) : onMenu ? (
        <TouchableOpacity onPress={onMenu} style={styles.leftButton}>
          <Feather name="menu" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholderButton} />
      )}
      
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      
      <View style={styles.rightContainer}>
        {onNotifications && (
          <TouchableOpacity onPress={onNotifications} style={styles.iconButton}>
            <Feather name="bell" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        )}
        
        {user && (
          <TouchableOpacity onPress={onProfile || (() => {})} style={styles.profileButton}>
            {renderProfileImage()}
          </TouchableOpacity>
        )}

        {!onNotifications && !user && <View style={styles.placeholderButton} />}
      </View>
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
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  leftButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  placeholderButton: {
    width: 40,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 40,
  },
  iconButton: {
    padding: 8,
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});