import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

// Import Client screens
import ClientDashboardScreen from '../screens/client/ClientDashboardScreen';
import ProjectsScreen from '../screens/client/projects/ProjectsScreen';
import CreateProjectScreen from '../screens/client/projects/CreateProjectScreen'; // Imported
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ServiceRequestsScreen from '../screens/services/ServiceRequestsScreen';
import CreateServiceRequestScreen from '../screens/services/CreateServiceRequestScreen';
import ServiceRequestDetailsScreen from '../screens/services/ServiceRequestDetailsScreen';

// Import Project footer tabs (nested navigator)
import ProjectFooterTabs from '../screens/client/projects/ProjectDetailsFooter';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// --- Dashboard Stack ---
const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ClientDashboard" component={ClientDashboardScreen} />
    <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    <Stack.Screen name="HelpScreen" component={HelpScreen} />
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
  </Stack.Navigator>
);

// --- Projects Stack ---
const ProjectsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProjectsList" component={ProjectsScreen} />
    <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
    {/* Nested footer tabs for project details */}
    <Stack.Screen name="ProjectDetails" component={ProjectFooterTabs} />
  </Stack.Navigator>
);

// --- Profile Stack ---
const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileDetails" component={ProfileScreen} />
    <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    <Stack.Screen name="HelpScreen" component={HelpScreen} />
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
    <Stack.Screen name="ServiceRequests" component={ServiceRequestsScreen} />
    <Stack.Screen name="CreateServiceRequest" component={CreateServiceRequestScreen} />
    <Stack.Screen name="ServiceRequestDetails" component={ServiceRequestDetailsScreen} />
  </Stack.Navigator>
);

// --- Main Tabs ---
const ClientNavigator = () => {
  return (
    <Tab.Navigator
      id="rootTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#D4AF37', // Dark Golden Rod
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(184, 134, 11, 0.1)',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Projects':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />

      <Tab.Screen
        name="Projects"
        component={ProjectsStack}
        options={({ route }) => {
          // Find which child route is active
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProjectsList';

          // Hide parent bottom tab bar when in ProjectDetails
          if (routeName === 'ProjectDetails') {
            return {
              tabBarStyle: { display: 'none' },
            };
          }
          return {};
        }}
      />

      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default ClientNavigator;
