import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { attendanceAPI } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNavBar from '../../components/common/BottomNavBar';
import ToastMessage from '../../components/common/ToastMessage';
import { COLORS } from '../../styles/colors';

const CheckInScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { isCheckedIn: contextIsCheckedIn, todayStats, checkIn, checkOut, fetchStatus } = useAttendance();
    const [isLoading, setIsLoading] = useState(true);
    const [checkingIn, setCheckingIn] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sessionDuration, setSessionDuration] = useState(0);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ visible: true, message, type });
    };

    const hideToast = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    useEffect(() => {
        const init = async () => {
            try {
                await fetchStatus();
            } catch (error) {
                console.error('CheckIn init error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        init();

        // Timer only updates current clock display, NOT session duration
        // Session duration is tracked by server heartbeats only
        const timer = setInterval(() => {
            setCurrentTime(new Date());

            // ONLY show time when actively checked in
            // Reset to 0 when checked out - don't keep showing old session time
            if (contextIsCheckedIn && todayStats?.totalActiveMinutes !== undefined) {
                // Convert server minutes to seconds for display
                const serverTrackedSeconds = (todayStats.totalActiveMinutes || 0) * 60;
                setSessionDuration(serverTrackedSeconds);
            } else {
                // When checked out, show 0 - ready for next session
                setSessionDuration(0);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [contextIsCheckedIn, todayStats?.totalActiveMinutes]);

    const handleCheckIn = async () => {
        setCheckingIn(true);
        try {
            const result = await checkIn();
            if (result.success) {
                showToast('Checked in successfully!', 'success');
            } else {
                throw new Error(result.message || 'Check-in failed');
            }
        } catch (error) {
            console.error('Check-in error:', error);
            showToast(error.message || 'Failed to check in', 'error');
        } finally {
            setCheckingIn(false);
        }
    };

    const handleCheckOut = async () => {
        const performCheckOut = async () => {
            setCheckingIn(true);
            try {
                const result = await checkOut();
                if (result.success) {
                    showToast('Checked out successfully!', 'success');
                } else {
                    showToast(result.message || 'Check-out failed', 'error');
                }
            } catch (error) {
                console.error('Check-out error:', error);
                showToast('Failed to check out. Please try again.', 'error');
            } finally {
                setCheckingIn(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to check out?')) {
                performCheckOut();
            }
        } else {
            Alert.alert(
                'Check Out',
                'Are you sure you want to finish your session?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Check Out', style: 'destructive', onPress: performCheckOut }
                ]
            );
        }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDuration = (seconds) => {
        const totalSeconds = Math.floor(seconds);
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Checking status...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Toast Notification */}
            <ToastMessage
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={hideToast}
            />

            <LinearGradient colors={['#FFFFFF', '#FFFEF5', '#FFFFFF']} style={styles.gradient}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.welcomeText}>Welcome back</Text>
                            <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
                        </View>
                        <View style={styles.headerRight}>
                            <TouchableOpacity
                                style={styles.profileBtn}
                                onPress={() => navigation.navigate('SettingsScreen')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.profileInitials}>
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Time Display */}
                    <View style={styles.timeContainer}>
                        <Text style={styles.time}>{formatTime(currentTime)}</Text>
                        <Text style={styles.date}>{formatDate(currentTime)}</Text>
                    </View>

                    {/* Session Card */}
                    <View style={styles.sessionCard}>
                        {contextIsCheckedIn ? (
                            <View style={styles.activeSessionBadge}>
                                <View style={styles.activeDot} />
                                <Text style={styles.activeSessionText}>ACTIVE SESSION</Text>
                            </View>
                        ) : (
                            <View style={[styles.activeSessionBadge, { backgroundColor: '#999' }]}>
                                <View style={[styles.activeDot, { backgroundColor: '#FFFFFF' }]} />
                                <Text style={[styles.activeSessionText, { color: '#FFFFFF' }]}>NO ACTIVE SESSION</Text>
                            </View>
                        )}

                        {/* Session Info with Check-in Time */}
                        {contextIsCheckedIn && todayStats?.checkInTime && (
                            <View style={styles.sessionInfoRow}>
                                <Text style={styles.sessionInfoLabel}>Session started at</Text>
                                <Text style={styles.sessionInfoValue}>
                                    {new Date(todayStats.checkInTime).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                    })}
                                </Text>
                            </View>
                        )}

                        <View style={styles.durationContainer}>
                            <Text style={styles.duration}>{formatDuration(sessionDuration)}</Text>
                            <Text style={styles.durationLabel}>
                                {contextIsCheckedIn ? 'Active Duration' : 'Ready to start'}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.actionButton, contextIsCheckedIn && styles.checkOutButton]}
                            onPress={contextIsCheckedIn ? handleCheckOut : handleCheckIn}
                            disabled={checkingIn}
                        >
                            {checkingIn ? (
                                <ActivityIndicator color={contextIsCheckedIn ? '#fff' : '#1a1a1a'} />
                            ) : (
                                <>
                                    <Feather
                                        name={contextIsCheckedIn ? "log-out" : "log-in"}
                                        size={20}
                                        color={contextIsCheckedIn ? '#fff' : '#1a1a1a'}
                                    />
                                    <Text style={[styles.actionText, contextIsCheckedIn && styles.checkOutText]}>
                                        {contextIsCheckedIn ? 'Check Out' : 'Check In'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Hours Logged */}
                    <View style={styles.hoursCard}>
                        <Feather name="clock" size={18} color="#666" />
                        <View style={styles.hoursContent}>
                            <Text style={styles.hoursLabel}>Active Hours (Today)</Text>
                            <Text style={styles.hoursValue}>
                                {contextIsCheckedIn
                                    ? `${Math.floor(sessionDuration / 3600)}h ${Math.floor((sessionDuration % 3600) / 60)}m logged`
                                    : '0h 0m logged'}
                            </Text>
                        </View>
                    </View>

                    {/* Management Card - Only show when checked in */}
                    {/* Route to different dashboards based on subRole */}
                    {contextIsCheckedIn && (
                        <TouchableOpacity
                            style={styles.clientManagementCard}
                            onPress={() => {
                                // Route based on subRole
                                if (user?.subRole === 'executionTeam') {
                                    navigation.navigate('ExecutiveDashboard');
                                } else if (user?.subRole === 'vendorTeam') {
                                    navigation.navigate('VendorTeamDashboard');
                                } else {
                                    navigation.navigate('HomeDashboard');
                                }
                            }}
                        >
                            <View style={styles.cmIconContainer}>
                                <Feather
                                    name={
                                        user?.subRole === 'executionTeam' ? "hard-hat" :
                                            user?.subRole === 'vendorTeam' ? "package" : "users"
                                    }
                                    size={20}
                                    color="#fff"
                                />
                            </View>
                            <View style={styles.cmContent}>
                                <Text style={styles.cmTitle}>
                                    {user?.subRole === 'executionTeam' ? 'Site Management' :
                                        user?.subRole === 'vendorTeam' ? 'Vendor Management' : 'Client Management'}
                                </Text>
                                <Text style={styles.cmSubtitle}>
                                    {user?.subRole === 'executionTeam'
                                        ? 'Projects · Timeline · Media'
                                        : user?.subRole === 'vendorTeam'
                                            ? 'Projects · Vendors · Material Requests'
                                            : 'Projects · Clients · Invoices'}
                                </Text>
                            </View>
                            <Feather name="chevron-right" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </LinearGradient>

            {/* Bottom Navigation */}
            <BottomNavBar navigation={navigation} activeTab="home" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFEF5',
    },
    gradient: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 150, // Extra space for BottomNavBar
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: '#666',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    welcomeText: {
        fontSize: 13,
        color: '#999',
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
        marginTop: 2,
    },
    profileBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F4D03F',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#F4D03F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    profileInitials: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    timeContainer: {
        alignItems: 'center',
        marginTop: 24,
        marginHorizontal: 16,
    },
    time: {
        fontSize: 52,
        fontWeight: '300',
        color: '#1a1a1a',
        letterSpacing: 1,
    },
    date: {
        fontSize: 14,
        color: '#999',
        marginTop: 6,
    },
    sessionCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: 24,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 4,
    },
    activeSessionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF9E6',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.3)',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F4D03F',
        marginRight: 8,
    },
    activeSessionText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#E6BC00',
        letterSpacing: 0.6,
    },
    durationContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    duration: {
        fontSize: 56,
        fontWeight: '300',
        color: '#1a1a1a',
        letterSpacing: 2,
    },
    durationLabel: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontWeight: '500',
    },
    sessionInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFF9E6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.2)',
    },
    sessionInfoLabel: {
        fontSize: 12,
        color: '#777',
        marginRight: 8,
    },
    sessionInfoValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E6BC00',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4D03F',
        paddingVertical: 13,
        paddingHorizontal: 36,
        borderRadius: 30,
        gap: 10,
        minWidth: 160,
        shadowColor: '#F4D03F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    checkOutButton: {
        backgroundColor: '#333',
        shadowColor: '#000',
    },
    actionText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    checkOutText: {
        color: '#FFFFFF',
    },
    hoursCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFEF5',
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.15)',
    },
    hoursContent: {
        marginLeft: 12,
    },
    hoursLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    hoursValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
        marginTop: 2,
    },
    clientManagementCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFEF5',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.15)',
    },
    cmIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F4D03F',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cmContent: {
        flex: 1,
        marginLeft: 12,
    },
    cmTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    cmSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
});

export default CheckInScreen;
