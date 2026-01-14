import React from 'react';
import { useAuth } from '../context/AuthContext';

// Import role-specific navigators
import OwnerNavigator from './OwnerNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import VendorNavigator from './VendorNavigator';
import ClientNavigator from './ClientNavigator';
import GuestNavigator from './GuestNavigator';

const RoleBasedNavigator = () => {
  const { user } = useAuth();
  
  console.log('[RoleBasedNavigator] User:', user);

  if (!user) {
    console.log('[RoleBasedNavigator] No user, rendering GuestNavigator');
    return <GuestNavigator />;
  }

  console.log('[RoleBasedNavigator] User role:', user.role);
  
  switch (user.role) {
    case 'owner':
      console.log('[RoleBasedNavigator] Rendering OwnerNavigator');
      return <OwnerNavigator />;
    case 'employee':
      console.log('[RoleBasedNavigator] Rendering EmployeeNavigator');
      return <EmployeeNavigator />;
    case 'vendor':
      console.log('[RoleBasedNavigator] Rendering VendorNavigator');
      return <VendorNavigator />;
    case 'client':
      console.log('[RoleBasedNavigator] Rendering ClientNavigator');
      return <ClientNavigator />;
    case 'guest':
    default:
      console.log('[RoleBasedNavigator] Rendering GuestNavigator (default)');
      return <GuestNavigator />;
  }
};

export default RoleBasedNavigator;