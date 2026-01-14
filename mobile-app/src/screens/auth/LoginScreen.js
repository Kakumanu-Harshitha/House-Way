import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import theme from '../../styles/theme';
import { Picker } from '@react-native-picker/picker';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login, error, clearError } = useAuth();



  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      const result = await login(email.trim().toLowerCase(), password);

      if (result.success) {
        // Navigation will be handled automatically by the AuthContext
        console.log('Login successful');
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterNavigation = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🏠</Text>
            <Text style={styles.companyName}>Houseway</Text>
            <Text style={styles.welcomeText}>Welcome Back</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>



            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={{ ...styles.loginButton, ...(isLoading && styles.disabledButton) }}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#161010ff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={handleRegisterNavigation}
                disabled={isLoading}
              >
                <Text style={styles.registerLink}>Register here</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Demo Credentials */}
          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>🔓 Demo Credentials (password123)</Text>

            {/* Owner */}
            <View style={styles.demoRoleContainer}>
              <Text style={styles.demoRoleTitle}>👑 Owner</Text>
              <Text style={styles.demoText}>owner@houseway.com</Text>
            </View>

            {/* Employees */}
            <View style={styles.demoRoleContainer}>
              <Text style={styles.demoRoleTitle}>👷 Employees (15)</Text>
              <View style={styles.demoSubGroup}>
                <Text style={styles.demoSubTitle}>Design Team:</Text>
                <Text style={styles.demoText}>employee.designteam.1-5@houseway.com</Text>
              </View>
              <View style={styles.demoSubGroup}>
                <Text style={styles.demoSubTitle}>Vendor Team:</Text>
                <Text style={styles.demoText}>employee.vendorteam.1-5@houseway.com</Text>
              </View>
              <View style={styles.demoSubGroup}>
                <Text style={styles.demoSubTitle}>Execution Team:</Text>
                <Text style={styles.demoText}>employee.executionteam.1-5@houseway.com</Text>
              </View>
            </View>

            {/* Vendors */}
            <View style={styles.demoRoleContainer}>
              <Text style={styles.demoRoleTitle}>🔧 Vendors (20)</Text>
              <Text style={styles.demoText}>vendor1-20@company.com</Text>
            </View>

            {/* Clients */}
            <View style={styles.demoRoleContainer}>
              <Text style={styles.demoRoleTitle}>🏠 Clients (30)</Text>
              <Text style={styles.demoText}>client1-30@example.com</Text>
            </View>

            {/* Guests */}
            <View style={styles.demoRoleContainer}>
              <Text style={styles.demoRoleTitle}>👥 Guests (5)</Text>
              <Text style={styles.demoText}>guest1-5@example.com</Text>
            </View>

            <View style={styles.demoNote}>
              <Text style={styles.demoNoteText}>⚠️ Testing only. Never use in production.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 60,
    marginBottom: 10,
  },
  companyName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary.main,
    marginBottom: 5,
  },
  welcomeText: {
    fontSize: 18,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  loginButtonText: {
    color: '#070000ff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  registerLink: {
    fontSize: 16,
    color: theme.colors.primary.main,
    fontWeight: '600',
  },
  demoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1976d2',
    marginBottom: 10,
    textAlign: 'center',
  },
  demoRoleContainer: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#1976d2',
  },
  demoRoleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  demoSubGroup: {
    marginLeft: 12,
    marginTop: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#90caf9',
  },
  demoSubTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1565c0',
    marginBottom: 2,
  },
  demoText: {
    fontSize: 13,
    color: '#1976d2',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 2,
  },
  demoNote: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  demoNoteText: {
    fontSize: 12,
    color: '#e65100',
    fontWeight: '500',
  },
});

export default LoginScreen;
