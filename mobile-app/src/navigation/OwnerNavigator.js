import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// Owner Screens
import OwnerDashboardScreen from '../screens/owner/OwnerDashboardScreen';
import OwnerEmployeesScreen from '../screens/owner/OwnerEmployeesScreenNew';  // Using new simplified version
import OwnerVendorsScreen from '../screens/owner/OwnerVendorsScreen';
import OwnerClientsScreen from '../screens/owner/OwnerClientsScreen';
import OwnerProfileScreen from '../screens/owner/OwnerProfileScreen';
import OwnerSettingsScreen from '../screens/owner/OwnerSettingsScreen';
import OwnerHelpScreen from '../screens/owner/OwnerHelpScreen';

// Finance Screens
import FinanceHubScreen from '../screens/owner/FinanceHubScreen';
import ReceivablesScreen from '../screens/owner/ReceivablesScreen';
import PayablesScreen from '../screens/owner/PayablesScreen';
import InvoicesScreen from '../screens/owner/InvoicesScreen';
import PurchaseOrdersScreen from '../screens/owner/PurchaseOrdersScreen';
import CreateInvoiceScreen from '../screens/clientManagement/CreateInvoiceScreen';

// Project Screens
import ProjectsHubScreen from '../screens/owner/ProjectsHubScreen';
import ActiveProjectsListScreen from '../screens/owner/ActiveProjectsListScreen';
import ProjectDetailsScreen from '../screens/owner/ProjectDetailsScreen';
import CreateProjectScreen from '../screens/client/projects/CreateProjectScreen';
import ProjectPaymentsScreen from '../screens/client/projects/PaymentsScreen';

// Shared Screens
import NegotiationChatScreen from '../screens/shared/NegotiationChatScreen';
import AdminDeliveryTrackingScreen from '../screens/owner/AdminDeliveryTrackingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import HelpScreen from '../screens/HelpScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// --- Feature Stacks ---

const OverviewStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Dashboard" component={OwnerDashboardScreen} />
    <Stack.Screen name="Clients" component={OwnerClientsScreen} />
    <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
    <Stack.Screen name="NegotiationChat" component={NegotiationChatScreen} />
    <Stack.Screen name="AdminDeliveryTracking" component={AdminDeliveryTrackingScreen} />
    <Stack.Screen name="ProfileScreen" component={OwnerProfileScreen} />
    <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
    <Stack.Screen name="HelpScreen" component={HelpScreen} />
    <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
  </Stack.Navigator>
);

const FinanceStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FinanceHub" component={FinanceHubScreen} />
    <Stack.Screen name="Receivables" component={ReceivablesScreen} />
    <Stack.Screen name="Payables" component={PayablesScreen} />
    <Stack.Screen name="Invoices" component={InvoicesScreen} />
    <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
    <Stack.Screen name="ProjectPayments" component={ProjectPaymentsScreen} />
    <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
  </Stack.Navigator>
);

const ProjectsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProjectsHub" component={ProjectsHubScreen} />
    <Stack.Screen name="ProjectList" component={ActiveProjectsListScreen} />
    <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
    <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
  </Stack.Navigator>
);

const EmployeesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmployeeList" component={OwnerEmployeesScreen} />
    {/* <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} /> */}
  </Stack.Navigator>
);

const VendorsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VendorList" component={OwnerVendorsScreen} />
    <Stack.Screen name="NegotiationChat" component={NegotiationChatScreen} />
    <Stack.Screen name="AdminDeliveryTracking" component={AdminDeliveryTrackingScreen} />
    {/* <Stack.Screen name="VendorProfile" component={VendorProfileScreen} /> */}
  </Stack.Navigator>
);

// --- Main Tab Navigator ---

const OwnerNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Overview') {
            iconName = focused ? 'home' : 'home-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Projects') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Finance') {
            // Use Chart/Graph icon for Finance
            return <MaterialCommunityIcons name={focused ? 'finance' : 'chart-line'} size={size} color={color} />;
          } else if (route.name === 'Employees') {
            iconName = focused ? 'people' : 'people-outline';
            return <Ionicons name={iconName} size={size} color={color} />;
          } else if (route.name === 'Vendors') {
            return <FontAwesome5 name="store" size={size - 2} color={color} />;
          }
        },
        tabBarActiveTintColor: '#FFC107', // Gold/Yellow active
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          borderTopColor: '#eee',
          elevation: 5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#fff'
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        }
      })}
    >
      <Tab.Screen name="Overview" component={OverviewStack} />
      <Tab.Screen name="Finance" component={FinanceStack} />
      <Tab.Screen name="Projects" component={ProjectsStack} />
      <Tab.Screen name="Vendors" component={VendorsStack} />
      <Tab.Screen name="Employees" component={EmployeesStack} />
    </Tab.Navigator>
  );
};

export default OwnerNavigator;