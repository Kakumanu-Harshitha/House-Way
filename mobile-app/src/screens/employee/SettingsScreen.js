import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import BottomNavBar from '../../components/common/BottomNavBar';
import { COLORS } from '../../styles/colors';

const SettingsScreen = ({ navigation }) => {
    const { user, logout } = useAuth();
    const { isCheckedIn, todayStats, checkOut, getStats } = useAttendance();
    const [weeklyStats, setWeeklyStats] = useState(null);
    const [monthlyStats, setMonthlyStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);

    useEffect(() => {
        loadStats();
    }, [isCheckedIn, navigation, user]);

    const loadStats = async () => {
        try {
            const [weekly, monthly] = await Promise.all([
                getStats('weekly'),
                getStats('monthly'),
            ]);
            setWeeklyStats(weekly);
            setMonthlyStats(monthly);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCheckOut = async () => {
        const confirmCheckout = () => {
            setCheckingOut(true);
            checkOut().then((result) => {
                setCheckingOut(false);
                if (result.success) {
                    if (Platform.OS === 'web') {
                        alert('✅ Checked out successfully! Great work today.');
                    } else {
                        Alert.alert('Success', 'Checked out successfully! Great work today.');
                    }
                    navigation.navigate('CheckIn');
                } else {
                    if (Platform.OS === 'web') {
                        alert('Failed to check out: ' + result.message);
                    } else {
                        Alert.alert('Error', result.message || 'Failed to check out');
                    }
                }
            });
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to check out?')) {
                confirmCheckout();
            }
        } else {
            Alert.alert('Check Out', 'Are you sure you want to check out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Check Out', onPress: confirmCheckout },
            ]);
        }
    };

    const handleLogout = () => {
        const doLogout = async () => {
            if (isCheckedIn) {
                await checkOut();
            }
            logout();
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to logout?')) {
                doLogout();
            }
        } else {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: doLogout },
            ]);
        }
    };

    const formatHours = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const SettingItem = ({ icon, label, value, onPress, color = COLORS.text, showChevron = true }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress}>
            <View style={[styles.itemIcon, { backgroundColor: color + '15' }]}>
                <Feather name={icon} size={18} color={color} />
            </View>
            <View style={styles.itemContent}>
                <Text style={[styles.itemLabel, { color }]}>{label}</Text>
                {value && <Text style={styles.itemValue}>{value}</Text>}
            </View>
            {showChevron && <Feather name="chevron-right" size={18} color={COLORS.textMuted} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#FFFFFF', '#FFFEF5', '#FFFFFF']}
                style={styles.gradient}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backBtn}
                            onPress={() => navigation.goBack()}
                        >
                            <Feather name="arrow-left" size={24} color={COLORS.primary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Account & Settings</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {/* Profile Summary */}
                    <View style={styles.profileSummary}>
                        <View style={styles.avatarContainer}>
                            <View style={styles.avatar}>
                                {user?.profilePicture ? (
                                    <Image
                                        source={{ uri: user.profilePicture }}
                                        style={styles.avatarImage}
                                    />
                                ) : (
                                    <Text style={styles.avatarText}>
                                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                                    </Text>
                                )}
                            </View>
                        </View>
                        <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.subRole || user?.role}</Text>
                        </View>
                    </View>

                    {/* Stats Overview */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Performance Overview</Text>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Today</Text>
                            <Text style={styles.statValue}>{formatHours(todayStats?.totalActiveMinutes || 0)}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>This Week</Text>
                            <Text style={styles.statValue}>{weeklyStats?.totalHours || 0}h</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>This Month</Text>
                            <Text style={styles.statValue}>{monthlyStats?.totalHours || 0}h</Text>
                        </View>
                    </View>

                    {/* Setting Groups */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Account & Security</Text>
                    </View>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="user"
                            label="Personal Information"
                            onPress={() => navigation.navigate('Profile')}
                        />
                        <SettingItem
                            icon="lock"
                            label="Change Password"
                            onPress={() => navigation.navigate('Profile', { scrollToPassword: true })}
                        />
                        <SettingItem
                            icon="bell"
                            label="Notifications"
                            onPress={() => { }}
                        />
                    </View>

                    {/* Danger Zone */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>More</Text>
                    </View>
                    <View style={styles.settingsGroup}>
                        <SettingItem
                            icon="help-circle"
                            label="Help & Support"
                            onPress={() => { }}
                        />
                        <SettingItem
                            icon="info"
                            label="About HouseWay"
                            value="v1.0.4"
                        />
                        {isCheckedIn && (
                            <SettingItem
                                icon="log-out"
                                label="Finish Session"
                                color={COLORS.danger}
                                onPress={handleCheckOut}
                            />
                        )}
                        <SettingItem
                            icon="power"
                            label="Logout"
                            color={COLORS.danger}
                            onPress={handleLogout}
                            showChevron={false}
                        />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </LinearGradient>

            <BottomNavBar navigation={navigation} activeTab="settings" />
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
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF9E6',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.2)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    profileSummary: {
        alignItems: 'center',
        paddingVertical: 18,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#F4D03F',
        padding: 3,
        marginBottom: 14,
    },
    avatar: {
        flex: 1,
        borderRadius: 40,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.primary,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.textMuted,
        marginTop: 4,
    },
    roleBadge: {
        backgroundColor: 'rgba(244, 208, 63, 0.12)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 12,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.2)',
    },
    roleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#E6BC00',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        marginTop: 28,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFFEF5',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.15)',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        marginBottom: 6,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#E6BC00',
    },
    settingsGroup: {
        marginHorizontal: 20,
        backgroundColor: '#FFFEF5',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(244, 208, 63, 0.15)',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(244, 208, 63, 0.08)',
    },
    itemIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    itemContent: {
        flex: 1,
    },
    itemLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    itemValue: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
});

export default SettingsScreen;
