import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AppHeader from '../components/AppHeader';
import theme from '../../../styles/theme';
import { dashboardAPI } from '../../../utils/api';

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    load(); 
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getRecentActivity({ limit: 20 });
      if (res.success) {
        // Transform activity data to notification format
        const transformedNotifications = (res.data.activities || []).map((activity, index) => ({
          id: activity._id || index,
          title: activity.message || activity.title || 'Notification',
          subtitle: activity.type ? activity.type + ': ' + activity.title : activity.title,
          time: activity.createdAt ? getTimeAgo(activity.createdAt) : 'Unknown time'
        }));
        setNotifications(transformedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return diffInMinutes + ' mins ago';
    if (diffInMinutes < 1440) return Math.floor(diffInMinutes / 60) + ' hrs ago';
    return Math.floor(diffInMinutes / 1440) + ' days ago';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex:1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Notifications" onMenu={() => navigation.openDrawer()} />
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <TouchableOpacity 
          style={{ alignSelf: 'flex-end', marginBottom: 12 }}
          onPress={() => Alert.alert('Info', 'Mark all as read functionality would be implemented here')}
        >
          <Text style={{ color: theme.colors.primary }}>Mark all as read</Text>
        </TouchableOpacity>
        {notifications.map(n => (
          <View key={n.id} style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius, padding: 16, marginBottom: 12 }}>
            <Text style={{ fontWeight: '700' }}>{n.title}</Text>
            <Text style={{ color: theme.colors.muted }}>{n.subtitle}</Text>
            <Text style={{ color: theme.colors.muted, marginTop: 8 }}>{n.time}</Text>
          </View>
        ))}
        {notifications.length === 0 && (
          <Text style={{ color: theme.colors.muted, textAlign: 'center', marginTop: 20 }}>
            No notifications found
          </Text>
        )}
      </ScrollView>
    </View>
  );
}