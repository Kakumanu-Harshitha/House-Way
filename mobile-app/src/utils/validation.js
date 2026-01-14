// Validation utility functions
import { useState, useRef } from 'react';

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email),
    message: emailRegex.test(email) ? '' : 'Please enter a valid email address',
  };
};

// Password validation
export const validatePassword = (password, minLength = 8) => {
  const hasMinLength = password.length >= minLength;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumbers;

  let message = '';
  if (!hasMinLength) {
    message = `Password must be at least ${minLength} characters long`;
  } else if (!hasUpperCase) {
    message = 'Password must contain at least one uppercase letter';
  } else if (!hasLowerCase) {
    message = 'Password must contain at least one lowercase letter';
  } else if (!hasNumbers) {
    message = 'Password must contain at least one number';
  }

  return {
    isValid,
    message,
    strength: {
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
    },
  };
};

// Phone number validation
export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  return {
    isValid: phoneRegex.test(cleanPhone) && cleanPhone.length >= 10,
    message: phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 
      ? '' 
      : 'Please enter a valid phone number',
  };
};

// Required field validation
export const validateRequired = (value, fieldName = 'Field') => {
  const isValid = value !== null && value !== undefined && value.toString().trim() !== '';
  return {
    isValid,
    message: isValid ? '' : `${fieldName} is required`,
  };
};

// Minimum length validation
export const validateMinLength = (value, minLength, fieldName = 'Field') => {
  const isValid = value && value.toString().length >= minLength;
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must be at least ${minLength} characters long`,
  };
};

// Maximum length validation
export const validateMaxLength = (value, maxLength, fieldName = 'Field') => {
  const isValid = !value || value.toString().length <= maxLength;
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must not exceed ${maxLength} characters`,
  };
};

// Number validation
export const validateNumber = (value, fieldName = 'Field') => {
  const isValid = !isNaN(value) && !isNaN(parseFloat(value));
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must be a valid number`,
  };
};

// Positive number validation
export const validatePositiveNumber = (value, fieldName = 'Field') => {
  const numberValidation = validateNumber(value, fieldName);
  if (!numberValidation.isValid) {
    return numberValidation;
  }
  
  const isValid = parseFloat(value) > 0;
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must be a positive number`,
  };
};

// Date validation
export const validateDate = (dateString, fieldName = 'Date') => {
  const date = new Date(dateString);
  const isValid = !isNaN(date.getTime());
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must be a valid date`,
  };
};

// Future date validation
export const validateFutureDate = (dateString, fieldName = 'Date') => {
  const dateValidation = validateDate(dateString, fieldName);
  if (!dateValidation.isValid) {
    return dateValidation;
  }
  
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isValid = date >= today;
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must be today or in the future`,
  };
};

// URL validation
export const validateURL = (url, fieldName = 'URL') => {
  try {
    new URL(url);
    return {
      isValid: true,
      message: '',
    };
  } catch {
    return {
      isValid: false,
      message: `${fieldName} must be a valid URL`,
    };
  }
};

// ZIP code validation
export const validateZipCode = (zipCode, fieldName = 'ZIP Code') => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  const isValid = zipRegex.test(zipCode);
  return {
    isValid,
    message: isValid ? '' : `${fieldName} must be a valid ZIP code (e.g., 12345 or 12345-6789)`,
  };
};

// Form validation class
export class FormValidator {
  constructor() {
    this.rules = {};
    this.errors = {};
  }

  // Add validation rule
  addRule(fieldName, validationFunction, message = null) {
    if (!this.rules[fieldName]) {
      this.rules[fieldName] = [];
    }
    this.rules[fieldName].push({ validationFunction, message });
    return this;
  }

  // Add required rule
  required(fieldName, message = null) {
    return this.addRule(
      fieldName,
      (value) => validateRequired(value, fieldName),
      message
    );
  }

  // Add email rule
  email(fieldName, message = null) {
    return this.addRule(
      fieldName,
      (value) => validateEmail(value),
      message
    );
  }

  // Add password rule
  password(fieldName, minLength = 8, message = null) {
    return this.addRule(
      fieldName,
      (value) => validatePassword(value, minLength),
      message
    );
  }

  // Add phone rule
  phone(fieldName, message = null) {
    return this.addRule(
      fieldName,
      (value) => validatePhone(value),
      message
    );
  }

  // Add min length rule
  minLength(fieldName, minLength, message = null) {
    return this.addRule(
      fieldName,
      (value) => validateMinLength(value, minLength, fieldName),
      message
    );
  }

  // Add max length rule
  maxLength(fieldName, maxLength, message = null) {
    return this.addRule(
      fieldName,
      (value) => validateMaxLength(value, maxLength, fieldName),
      message
    );
  }

  // Add number rule
  number(fieldName, message = null) {
    return this.addRule(
      fieldName,
      (value) => validateNumber(value, fieldName),
      message
    );
  }

  // Add positive number rule
  positiveNumber(fieldName, message = null) {
    return this.addRule(
      fieldName,
      (value) => validatePositiveNumber(value, fieldName),
      message
    );
  }

  // Validate form data
  validate(data) {
    this.errors = {};
    let isValid = true;

    Object.keys(this.rules).forEach(fieldName => {
      const fieldRules = this.rules[fieldName];
      const fieldValue = data[fieldName];

      for (const rule of fieldRules) {
        const result = rule.validationFunction(fieldValue);
        if (!result.isValid) {
          this.errors[fieldName] = rule.message || result.message;
          isValid = false;
          break; // Stop at first error for this field
        }
      }
    });

    return {
      isValid,
      errors: this.errors,
    };
  }

  // Get error for specific field
  getError(fieldName) {
    return this.errors[fieldName] || '';
  }

  // Check if field has error
  hasError(fieldName) {
    return !!this.errors[fieldName];
  }

  // Get all errors
  getAllErrors() {
    return this.errors;
  }

  // Clear errors
  clearErrors() {
    this.errors = {};
  }

  // Clear error for specific field
  clearError(fieldName) {
    delete this.errors[fieldName];
  }
}

// React hook for form validation
export const useFormValidation = (initialData = {}) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  const validator = useRef(new FormValidator()).current;

  const updateField = (fieldName, value) => {
    setData(prev => ({
      ...prev,
      [fieldName]: value,
    }));

    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    setIsValidating(true);
    const result = validator.validate(data);
    setErrors(result.errors);
    setIsValidating(false);
    return result.isValid;
  };

  const clearErrors = () => {
    setErrors({});
    validator.clearErrors();
  };

  const clearError = (fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
    validator.clearError(fieldName);
  };

  return {
    data,
    errors,
    isValidating,
    updateField,
    validateForm,
    clearErrors,
    clearError,
    validator,
    setData,
  };
};

export default FormValidator;
