import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  Modal,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import theme from '../styles/theme';

const CommonHeader = ({ title, userRole, showNotifications = true }) => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [menuVisible, setMenuVisible] = useState(false);

  const getUserInitials = () => {
    if (!user) return 'U';
    const name = user.name || user.email || '';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getRoleColor = () => {
    switch (userRole?.toLowerCase()) {
      case 'vendor':
        return '#FF6B6B';
      case 'client':
        return '#4ECDC4';
      case 'employee':
        return '#F4D03F';
      case 'executive':
        return '#96CEB4';
      case 'finance':
        return '#FFEAA7';
      default:
        return '#95E1D3';
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      setMenuVisible(false);
      if (confirmed) {
        performLogout();
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
            onPress: () => {
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
      // Navigation to auth screen will be handled by auth state
    } catch (error) {
      const errorMsg = 'Failed to logout. Please try again.';
      if (Platform.OS === 'web') {
        window.alert(errorMsg);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  const handleProfile = () => {
    setMenuVisible(false);
    navigation.navigate('ProfileScreen');
  };

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          {/* Left side - Title */}
          <View style={styles.leftSection}>
            <Text style={styles.headerTitle}>{title}</Text>
            {userRole && (
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleColor() + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    { color: getRoleColor() },
                  ]}
                >
                  {userRole}
                </Text>
              </View>
            )}
          </View>

          {/* Right side - Icons */}
          <View style={styles.rightSection}>
            {showNotifications && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => navigation.navigate('NotificationsScreen')}
              >
                <Feather name="bell" size={22} color={theme.colors.text} />
                {/* You can add a badge here if needed */}
              </TouchableOpacity>
            )}

            {/* Profile Menu Button */}
            <TouchableOpacity
              style={[
                styles.profileButton,
                { backgroundColor: getRoleColor() },
              ]}
              onPress={() => {
                // For employee users (designers), go straight to Settings.
                if ((userRole || '').toLowerCase() === 'employee' || user?.role === 'employee') {
                  navigation.navigate('SettingsScreen');
                } else {
                  setMenuVisible(true);
                }
              }}
            >
              <Text style={styles.initialsText}>{getUserInitials()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {/* User Info Section */}
            <View style={styles.userInfoSection}>
              <View
                style={[
                  styles.largeProfileButton,
                  { backgroundColor: getRoleColor() },
                ]}
              >
                <Text style={styles.initialsText}>{getUserInitials()}</Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                {userRole && (
                  <Text style={styles.userRole}>{userRole}</Text>
                )}
              </View>
            </View>

            {/* Menu Divider */}
            <View style={styles.divider} />

            {/* Menu Options */}
            <TouchableOpacity
              style={styles.menuOption}
              onPress={handleProfile}
            >
              <Feather
                name="user"
                size={20}
                color={theme.colors.primary}
                style={styles.menuIcon}
              />
              <Text style={styles.menuOptionText}>View Profile</Text>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('SettingsScreen');
              }}
            >
              <Feather
                name="settings"
                size={20}
                color={theme.colors.primary}
                style={styles.menuIcon}
              />
              <Text style={styles.menuOptionText}>Settings</Text>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate('HelpScreen');
              }}
            >
              <Feather
                name="help-circle"
                size={20}
                color={theme.colors.primary}
                style={styles.menuIcon}
              />
              <Text style={styles.menuOptionText}>Help & Support</Text>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            {/* Menu Divider */}
            <View style={styles.divider} />

            {/* Logout Option */}
            <TouchableOpacity
              style={[styles.menuOption, styles.logoutOption]}
              onPress={handleLogout}
            >
              <Feather
                name="log-out"
                size={20}
                color="#FF6B6B"
                style={styles.menuIcon}
              />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
  },
  leftSection: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  roleBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // Menu Modal Styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  userInfoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  largeProfileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 8,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuOptionText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  logoutOption: {
    marginTop: 4,
  },
  logoutText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
});

export default CommonHeader;
