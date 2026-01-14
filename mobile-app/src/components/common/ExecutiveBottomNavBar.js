import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAttendance } from '../../context/AttendanceContext';
import { Alert, Platform } from 'react-native';

// Premium White Theme with Gold Accents
const COLORS = {
    primary: '#D4AF37',
    background: '#FFFFFF',
    cardBg: '#FFFFFF',
    textMuted: '#666666',
};

// Simplified BottomNavBar for Executive Team - No Add Client/Project/Invoice access
const ExecutiveBottomNavBar = ({ navigation, activeTab = 'dashboard' }) => {
    const { isCheckedIn } = useAttendance();

    const tabs = [
        { id: 'dashboard', icon: 'home', label: 'Home', route: 'ExecutiveDashboard' },
        { id: 'projects', icon: 'briefcase', label: 'Projects', route: 'ExecutiveProjectList' },
        { id: 'profile', icon: 'user', label: 'Profile', route: 'Profile' },
    ];

    const handlePress = (tab) => {
        if (tab.id !== activeTab) {
            if (!isCheckedIn && tab.id !== 'profile') {
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

export default ExecutiveBottomNavBar;
