import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import { Alert, Platform } from 'react-native';

// Premium White Theme with Gold Accents
const COLORS = {
    primary: '#D4AF37',      // Dark Golden Rod
    background: '#FFFFFF',
    cardBg: '#FFFFFF',
    textMuted: '#666666',
};

const BottomNavBar = ({ navigation, activeTab = 'home' }) => {
    const { isCheckedIn } = useAttendance();
    const { user } = useAuth();

    // Different tabs based on subRole
    const designTeamTabs = [
        { id: 'home', icon: 'home', label: 'Home', route: 'HomeDashboard' },
        { id: 'clients', icon: 'users', label: 'Clients', route: 'ClientsList' },
        { id: 'projects', icon: 'briefcase', label: 'Projects', route: 'ProjectList' },
        { id: 'settings', icon: 'settings', label: 'Settings', route: 'ProfileScreen' },
    ];

    const executionTeamTabs = [
        { id: 'home', icon: 'home', label: 'Dashboard', route: 'ExecutiveDashboard' },
        { id: 'projects', icon: 'briefcase', label: 'Projects', route: 'ExecutiveProjectList' },
        { id: 'settings', icon: 'settings', label: 'Settings', route: 'ProfileScreen' },
    ];

    const vendorTeamTabs = [
        { id: 'home', icon: 'home', label: 'Dashboard', route: 'VendorTeamDashboard' },
        { id: 'settings', icon: 'settings', label: 'Settings', route: 'ProfileScreen' },
    ];

    // Select tabs based on subRole
    const getAllTabs = () => {
        if (user?.subRole === 'executionTeam') return executionTeamTabs;
        if (user?.subRole === 'vendorTeam') return vendorTeamTabs;
        return designTeamTabs;
    };

    const allTabs = getAllTabs();

    // Filter tabs for employees who are not checked in
    const tabs = (user?.role === 'employee' && !isCheckedIn)
        ? allTabs.filter(tab => tab.id === 'settings')
        : allTabs;

    const handlePress = (tab) => {
        if (tab.id !== activeTab) {
            // Protection for employees
            // Protection for employees
            if (user?.role === 'employee' && !isCheckedIn && tab.id !== 'settings') {
                if (Platform.OS === 'web') {
                    alert('⏳ Access Denied: Please Check-In first.');
                } else {
                    Alert.alert('Check-In Required', 'Please Check-In first to access this section.');
                }
                navigation.navigate('CheckIn');
                return;
            }
            navigation.navigate(tab.route);
        }
    };

    return (
        <View style={styles.container}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                    <TouchableOpacity
                        key={tab.id}
                        style={styles.tab}
                        onPress={() => handlePress(tab)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconWrapper, isActive && styles.activeIconWrapper]}>
                            <Feather
                                name={tab.icon}
                                size={22}
                                color={isActive ? COLORS.primary : COLORS.textMuted}
                            />
                        </View>
                        <Text style={[styles.label, isActive && styles.activeLabel]}>
                            {tab.label}
                        </Text>
                        {isActive && <View style={styles.activeIndicator} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.cardBg,
        paddingVertical: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(184, 134, 11, 0.1)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
    },
    iconWrapper: {
        padding: 6,
        borderRadius: 12,
    },
    activeIconWrapper: {
        backgroundColor: 'rgba(255,215,0,0.15)',
    },
    label: {
        fontSize: 11,
        color: COLORS.textMuted,
        marginTop: 2,
        fontWeight: '500',
    },
    activeLabel: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    activeIndicator: {
        position: 'absolute',
        top: 0,
        width: 24,
        height: 2,
        backgroundColor: COLORS.primary,
        borderRadius: 1,
    },
});

export default BottomNavBar;
