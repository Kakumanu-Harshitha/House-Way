import { Alert } from 'react-native';
import {
  ErrorHandler,
  AppError,
  ERROR_TYPES,
  ERROR_MESSAGES,
  withErrorHandling,
  NetworkUtils,
} from '../../src/utils/errorHandler';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', ERROR_TYPES.VALIDATION, 422, { field: 'email' });
      
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ERROR_TYPES.VALIDATION);
      expect(error.statusCode).toBe(422);
      expect(error.details).toEqual({ field: 'email' });
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('AppError');
    });
  });

  describe('ErrorHandler.handle', () => {
    it('should handle AppError correctly', () => {
      const appError = new AppError('Custom error', ERROR_TYPES.VALIDATION);
      const result = ErrorHandler.handle(appError, false);

      expect(result.type).toBe(ERROR_TYPES.VALIDATION);
      expect(result.message).toBe('Custom error');
      expect(result.originalError).toBe(appError);
    });

    it('should handle HTTP 401 error', () => {
      const httpError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };

      const result = ErrorHandler.handle(httpError, false);

      expect(result.type).toBe(ERROR_TYPES.AUTHENTICATION);
      expect(result.message).toBe('Unauthorized');
    });

    it('should handle HTTP 403 error', () => {
      const httpError = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };

      const result = ErrorHandler.handle(httpError, false);

      expect(result.type).toBe(ERROR_TYPES.AUTHORIZATION);
      expect(result.message).toBe('Forbidden');
    });

    it('should handle HTTP 422 validation error', () => {
      const httpError = {
        response: {
          status: 422,
          data: { message: 'Validation failed' },
        },
      };

      const result = ErrorHandler.handle(httpError, false);

      expect(result.type).toBe(ERROR_TYPES.VALIDATION);
      expect(result.message).toBe('Validation failed');
    });

    it('should handle HTTP 500 server error', () => {
      const httpError = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };

      const result = ErrorHandler.handle(httpError, false);

      expect(result.type).toBe(ERROR_TYPES.SERVER);
      expect(result.message).toBe('Internal server error');
    });

    it('should handle network error', () => {
      const networkError = {
        request: {},
        message: 'Network Error',
      };

      const result = ErrorHandler.handle(networkError, false);

      expect(result.type).toBe(ERROR_TYPES.NETWORK);
      expect(result.message).toBe(ERROR_MESSAGES[ERROR_TYPES.NETWORK]);
    });

    it('should handle generic JavaScript error', () => {
      const jsError = new Error('Generic error');
      const result = ErrorHandler.handle(jsError, false);

      expect(result.type).toBe(ERROR_TYPES.UNKNOWN);
      expect(result.message).toBe('Generic error');
    });

    it('should show alert when requested', () => {
      const error = new Error('Test error');
      ErrorHandler.handle(error, true);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'Test error',
        [{ text: 'OK', style: 'default' }],
        { cancelable: true }
      );
    });

    it('should use custom message when provided', () => {
      const error = new Error('Original error');
      const result = ErrorHandler.handle(error, false, 'Custom message');

      expect(result.message).toBe('Custom message');
    });
  });

  describe('ErrorHandler.showSuccessAlert', () => {
    it('should show success alert', () => {
      const onPress = jest.fn();
      ErrorHandler.showSuccessAlert('Success message', 'Success', onPress);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Success message',
        [{ text: 'OK', style: 'default', onPress }],
        { cancelable: true }
      );
    });
  });

  describe('ErrorHandler.showConfirmationAlert', () => {
    it('should show confirmation alert', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      
      ErrorHandler.showConfirmationAlert(
        'Confirm Action',
        'Are you sure?',
        onConfirm,
        onCancel,
        'Yes',
        'No'
      );

      expect(Alert.alert).toHaveBeenCalledWith(
        'Confirm Action',
        'Are you sure?',
        [
          { text: 'No', style: 'cancel', onPress: onCancel },
          { text: 'Yes', style: 'destructive', onPress: onConfirm },
        ],
        { cancelable: true }
      );
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap async function and handle errors', async () => {
      const mockFunction = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFunction = withErrorHandling(mockFunction, false);

      try {
        await wrappedFunction('arg1', 'arg2');
      } catch (error) {
        expect(error.type).toBe(ERROR_TYPES.UNKNOWN);
        expect(error.message).toBe('Test error');
      }

      expect(mockFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return result when no error occurs', async () => {
      const mockFunction = jest.fn().mockResolvedValue('success');
      const wrappedFunction = withErrorHandling(mockFunction, false);

      const result = await wrappedFunction();
      expect(result).toBe('success');
    });
  });

  describe('NetworkUtils', () => {
    it('should identify network errors', () => {
      const networkError = { request: {}, message: 'Network Error' };
      expect(NetworkUtils.isNetworkError(networkError)).toBe(true);

      const httpError = { response: { status: 500 } };
      expect(NetworkUtils.isNetworkError(httpError)).toBe(false);
    });

    it('should identify server errors', () => {
      const serverError = { response: { status: 500 } };
      expect(NetworkUtils.isServerError(serverError)).toBe(true);

      const clientError = { response: { status: 400 } };
      expect(NetworkUtils.isServerError(clientError)).toBe(false);
    });

    it('should identify client errors', () => {
      const clientError = { response: { status: 400 } };
      expect(NetworkUtils.isClientError(clientError)).toBe(true);

      const serverError = { response: { status: 500 } };
      expect(NetworkUtils.isClientError(serverError)).toBe(false);
    });

    it('should get error status code', () => {
      const httpError = { response: { status: 404 } };
      expect(NetworkUtils.getErrorStatusCode(httpError)).toBe(404);

      const networkError = { request: {} };
      expect(NetworkUtils.getErrorStatusCode(networkError)).toBeNull();
    });

    it('should get error message', () => {
      const httpError = { response: { data: { message: 'Not found' } } };
      expect(NetworkUtils.getErrorMessage(httpError)).toBe('Not found');

      const jsError = { message: 'JavaScript error' };
      expect(NetworkUtils.getErrorMessage(jsError)).toBe('JavaScript error');

      const unknownError = {};
      expect(NetworkUtils.getErrorMessage(unknownError)).toBe('Unknown error');
    });
  });
});
