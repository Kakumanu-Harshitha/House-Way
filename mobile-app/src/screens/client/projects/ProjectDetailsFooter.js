import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useRoute, useNavigation } from '@react-navigation/native';
import MediaScreen from './MediaScreen';
import PaymentsScreen from './PaymentsScreen';
import CatalogScreen from './CatalogScreen';
import InspirationScreen from './InspirationScreen';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ProjectOverview from './OverviewPage';
const Tab = createBottomTabNavigator();

export default function ProjectFooterTabs() {
  const route = useRoute();
  const navigation = useNavigation();
  const { projectId } = route.params || {};
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(184, 134, 11, 0.1)',
        },
        headerTintColor: '#1A1A1A',
        headerTitleStyle: { fontSize: 16, fontWeight: '700', color: '#D4AF37' },
        headerTitleAlign: 'center',

        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Dashboard')}
            style={{ marginRight: 16 }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="home-outline" size={22} color="#D4AF37" />
          </TouchableOpacity>
        ),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: 'rgba(184, 134, 11, 0.1)',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#D4AF37',
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={ProjectOverview}
        initialParams={{ projectId }}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Media"
        component={MediaScreen}
        initialParams={{ projectId }}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsScreen}
        initialParams={{ projectId }}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Catalog"
        component={CatalogScreen}
        initialParams={{ projectId }}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Inspiration"
        component={InspirationScreen}
        initialParams={{ projectId }}
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}