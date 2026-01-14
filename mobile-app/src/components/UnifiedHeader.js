import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../styles/theme';

/**
 * UnifiedHeader - Professional header component for all user types
 * Maintains consistent styling with admin screens
 * @param {string} title - Header title
 * @param {function} onBack - Back button handler
 * @param {function} onMenu - Menu button handler
 * @param {function} onLogout - Logout button handler
 * @param {string} userInitials - User initials for avatar
 * @param {string} subtitle - Optional subtitle text
 * @param {string} backgroundColor - Optional background color (defaults to theme primary)
 */
export default function UnifiedHeader({
  title = 'Dashboard',
  onBack,
  onMenu,
  onLogout,
  userInitials = 'U',
  subtitle,
  backgroundColor = theme.colors.primary[500],
}) {
  const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
  const iconColor = theme.colors.text.white;

  return (
    <View style={[styles.header, { backgroundColor, paddingTop: statusBarHeight + 8 }]}>
      <View style={styles.topRow}>
        {/* Left Section */}
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.iconButton}>
            <Feather name="arrow-left" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : onMenu ? (
          <TouchableOpacity onPress={onMenu} style={styles.iconButton}>
            <Feather name="menu" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoSection}>
            <MaterialCommunityIcons
              name="home-analytics"
              size={24}
              color={iconColor}
            />
          </View>
        )}

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {onLogout && (
            <TouchableOpacity onPress={onLogout} style={styles.avatarButton}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    ...theme.shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.white,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.white,
  },
});
