import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import theme from '../styles/theme';

// Vendor Screens
import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import PaymentsInvoicesScreen from '../screens/vendor/screens/PaymentsInvoices';
import MediaGalleryScreen from '../screens/vendor/screens/MediaGallery';
import VendorProfileScreen from '../screens/vendor/screens/VendorProfile';
import WorkUpdatesScreen from '../screens/vendor/screens/WorkUpdates';
import UploadWorkStatusScreen from '../screens/vendor/screens/UploadWorkStatus';
import MaterialRequestsScreen from '../screens/vendor/screens/MaterialRequests';

// Shared Screens
import VendorOrdersScreen from '../screens/vendor/VendorOrdersScreen';
import SharedNegotiationChatScreen from '../screens/shared/NegotiationChatScreen';
import VendorDeliveryScreen from '../screens/vendor/VendorDeliveryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/* ===========================
   INDIVIDUAL STACKS
=========================== */

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
    <Stack.Screen name="ProfileScreen" component={VendorProfileScreen} />
    <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    <Stack.Screen name="HelpScreen" component={HelpScreen} />
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
    <Stack.Screen name="NegotiationChat" component={SharedNegotiationChatScreen} />
    <Stack.Screen name="MaterialRequests" component={MaterialRequestsScreen} />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VendorOrders" component={VendorOrdersScreen} />
    <Stack.Screen name="NegotiationChat" component={SharedNegotiationChatScreen} />
    <Stack.Screen name="VendorDelivery" component={VendorDeliveryScreen} />
  </Stack.Navigator>
);

const PaymentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PaymentsInvoices" component={PaymentsInvoicesScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VendorProfile" component={VendorProfileScreen} />
    <Stack.Screen name="MediaGallery" component={MediaGalleryScreen} />
    <Stack.Screen name="WorkUpdates" component={WorkUpdatesScreen} />
    <Stack.Screen name="UploadWorkStatus" component={UploadWorkStatusScreen} />
  </Stack.Navigator>
);

const RequestsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MaterialRequests" component={MaterialRequestsScreen} />
    <Stack.Screen name="QuotationManagement" component={MaterialRequestsScreen} />
  </Stack.Navigator>
);

/* ===========================
   MAIN TAB NAVIGATOR
=========================== */

const VendorNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Requests':
              iconName = focused ? 'file-text' : 'file-text';
              break;
            case 'Payments':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          // Use Feather icon for Requests
          if (route.name === 'Requests') {
            return <Ionicons name={iconName} size={22} color={color} />;
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: theme.colors.background.primary,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 6,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsStack}
        options={{ 
          tabBarLabel: 'Requests',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? 'file-document' : 'file-document-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersStack}
        options={{ 
          tabBarLabel: 'Orders',
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons 
              name={focused ? 'clipboard-text' : 'clipboard-text-outline'} 
              size={22} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Payments"
        component={PaymentsStack}
        options={{ tabBarLabel: 'Invoices' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default VendorNavigator;