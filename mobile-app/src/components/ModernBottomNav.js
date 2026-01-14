import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import theme from '../styles/theme';

const { width: screenWidth } = Dimensions.get('window');

const ModernBottomNav = ({ 
  tabs = [], 
  activeTab = 0, 
  onTabPress, 
  style,
  showLabels = true,
  variant = 'default', // default, floating, minimal
}) => {
  const tabWidth = screenWidth / tabs.length;

  const TabButton = ({ tab, index, isActive }) => {
    // Removed all animation logic to prevent CSS errors

    const handlePress = () => {
      onTabPress(index);
      
      // Haptic feedback animation
      Animated.sequence([
        Animated.spring(scaleValue, {
          toValue: 0.95,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
        Animated.spring(scaleValue, {
          toValue: isActive ? 1.1 : 1,
          useNativeDriver: true,
          tension: 300,
          friction: 10,
        }),
      ]).start();
    };

    return (
      <TouchableOpacity
        style={{...styles.tabButton, width: tabWidth}}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View
          style={{
            ...styles.tabContent,
            opacity: isActive ? 1 : 0.6,
          }}
        >
          {isActive && variant === 'default' && (
            <View style={styles.activeIndicator} />
          )}

          <View style={{
            ...styles.iconContainer,
            ...(isActive && styles.activeIconContainer),
            ...(variant === 'floating' && isActive && styles.floatingActiveIcon),
          }}>
            <Text style={{
              ...styles.tabIcon,
              ...(isActive && styles.activeTabIcon),
              ...(variant === 'floating' && isActive && styles.floatingActiveTabIcon),
            }}>
              {tab.icon}
            </Text>
          </View>

          {showLabels && (
            <Text style={{
              ...styles.tabLabel,
              ...(isActive && styles.activeTabLabel),
              ...(variant === 'minimal' && styles.minimalTabLabel),
            }}>
              {tab.label}
            </Text>
          )}
          
          {tab.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tab.badge}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'floating':
        return [styles.container, styles.floatingContainer];
      case 'minimal':
        return [styles.container, styles.minimalContainer];
      default:
        return styles.container;
    }
  };

  if (variant === 'floating') {
    return (
      <View style={styles.floatingWrapper}>
        <View
          style={{
            ...getContainerStyle(),
            ...style,
            backgroundColor: 'rgba(255,255,255,0.95)'
          }}
        >
          {tabs.map((tab, index) => (
            <TabButton
              key={index}
              tab={tab}
              index={index}
              isActive={activeTab === index}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{...getContainerStyle(), ...style}}>
      {tabs.map((tab, index) => (
        <TabButton
          key={index}
          tab={tab}
          index={index}
          isActive={activeTab === index}
        />
      ))}
    </View>
  );
};

// Preset tab configurations
export const ClientTabs = [
  { icon: '🏠', label: 'Dashboard', route: 'ClientDashboard' },
  { icon: '📋', label: 'Projects', route: 'Projects' },
  { icon: '💬', label: 'Messages', route: 'Messages' },
  { icon: '👤', label: 'Profile', route: 'Profile' },
];

export const EmployeeTabs = [
  { icon: '📊', label: 'Dashboard', route: 'EmployeeDashboard' },
  { icon: '🏗️', label: 'Projects', route: 'Projects' },
  { icon: '📦', label: 'Materials', route: 'Materials' },
  { icon: '👥', label: 'Team', route: 'Team' },
  { icon: '👤', label: 'Profile', route: 'Profile' },
];

export const VendorTabs = [
  { icon: '📈', label: 'Dashboard', route: 'VendorDashboard' },
  { icon: '💰', label: 'Quotations', route: 'Quotations' },
  { icon: '📋', label: 'Orders', route: 'Orders' },
  { icon: '👤', label: 'Profile', route: 'Profile' },
];

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingBottom: 20,
    paddingTop: 8,
  },
  floatingWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  floatingContainer: {
    borderRadius: 25,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    elevation: 8,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  minimalContainer: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: 16,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    backgroundColor: theme.colors.primary[500],
    borderRadius: 2,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  activeIconContainer: {
    backgroundColor: theme.colors.primary[100],
  },
  floatingActiveIcon: {
    backgroundColor: theme.colors.primary[500],
    elevation: 4,
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  tabIcon: {
    fontSize: 20,
    color: theme.colors.text.muted,
  },
  activeTabIcon: {
    color: theme.colors.primary[500],
  },
  floatingActiveTabIcon: {
    color: '#ffffff',
  },
  tabLabel: {
    fontSize: 11,
    color: theme.colors.text.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  minimalTabLabel: {
    fontSize: 10,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: theme.colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background.secondary,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default ModernBottomNav;
