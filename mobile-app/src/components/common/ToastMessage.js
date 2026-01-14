import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../../styles/colors';

/**
 * Toast notification component for in-screen messages
 * Usage: <ToastMessage visible={true} message="Success!" type="success" onHide={() => {}} />
 */
const ToastMessage = ({ visible, message, type = 'success', onHide, duration = 3000 }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Slide in
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            // Auto hide after duration
            const timer = setTimeout(() => {
                hideToast();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hideToast = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            if (onHide) onHide();
        });
    };

    if (!visible) return null;

    const getIconAndColor = () => {
        switch (type) {
            case 'success':
                return { icon: 'check-circle', bgColor: '#10B981', iconColor: '#fff' };
            case 'error':
                return { icon: 'alert-circle', bgColor: '#EF4444', iconColor: '#fff' };
            case 'warning':
                return { icon: 'alert-triangle', bgColor: '#F59E0B', iconColor: '#fff' };
            case 'info':
                return { icon: 'info', bgColor: '#3B82F6', iconColor: '#fff' };
            default:
                return { icon: 'check-circle', bgColor: '#10B981', iconColor: '#fff' };
        }
    };

    const { icon, bgColor, iconColor } = getIconAndColor();

    return (
        <Animated.View
            style={[
                styles.container,
                { backgroundColor: bgColor, transform: [{ translateY }], opacity },
            ]}
        >
            <Feather name={icon} size={20} color={iconColor} />
            <Text style={styles.message}>{message}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999,
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 10,
    },
});

export default ToastMessage;
