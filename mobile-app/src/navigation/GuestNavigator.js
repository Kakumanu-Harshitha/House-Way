import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import Guest screens
import GuestScreen from '../screens/guest/GuestScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

const Stack = createStackNavigator();

const GuestNavigator = () => {
  useEffect(() => {
    console.log('[GuestNavigator] Component mounted');
  }, []);

  console.log('[GuestNavigator] Rendering navigation stack');

  return (
    <Stack.Navigator
      initialRouteName="GuestHome"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#607D8B',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="GuestHome" 
        component={GuestScreen} 
        options={{ 
          title: 'Houseway - House Design Company',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen} 
        options={{ title: 'Login' }} 
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen} 
        options={{ title: 'Register' }} 
      />
    </Stack.Navigator>
  );
};

export default GuestNavigator;