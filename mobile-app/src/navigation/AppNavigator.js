import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';

// Import navigators
import AuthNavigator from './AuthNavigator';
import RoleBasedNavigator from './RoleBasedNavigator';

// Import screens
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [forceAuth, setForceAuth] = useState(false);
  
  useEffect(() => {
    console.log('[AppNavigator] Auth state changed:', { isAuthenticated, isLoading, user: !!user });
    
    // Force navigation to auth after 10 seconds if still loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('[AppNavigator] Timeout reached while loading, forcing auth navigation');
        setForceAuth(true);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [isAuthenticated, isLoading, user]);

  if (isLoading && !forceAuth) {
    console.log('[AppNavigator] Showing LoadingScreen');
    return <LoadingScreen />;
  }

  console.log('[AppNavigator] Rendering navigation stack:', { isAuthenticated, user: !!user, forceAuth });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated && user && !forceAuth ? (
          <Stack.Screen name="Main" component={RoleBasedNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;