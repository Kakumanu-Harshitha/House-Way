import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import BottomNavBar from '../../components/common/BottomNavBar';
import CommonHeader from '../../components/CommonHeader';
import theme from '../../styles/theme';

const EmployeeDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { isCheckedIn, checkOut, todayStats, getStats } = useAttendance();
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessionDuration, setSessionDuration] = useState({ hours: 0, minutes: 0 });

  useEffect(() => {
    loadWeeklyStats();
    const timer = setInterval(() => {
      setCurrentTime(new Date());

      // Use server-tracked time (totalActiveMinutes) instead of calculating from checkInTime
      // This ensures time is ONLY counted during actual app usage between check-in and check-out
      if (todayStats?.totalActiveMinutes !== undefined) {
        const totalMinutes = todayStats.totalActiveMinutes || 0;
        setSessionDuration({
          hours: Math.floor(totalMinutes / 60),
          minutes: totalMinutes % 60
        });
      } else {
        setSessionDuration({ hours: 0, minutes: 0 });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCheckedIn, todayStats?.totalActiveMinutes]);

  const loadWeeklyStats = async () => {
    try {
      const stats = await getStats('weekly');
      setWeeklyHours(stats?.totalHours || 0);
    } catch (error) {
      console.log('Stats error:', error);
    }
  };

  const handleCheckOut = async () => {
    const doCheckout = async () => {
      const result = await checkOut();
      if (result.success) {
        if (Platform.OS === 'web') {
          alert('✅ Checked out successfully! Great work today.');
        } else {
          Alert.alert('Success', 'Checked out successfully! Great work today.');
        }
        navigation.navigate('CheckIn');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Ready to end your work session?')) doCheckout();
    } else {
      Alert.alert('Check Out', 'Ready to end your work session?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Check Out', style: 'destructive', onPress: doCheckout },
      ]);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Logout from your account?')) logout();
    } else {
      Alert.alert('Logout', 'Logout from your account?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]);
    }
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const time = sessionDuration;

  const getInitials = () => {
    if (!user) return 'E';
    const first = user.firstName?.[0] || '';
    const last = user.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || 'E';
  };

  return (
    <View style={styles.container}>
      <CommonHeader title="Dashboard" userRole="Employee" showNotifications={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        bounces={Platform.OS !== 'web'}
        scrollEventThrottle={16}
      >

        {/* Current Time Display */}
        <View style={styles.timeDisplay}>
          <Text style={styles.currentTime}>{formatTime()}</Text>
          <Text style={styles.dateText}>
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        {/* Active Session Card */}
        {isCheckedIn && (
          <View style={styles.sessionCard}>
            <LinearGradient
              colors={['rgba(244, 208, 63, 0.08)', 'rgba(244, 208, 63, 0.02)']}
              style={styles.sessionGradient}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.statusIndicator}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusLabel}>ACTIVE SESSION</Text>
                </View>
              </View>

              <View style={styles.timeTracker}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{String(time.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>Hours</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeNumber}>{String(time.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>Minutes</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.checkOutButton} onPress={handleCheckOut}>
                <Feather name="log-out" size={20} color={theme.colors.text.white} />
                <Text style={styles.checkOutText}>Check Out</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Weekly Summary */}
        <View style={styles.summaryCard}>
          <Feather name="activity" size={24} color={theme.colors.primary[500]} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>{weeklyHours} hours logged</Text>
          </View>
        </View>

        {/* Client Management Link - Only show when checked in */}
        {isCheckedIn && (
          <TouchableOpacity
            style={styles.managementCard}
            onPress={() => navigation.navigate('HomeDashboard')}
            activeOpacity={0.8}
          >
            <View style={styles.managementGradient}>
              <View style={styles.managementIcon}>
                <Feather name="briefcase" size={32} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.managementContent}>
                <Text style={styles.managementTitle}>Client Management</Text>
                <Text style={styles.managementSubtitle}>
                  Projects • Clients • Invoices • Team
                </Text>
              </View>
              <Feather name="chevron-right" size={24} color={theme.colors.primary[500]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Settings Link */}
        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => {
            if (!isCheckedIn) {
              if (Platform.OS === 'web') {
                alert('⏳ Access Denied: Please Check-In first to access Settings.');
              } else {
                Alert.alert('Check-In Required', 'Please Check-In first to access Settings.');
              }
              return;
            }
            navigation.navigate('SettingsScreen');
          }}
        >
          <Feather name="settings" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.settingsText}>Settings & Statistics</Text>
          <Feather name={isCheckedIn ? "chevron-right" : "lock"} size={18} color={isCheckedIn ? theme.colors.text.secondary : theme.colors.error[600]} />
        </TouchableOpacity>

        {/* Extra space for scrolling */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNavBar navigation={navigation} activeTab="home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  timeDisplay: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary[600],
    marginTop: 2,
  },
  logoutBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.error[300],
  },
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: '200',
    color: theme.colors.text.primary,
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: 8,
  },
  sessionCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  sessionGradient: {
    padding: 24,
  },
  sessionHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,200,83,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.success[500],
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.success[700],
    letterSpacing: 1.5,
  },
  timeTracker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  timeBlock: {
    alignItems: 'center',
    minWidth: 80,
  },
  timeNumber: {
    fontSize: 64,
    fontWeight: '200',
    color: theme.colors.primary[600],
  },
  timeLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '200',
    color: theme.colors.primary[600],
    marginHorizontal: 8,
    height: 70,
    lineHeight: 70,
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    ...theme.shadows.md,
  },
  checkOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.white,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    ...theme.cardStyles.default,
    marginHorizontal: 24,
    marginTop: 20,
    padding: 20,
    gap: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: 4,
  },
  managementCard: {
    marginHorizontal: 24,
    marginTop: 24,
    ...theme.cardStyles.accent,
    overflow: 'hidden',
  },
  managementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  managementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  managementContent: {
    flex: 1,
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  managementSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  settingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    ...theme.cardStyles.default,
    gap: 12,
  },
  settingsText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.secondary,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    gap: 4,
    alignSelf: 'flex-start',
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.error[700],
    letterSpacing: 0.5,
  },
});

export default EmployeeDashboardScreen;
