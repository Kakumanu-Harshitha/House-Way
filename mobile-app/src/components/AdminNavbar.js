import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { ordersAPI } from '../services/ordersAPI';

// Utility: pick black or white depending on background brightness
const getContrastColor = (hexColor) => {
  if (!hexColor || typeof hexColor !== 'string') return '#111111';

  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Simple luminance approximation
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b; // [web:54][web:55]

  // Light background → dark text, dark background → light text
  return luminance > 186 ? '#111111' : '#ffffff';
};

const AdminNavbar = ({
  title = 'Owner Dashboard',
  showProfileMenu = true,
  onMenuPress,
  backgroundColor = theme.colors.primary,
  textColor, // optional, auto if not passed
  navigation, // optional - used for menu navigation to Profile/Settings/Help
}) => {
  const { user, logout } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];
  const [unreadCount, setUnreadCount] = useState(0);

  const effectiveTextColor = textColor || getContrastColor(backgroundColor);
  const secondaryTextColor =
    effectiveTextColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)';

  const handleLogout = () => {
    // Platform-specific logout confirmation
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        setMenuVisible(false);
        performLogout();
      } else {
        setMenuVisible(false);
      }
    } else {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          {
            text: 'Cancel',
            onPress: () => setMenuVisible(false),
            style: 'cancel',
          },
          {
            text: 'Logout',
            onPress: async () => {
              setMenuVisible(false);
              performLogout();
            },
            style: 'destructive',
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      await logout();
      // AppNavigator will automatically switch to AuthNavigator
      // No manual navigation needed - the AuthContext state change handles it
      console.log('[AdminNavbar] Logout successful');
    } catch (error) {
      console.error('[AdminNavbar] Logout failed:', error);
      const errorMsg = 'Failed to logout. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const toggleMenu = () => {
    const willOpen = !menuVisible;
    setMenuVisible(willOpen);
    Animated.timing(slideAnim, {
      toValue: willOpen ? 0 : -150,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    setMenuVisible(false);
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const getInitials = () => {
    if (!user) return 'A';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    const result = `${first}${last}`.trim();
    return result ? result.toUpperCase() : 'A';
  };

  const getStatusBarHeight = () => {
    return Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0; // [web:45][web:63]
  };

  // Fetch unread notifications (quotations/requests) for admin
  useEffect(() => {
    let isMounted = true;

    const fetchUnread = async () => {
      try {
        const resp = await ordersAPI.getUnreadCount();
        const count = resp?.data?.unreadCount ?? resp?.unreadCount ?? 0;
        if (isMounted) setUnreadCount(count);
      } catch (err) {
        // Silent fail; don't block navbar
        if (isMounted) setUnreadCount(0);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {/* Main Navbar */}
      <View
        style={[
          styles.container,
          {
            backgroundColor,
            paddingTop: getStatusBarHeight() + 8,
          },
        ]}
      >
        <View style={styles.content}>
          {/* Left Section - Logo/Title */}
          <View style={styles.leftSection}>
            <MaterialCommunityIcons
              name="home-analytics"
              size={24}
              color={effectiveTextColor}
              style={styles.logoIcon}
            />
            <Text style={[styles.title, { color: effectiveTextColor }]}>
              {title}
            </Text>
          </View>

          {/* Right Section - Menu Button */}
          {showProfileMenu && (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={toggleMenu}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor:
                      effectiveTextColor === '#ffffff'
                        ? 'rgba(255,255,255,0.3)'
                        : 'rgba(0,0,0,0.1)',
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: effectiveTextColor }]}>
                  {getInitials()}
                </Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText} numberOfLines={1}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons
                name="chevron-down"
                size={16}
                color={effectiveTextColor}
                style={styles.chevron}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* User Info Bar */}
        {user && (
          <View
            style={[
              styles.userInfoBar,
              { borderTopColor: `${effectiveTextColor}33` },
            ]}
          >
            <View style={styles.userInfo}>
              <View>
                <Text style={[styles.userName, { color: effectiveTextColor }]}>
                  {user.firstName} {user.lastName}
                </Text>
                <Text style={[styles.userRole, { color: secondaryTextColor }]}>
                  {user.role
                    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                    : 'Owner'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        >
          <Animated.View
            style={[
              styles.dropdown,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Menu Header */}
            <View style={styles.menuHeader}>
              <View
                style={[
                  styles.menuAvatar,
                  { backgroundColor: backgroundColor },
                ]}
              >
                <Text style={styles.menuAvatarText}>{getInitials()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuUserName}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.menuEmail}>{user?.email}</Text>
              </View>
            </View>

            {/* Divider */}
            <View className="divider" style={styles.divider} />

            {/* Menu Items */}
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                navigation?.navigate('OwnerProfile');
              }}
            >
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                navigation?.navigate('OwnerSettings');
              }}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                closeMenu();
                navigation?.navigate('OwnerHelp');
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text style={styles.menuItemText}>Help</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Logout Button */}
            <TouchableOpacity
              style={[styles.menuItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={20} color="#d32f2f" />
              <Text style={[styles.menuItemText, { color: '#d32f2f' }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 4,
  },
  userInfoBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    minHeight: 45,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
  },
  userRole: {
    fontSize: 12,
    marginTop: 2,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 5,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarText: {
    fontWeight: '600',
    fontSize: 12,
  },
  chevron: {
    marginLeft: 4,
  },

  // Modal & Dropdown Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 999,
  },
  dropdown: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 85,
    right: 12,
    width: '90%',
    maxWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    zIndex: 1000,
  },
  menuHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuAvatarText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  menuUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  menuEmail: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 12,
    fontWeight: '500',
  },
  logoutItem: {
    backgroundColor: 'rgba(211, 47, 47, 0.05)',
  },
});

export default AdminNavbar;
