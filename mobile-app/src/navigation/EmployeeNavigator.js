import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import screens
import LoginSelectionScreen from '../screens/employee/LoginSelectionScreen';
import EmployeeDashboardScreen from '../screens/employee/EmployeeDashboardScreen';

import CheckInScreen from '../screens/employee/CheckInScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/employee/ProfileScreen';
import HelpScreen from '../screens/HelpScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// Import executive screens
import ExecutiveDashboardScreen from '../screens/executive/ExecutiveDashboardScreen';
import ExecutiveProjectListScreen from '../screens/executive/ExecutiveProjectListScreen';
import ExecutiveProjectDetailScreen from '../screens/executive/ExecutiveProjectDetailScreen';

// Import client management screens
import HomeDashboardScreen from '../screens/clientManagement/HomeDashboardScreen';
import ClientsListScreen from '../screens/clientManagement/ClientsListScreen';
import ClientProfileScreen from '../screens/clientManagement/ClientProfileScreen';
import ProjectListScreen from '../screens/clientManagement/ProjectListScreen';
import ProjectDetailScreen from '../screens/clientManagement/ProjectDetailScreen';
import AddClientScreen from '../screens/clientManagement/AddClientScreen';
import CreateProjectScreen from '../screens/client/projects/CreateProjectScreen';
import CreateInvoiceScreen from '../screens/clientManagement/CreateInvoiceScreen';
import InvoiceDetailScreen from '../screens/clientManagement/InvoiceDetailScreen';
import ViewInvoicesScreen from '../screens/clientManagement/ViewInvoicesScreen';
import EditClientScreen from '../screens/clientManagement/EditClientScreen';

// Import vendor team screens
import VendorTeamDashboardScreen from '../screens/vendorTeam/VendorTeamDashboardScreen';
import VendorTeamProjectDetailScreen from '../screens/vendorTeam/VendorTeamProjectDetailScreen';
import VendorTeamProfileScreen from '../screens/vendorTeam/VendorTeamProfileScreen';

// Import shared screens
import AboutHousewayScreen from '../screens/shared/AboutHousewayScreen';


const Stack = createStackNavigator();

const EmployeeNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="CheckIn"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: '#F5F5F0' },
      }}
    >
      {/* Check-In Screen - First screen after login */}
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreen}
        options={{
          title: 'Check In',
          gestureEnabled: false,
        }}
      />


      {/* Original Employee Dashboard */}
      <Stack.Screen
        name="EmployeeDashboard"
        component={EmployeeDashboardScreen}
        options={{
          title: 'Project Dashboard',
        }}
      />

      {/* Shared Settings/Help Screens */}
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />

      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />

      <Stack.Screen
        name="HelpScreen"
        component={HelpScreen}
        options={{
          title: 'Help',
        }}
      />

      <Stack.Screen
        name="NotificationsScreen"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
        }}
      />

      {/* Client Management Dashboard */}
      <Stack.Screen
        name="HomeDashboard"
        component={HomeDashboardScreen}
        options={{
          title: 'Client Management',
          gestureEnabled: false, // Prevent going back to selection
        }}
      />

      {/* Client Management Screens */}
      <Stack.Screen
        name="ClientsList"
        component={ClientsListScreen}
        options={{
          title: 'Clients',
        }}
      />

      <Stack.Screen
        name="ClientProfile"
        component={ClientProfileScreen}
        options={{
          title: 'Client Profile',
        }}
      />

      <Stack.Screen
        name="AddClient"
        component={AddClientScreen}
        options={{
          title: 'Add Client',
        }}
      />

      <Stack.Screen
        name="EditClient"
        component={EditClientScreen}
        options={{
          title: 'Edit Client',
        }}
      />

      <Stack.Screen
        name="ProjectList"
        component={ProjectListScreen}
        options={{
          title: 'Projects',
        }}
      />

      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{
          title: 'Project Details',
        }}
      />

      {/* Executive Team Screens */}
      <Stack.Screen
        name="ExecutiveDashboard"
        component={ExecutiveDashboardScreen}
        options={{
          title: 'Executive Dashboard',
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="ExecutiveProjectList"
        component={ExecutiveProjectListScreen}
        options={{
          title: 'My Projects',
        }}
      />

      <Stack.Screen
        name="ExecutiveProjectDetail"
        component={ExecutiveProjectDetailScreen}
        options={{
          title: 'Project Details',
        }}
      />

      {/* Vendor Team Screens */}
      <Stack.Screen
        name="VendorTeamDashboard"
        component={VendorTeamDashboardScreen}
        options={{
          title: 'Vendor Management',
          gestureEnabled: false,
        }}
      />

      <Stack.Screen
        name="VendorTeamProjectDetail"
        component={VendorTeamProjectDetailScreen}
        options={{
          title: 'Project Details',
        }}
      />

      {/* TODO: Add remaining client management screens when implemented */}
      <Stack.Screen
        name="AddTimelineEvent"
        component={() => null}
        options={{
          title: 'Add Timeline Event',
        }}
      />

      <Stack.Screen
        name="UploadMedia"
        component={() => null}
        options={{
          title: 'Upload Media',
        }}
      />

      <Stack.Screen
        name="CreateInvoice"
        component={CreateInvoiceScreen}
        options={{
          title: 'Create Invoice',
        }}
      />

      <Stack.Screen
        name="ViewInvoice"
        component={InvoiceDetailScreen}
        options={{
          title: 'Invoice Details',
        }}
      />

      <Stack.Screen
        name="ViewInvoices"
        component={ViewInvoicesScreen}
        options={{
          title: 'Project Invoices',
        }}
      />

      <Stack.Screen
        name="CreateProject"
        component={CreateProjectScreen}
        options={{
          title: 'Create Project',
        }}
      />

      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />

      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />

      <Stack.Screen
        name="VendorTeamProfile"
        component={VendorTeamProfileScreen}
        options={{
          title: 'Profile',
        }}
      />

      <Stack.Screen
        name="AboutHouseway"
        component={AboutHousewayScreen}
        options={{
          title: 'About Houseway',
        }}
      />
    </Stack.Navigator>
  );
};

export default EmployeeNavigator;