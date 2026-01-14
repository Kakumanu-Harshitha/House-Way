import { Alert } from 'react-native';

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// Error messages
export const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Network connection failed. Please check your internet connection.',
  [ERROR_TYPES.VALIDATION]: 'Please check your input and try again.',
  [ERROR_TYPES.AUTHENTICATION]: 'Authentication failed. Please login again.',
  [ERROR_TYPES.AUTHORIZATION]: 'You do not have permission to perform this action.',
  [ERROR_TYPES.SERVER]: 'Server error occurred. Please try again later.',
  [ERROR_TYPES.CLIENT]: 'An error occurred. Please try again.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

// Custom error class
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, statusCode = null, details = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Error handler utility
export class ErrorHandler {
  static handle(error, showAlert = true, customMessage = null) {
    console.error('Error occurred:', error);

    let errorType = ERROR_TYPES.UNKNOWN;
    let message = customMessage || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];

    // Handle different error types
    if (error instanceof AppError) {
      errorType = error.type;
      message = customMessage || error.message || ERROR_MESSAGES[errorType];
    } else if (error.response) {
      // HTTP error response
      const status = error.response.status;
      const data = error.response.data;

      if (status >= 400 && status < 500) {
        if (status === 401) {
          errorType = ERROR_TYPES.AUTHENTICATION;
          message = customMessage || data?.message || ERROR_MESSAGES[ERROR_TYPES.AUTHENTICATION];
        } else if (status === 403) {
          errorType = ERROR_TYPES.AUTHORIZATION;
          message = customMessage || data?.message || ERROR_MESSAGES[ERROR_TYPES.AUTHORIZATION];
        } else if (status === 422) {
          errorType = ERROR_TYPES.VALIDATION;
          message = customMessage || data?.message || ERROR_MESSAGES[ERROR_TYPES.VALIDATION];
        } else {
          errorType = ERROR_TYPES.CLIENT;
          message = customMessage || data?.message || ERROR_MESSAGES[ERROR_TYPES.CLIENT];
        }
      } else if (status >= 500) {
        errorType = ERROR_TYPES.SERVER;
        message = customMessage || data?.message || ERROR_MESSAGES[ERROR_TYPES.SERVER];
      }
    } else if (error.request) {
      // Network error
      errorType = ERROR_TYPES.NETWORK;
      message = customMessage || ERROR_MESSAGES[ERROR_TYPES.NETWORK];
    } else if (error.message) {
      // JavaScript error
      message = customMessage || error.message;
    }

    // Log error for debugging
    this.logError(error, errorType, message);

    // Show alert if requested
    if (showAlert) {
      this.showErrorAlert(message, errorType);
    }

    return {
      type: errorType,
      message,
      originalError: error,
    };
  }

  static logError(error, type, message) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      type,
      message,
      stack: error.stack,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
    };

    console.error('Error Log:', JSON.stringify(errorLog, null, 2));

    // In production, you might want to send this to a logging service
    // LoggingService.logError(errorLog);
  }

  static showErrorAlert(message, type, title = 'Error') {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'OK',
          style: 'default',
        },
      ],
      { cancelable: true }
    );
  }

  static showConfirmationAlert(
    title,
    message,
    onConfirm,
    onCancel = null,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) {
    Alert.alert(
      title,
      message,
      [
        {
          text: cancelText,
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: confirmText,
          style: 'destructive',
          onPress: onConfirm,
        },
      ],
      { cancelable: true }
    );
  }

  static showSuccessAlert(message, title = 'Success', onPress = null) {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'OK',
          style: 'default',
          onPress,
        },
      ],
      { cancelable: true }
    );
  }
}

// Async error wrapper
export const withErrorHandling = (asyncFunction, showAlert = true, customMessage = null) => {
  return async (...args) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      const handledError = ErrorHandler.handle(error, showAlert, customMessage);
      throw handledError;
    }
  };
};

// React hook for error handling
export const useErrorHandler = () => {
  const handleError = (error, showAlert = true, customMessage = null) => {
    return ErrorHandler.handle(error, showAlert, customMessage);
  };

  const showError = (message, title = 'Error') => {
    ErrorHandler.showErrorAlert(message, ERROR_TYPES.CLIENT, title);
  };

  const showSuccess = (message, title = 'Success', onPress = null) => {
    ErrorHandler.showSuccessAlert(message, title, onPress);
  };

  const showConfirmation = (
    title,
    message,
    onConfirm,
    onCancel = null,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
  ) => {
    ErrorHandler.showConfirmationAlert(
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText
    );
  };

  return {
    handleError,
    showError,
    showSuccess,
    showConfirmation,
  };
};

// Network status checker
export const NetworkUtils = {
  isNetworkError: (error) => {
    return !!(!error.response && error.request);
  },

  isServerError: (error) => {
    return error.response && error.response.status >= 500;
  },

  isClientError: (error) => {
    return error.response && error.response.status >= 400 && error.response.status < 500;
  },

  getErrorStatusCode: (error) => {
    return error.response?.status || null;
  },

  getErrorMessage: (error) => {
    return error.response?.data?.message || error.message || 'Unknown error';
  },
};

export default ErrorHandler;
