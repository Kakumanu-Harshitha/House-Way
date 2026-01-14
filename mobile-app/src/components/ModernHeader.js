import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import theme from '../styles/theme';

const ModernHeader = ({
  title,
  subtitle,
  user,
  onProfilePress,
  onNotificationPress,
  onCheckOutPress,
  isCheckedIn = false,
  notificationCount = 0,
  variant = 'primary', // primary, solid, transparent
  showProfile = true,
  showNotifications = true,
  showCheckOut = false,
  showBackButton = false,
  onBackPress,
  backgroundColor,
  textColor,
  children,
}) => {
  const getHeaderHeight = () => {
    const statusBarHeight = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;
    return statusBarHeight + 80;
  };

  const HeaderContent = () => (
    <View style={styles.container}>
      <View style={styles.content}>
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
          >
            <Text style={{ ...styles.backButtonIcon, ...(textColor && { color: textColor }) }}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.leftSection}>
          <Text style={{ ...styles.title, ...(textColor && { color: textColor }) }}>
            {title}
          </Text>
          {subtitle && (
            <Text style={{ ...styles.subtitle, ...(textColor && { color: textColor }) }}>
              {subtitle}
            </Text>
          )}
          {user && (
            <View style={styles.userInfo}>
              <Text style={{ ...styles.greeting, ...(textColor && { color: textColor }) }}>
                Welcome back,
              </Text>
              <Text style={{ ...styles.userName, ...(textColor && { color: textColor }) }}>
                {user.firstName} {user.lastName}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.rightSection}>
          {/* Check-Out Button */}
          {showCheckOut && isCheckedIn && onCheckOutPress && (
            <TouchableOpacity
              style={styles.checkOutButton}
              onPress={onCheckOutPress}
            >
              <Text style={styles.checkOutIcon}>⏱</Text>
              <Text style={styles.checkOutText}>Out</Text>
            </TouchableOpacity>
          )}

          {showNotifications && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={onNotificationPress}
            >
              <Text style={{ ...styles.icon, ...(textColor && { color: textColor }) }}>🔔</Text>
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {showProfile && user && (
            <TouchableOpacity
              style={styles.profileButton}
              onPress={onProfilePress}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {children && (
        <View style={styles.customContent}>
          {children}
        </View>
      )}
    </View>
  );

  if (variant === 'primary') {
    return (
      <View
        style={{
          ...styles.primaryContainer,
          height: getHeaderHeight() + (children ? 60 : 0),
          backgroundColor: theme.colors.primary[500],
          paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
        }}
      >
        <HeaderContent />
        {children && (
          <View style={styles.childrenContainer}>
            {children}
          </View>
        )}
      </View>
    );
  }

  if (variant === 'solid') {
    return (
      <View style={{
        ...styles.solidContainer,
        height: getHeaderHeight() + (children ? 60 : 0),
        backgroundColor: backgroundColor || theme.colors.primary[500]
      }}>
        <HeaderContent />
      </View>
    );
  }

  return (
    <View style={{
      ...styles.transparentContainer,
      height: getHeaderHeight() + (children ? 60 : 0)
    }}>
      <HeaderContent />
    </View>
  );
};

// Specialized header variants
export const DashboardHeader = ({ user, onProfilePress, onNotificationPress, notificationCount }) => (
  <ModernHeader
    title="Dashboard"
    user={user}
    onProfilePress={onProfilePress}
    onNotificationPress={onNotificationPress}
    notificationCount={notificationCount}
    variant="primary"
  />
);

export const ProjectsHeader = ({ onAddPress, onSearchPress, hideAddButton = false }) => (
  <ModernHeader
    title="Projects"
    subtitle={hideAddButton ? "Your active projects" : "Manage your design projects"}
    variant="primary"
    showProfile={false}
    showNotifications={false}
  >
    <View style={styles.projectsActionContainer}>
      <TouchableOpacity style={[styles.modernSearchButton, hideAddButton && { flex: 1 }]} onPress={onSearchPress}>
        <View style={styles.buttonIconContainer}>
          <Text style={[styles.modernButtonIcon, { color: '#ffffff' }]}>🔍</Text>
        </View>
        <Text style={[styles.modernButtonText, { color: '#ffffff' }]}>Search</Text>
      </TouchableOpacity>

      {!hideAddButton && (
        <TouchableOpacity style={styles.modernAddButton} onPress={onAddPress}>
          <View style={styles.buttonIconContainer}>
            <Text style={[styles.modernButtonIcon, { color: theme.colors.primary[500] }]}>➕</Text>
          </View>
          <Text style={[styles.modernButtonText, { color: theme.colors.primary[500] }]}>New Project</Text>
        </TouchableOpacity>
      )}
    </View>
  </ModernHeader>
);

export const MaterialsHeader = ({ onAddPress, pendingCount }) => (
  <ModernHeader
    title="Materials"
    subtitle="Request and manage materials"
    variant="primary"
    showProfile={false}
    showNotifications={false}
  >
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{pendingCount || 0}</Text>
        <Text style={styles.statLabel}>Pending Requests</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onAddPress}>
        <Text style={styles.primaryButtonText}>New Request</Text>
      </TouchableOpacity>
    </View>
  </ModernHeader>
);

const styles = StyleSheet.create({
  primaryContainer: {
    width: '100%',
  },
  solidContainer: {
    width: '100%',
  },
  transparentContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  childrenContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  userInfo: {
    marginTop: 8,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  icon: {
    fontSize: 20,
    color: '#ffffff',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: theme.colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  customContent: {
    paddingBottom: 20,
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 12,
  },
  checkOutIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  checkOutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  backButton: {
    marginRight: 12,
  },
  backButtonIcon: {
    fontSize: 24,
    color: '#ffffff',
  },


  // Action buttons styles
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  searchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary[500],
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  buttonIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#ffffff',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Modern Projects Header Styles
  projectsActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 4,
    gap: 12,
  },
  modernSearchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modernAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modernButtonIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  modernButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Stats row styles
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  primaryButton: {
    backgroundColor: theme.colors.secondary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ModernHeader;
