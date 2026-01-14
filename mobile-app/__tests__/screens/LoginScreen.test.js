import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/screens/auth/LoginScreen';
import AuthContext from '../../src/context/AuthContext';

// Mock the AuthContext
const mockLogin = jest.fn(async () => ({ success: true }));
const mockClearError = jest.fn();
const mockAuthContextValue = {
  login: mockLogin,
  error: null,
  clearError: mockClearError,
};

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Wrapper component with AuthContext
const LoginScreenWrapper = ({ authValue = mockAuthContextValue }) => (
  <AuthContext.Provider value={authValue}>
    <LoginScreen navigation={mockNavigation} />
  </AuthContext.Provider>
);

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
  });

  it('should render correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreenWrapper />);
    
    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Login')).toBeTruthy();
    expect(getByText('Register here')).toBeTruthy();
  });

  it('should handle email input', () => {
    const { getByPlaceholderText } = render(<LoginScreenWrapper />);
    const emailInput = getByPlaceholderText('Enter your email');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    expect(emailInput.props.value).toBe('test@example.com');
  });

  it('should handle password input', () => {
    const { getByPlaceholderText } = render(<LoginScreenWrapper />);
    const passwordInput = getByPlaceholderText('Enter your password');
    
    fireEvent.changeText(passwordInput, 'password123');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('should validate empty fields', async () => {
    const { getByText } = render(<LoginScreenWrapper />);
    const loginButton = getByText('Login');
    
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Please fill in all fields'
      );
    });
  });

  it('should call login with correct credentials', async () => {
    const { getByPlaceholderText, getByText } = render(<LoginScreenWrapper />);
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Login');
    
    fireEvent.changeText(emailInput, ' Test@Example.com ');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should navigate to register screen', () => {
    const { getByText } = render(<LoginScreenWrapper />);
    const registerLink = getByText('Register here');
    
    fireEvent.press(registerLink);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('should handle login error', async () => {
    const errorLogin = jest.fn().mockResolvedValue({ success: false, message: 'Invalid credentials' });
    const errorAuthValue = {
      ...mockAuthContextValue,
      login: errorLogin,
    };
    
    const { getByPlaceholderText, getByText } = render(
      <LoginScreenWrapper authValue={errorAuthValue} />
    );
    
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Login');
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);
    
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Login Failed',
        'Invalid credentials'
      );
    });
  });
});
