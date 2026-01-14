/**
 * Unified Alert Helper
 * Provides consistent alert behavior across web and mobile platforms
 */

import { Alert, Platform } from 'react-native';

/**
 * Show a simple alert message
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {function} onOk - Optional callback when user presses OK
 */
export const showAlert = (title, message, onOk = null) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, [
      { text: 'OK', onPress: onOk }
    ]);
  }
};

/**
 * Show a confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {function} onConfirm - Callback when user confirms
 * @param {function} onCancel - Optional callback when user cancels
 * @param {string} confirmText - Text for confirm button (default: 'OK')
 * @param {string} cancelText - Text for cancel button (default: 'Cancel')
 */
export const showConfirm = (title, message, onConfirm, onCancel = null, confirmText = 'OK', cancelText = 'Cancel') => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: onCancel },
      { text: confirmText, onPress: onConfirm }
    ]);
  }
};

/**
 * Show a destructive confirmation (e.g., for delete, logout)
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {function} onConfirm - Callback when user confirms
 * @param {string} confirmText - Text for confirm button (default: 'Delete')
 */
export const showDestructiveConfirm = (title, message, onConfirm, confirmText = 'Delete') => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`⚠️ ${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmText, style: 'destructive', onPress: onConfirm }
    ]);
  }
};

/**
 * Show error alert with consistent formatting
 * @param {string} message - Error message
 * @param {Error|string} error - Optional error object for details
 */
export const showError = (message, error = null) => {
  const errorDetails = error?.response?.data?.message || error?.message || '';
  const fullMessage = errorDetails ? `${message}\n\n${errorDetails}` : message;
  
  if (__DEV__) {
    console.error('[Alert Error]', message, error);
  }
  
  showAlert('Error', fullMessage);
};

/**
 * Show success alert
 * @param {string} message - Success message
 * @param {function} onOk - Optional callback
 */
export const showSuccess = (message, onOk = null) => {
  showAlert('Success', message, onOk);
};

export default {
  showAlert,
  showConfirm,
  showDestructiveConfirm,
  showError,
  showSuccess,
};
