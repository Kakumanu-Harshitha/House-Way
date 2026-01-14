import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { attendanceAPI } from '../utils/api';
import { useAuth } from './AuthContext';

const AttendanceContext = createContext();

export const useAttendance = () => {
    const context = useContext(AttendanceContext);
    if (!context) {
        // Return safe defaults if used outside provider
        return {
            isCheckedIn: false,
            todayStats: { totalActiveMinutes: 0 },
            checkIn: async () => ({ success: false }),
            checkOut: async () => ({ success: false }),
            getStats: async () => null,
            fetchStatus: async () => { },
        };
    }
    return context;
};

export const AttendanceProvider = ({ children }) => {
    const { token, isAuthenticated } = useAuth();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [todayStats, setTodayStats] = useState({ totalActiveMinutes: 0 });
    const [lastHeartbeat, setLastHeartbeat] = useState(null);

    const appState = useRef(AppState.currentState);
    const heartbeatInterval = useRef(null);
    const activeStartTime = useRef(null);

    // Fetch current status on mount and when authenticated
    // Reset when user logs out
    useEffect(() => {
        if (token && isAuthenticated) {
            fetchStatus();
        } else {
            // Reset state when logged out
            setIsCheckedIn(false);
            setTodayStats({ totalActiveMinutes: 0 });
            setLastHeartbeat(null);
            if (heartbeatInterval.current) {
                clearInterval(heartbeatInterval.current);
                heartbeatInterval.current = null;
            }
        }
    }, [token, isAuthenticated]);

    // Track app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [isCheckedIn]);

    // Setup hourly heartbeat when checked in
    useEffect(() => {
        if (isCheckedIn && token) {
            // Start tracking active time
            activeStartTime.current = Date.now();

            // Send heartbeat every hour (3600000 ms)
            heartbeatInterval.current = setInterval(() => {
                sendHeartbeat();
            }, 3600000); // 1 hour

            // Also send a heartbeat immediately on check-in
            sendHeartbeat();

            return () => {
                if (heartbeatInterval.current) {
                    clearInterval(heartbeatInterval.current);
                }
            };
        }
    }, [isCheckedIn, token]);

    const handleAppStateChange = (nextAppState) => {
        if (isCheckedIn) {
            if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
                // App going to background - save active time
                console.log('[Attendance] App going to background');
            } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // App coming to foreground - resume tracking
                console.log('[Attendance] App coming to foreground');
                activeStartTime.current = Date.now();
            }
        }
        appState.current = nextAppState;
    };

    const fetchStatus = async () => {
        try {
            const response = await attendanceAPI.getStatus();

            if (response.success) {
                setIsCheckedIn(response.data.isCheckedIn);
                setTodayStats({
                    totalActiveMinutes: response.data.totalActiveMinutes || 0,
                    totalActiveHours: response.data.totalActiveHours || 0,
                    checkInTime: response.data.checkInTime,
                });
                setLastHeartbeat(response.data.lastHeartbeat);
            }
        } catch (error) {
            console.error('[Attendance] Status fetch error:', error);
        }
    };

    const sendHeartbeat = async () => {
        if (!token || !isCheckedIn) return;

        try {
            // Compute minutes to report for this heartbeat.
            // Prefer minutes since lastHeartbeat (if present), otherwise since activeStartTime.
            const nowMs = Date.now();
            let referenceMs = activeStartTime.current || nowMs;
            if (lastHeartbeat) {
                const parsed = Date.parse(lastHeartbeat);
                if (!Number.isNaN(parsed)) referenceMs = parsed;
            }

            // Minutes elapsed since reference point (cap between 0 and 60)
            let minutesElapsed = Math.floor((nowMs - referenceMs) / 60000);
            minutesElapsed = Math.max(0, Math.min(60, minutesElapsed));

            // Debug: log computed minutes and reference points to help diagnose unexpected 60-minute updates
            console.log('[Attendance] sendHeartbeat called. minutesElapsed=', minutesElapsed, 'lastHeartbeat=', lastHeartbeat, 'activeStartTime=', activeStartTime.current);

            // If nothing meaningful to report (0 minutes) still call API to update lastHeartbeat,
            // but avoid sending a full hour at check-in.
            console.log('[Attendance] Sending heartbeat payload:', { activeMinutes: minutesElapsed });
            const response = await attendanceAPI.heartbeat(minutesElapsed);

            if (response.success) {
                setTodayStats(prev => ({
                    ...prev,
                    totalActiveMinutes: response.data.totalActiveMinutes,
                    totalActiveHours: response.data.totalActiveHours,
                }));
                setLastHeartbeat(new Date().toISOString());
                console.log('[Attendance] Heartbeat sent:', response.data);
                // Reset activeStartTime to now so future heartbeats measure from here
                activeStartTime.current = Date.now();
            }
        } catch (error) {
            console.error('[Attendance] Heartbeat error:', error);
        }
    };

    const checkIn = async () => {
        try {
            const response = await attendanceAPI.checkIn();

            if (response.success) {
                setIsCheckedIn(true);
                await AsyncStorage.setItem('lastCheckIn', new Date().toISOString());
                fetchStatus();
            }
            return response;
        } catch (error) {
            console.error('[Attendance] Check-in error:', error);
            return { success: false, message: error.message };
        }
    };

    const checkOut = async () => {
        try {
            // Send final heartbeat before checkout
            await sendHeartbeat();

            const response = await attendanceAPI.checkOut();

            if (response.success) {
                setIsCheckedIn(false);
                if (heartbeatInterval.current) {
                    clearInterval(heartbeatInterval.current);
                }
                await AsyncStorage.removeItem('lastCheckIn');
            }
            return response;
        } catch (error) {
            console.error('[Attendance] Check-out error:', error);
            return { success: false, message: error.message };
        }
    };

    const getStats = async (period = 'weekly') => {
        try {
            const response = await attendanceAPI.getStats(period);
            return response.data;
        } catch (error) {
            console.error('[Attendance] Stats error:', error);
            return null;
        }
    };

    const value = {
        isCheckedIn,
        todayStats,
        lastHeartbeat,
        checkIn,
        checkOut,
        getStats,
        fetchStatus,
    };

    return (
        <AttendanceContext.Provider value={value}>
            {children}
        </AttendanceContext.Provider>
    );
};

export default AttendanceContext;
