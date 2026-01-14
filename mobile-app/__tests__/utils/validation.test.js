import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validateNumber,
  validatePositiveNumber,
  FormValidator,
} from '../../src/utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(true);
        expect(result.message).toBe('');
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        '',
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Please enter a valid email address');
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123',
        'MySecure1Pass',
        'Test1234',
      ];

      strongPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.message).toBe('');
        expect(result.strength.hasMinLength).toBe(true);
        expect(result.strength.hasUpperCase).toBe(true);
        expect(result.strength.hasLowerCase).toBe(true);
        expect(result.strength.hasNumbers).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short',
        'nouppercase123',
        'NOLOWERCASE123',
        'NoNumbers',
      ];

      weakPasswords.forEach(password => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.message).toBeTruthy();
      });
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+1 (234) 567-8900',
        '234-567-8900',
      ];

      validPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(true);
        expect(result.message).toBe('');
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '123',
        'abc123',
        '',
        '123-abc-4567',
      ];

      invalidPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Please enter a valid phone number');
      });
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      const validValues = ['test', 123, 'a', '0'];

      validValues.forEach(value => {
        const result = validateRequired(value);
        expect(result.isValid).toBe(true);
        expect(result.message).toBe('');
      });
    });

    it('should reject empty values', () => {
      const invalidValues = ['', '   ', null, undefined];

      invalidValues.forEach(value => {
        const result = validateRequired(value, 'Test Field');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Test Field is required');
      });
    });
  });

  describe('validateNumber', () => {
    it('should validate numeric values', () => {
      const validNumbers = ['123', '123.45', '0', '-123'];

      validNumbers.forEach(number => {
        const result = validateNumber(number);
        expect(result.isValid).toBe(true);
        expect(result.message).toBe('');
      });
    });

    it('should reject non-numeric values', () => {
      const invalidNumbers = ['abc', '12abc', '', 'NaN'];

      invalidNumbers.forEach(number => {
        const result = validateNumber(number, 'Test Number');
        expect(result.isValid).toBe(false);
        expect(result.message).toBe('Test Number must be a valid number');
      });
    });
  });

  describe('FormValidator', () => {
    let validator;

    beforeEach(() => {
      validator = new FormValidator();
    });

    it('should validate form with all valid data', () => {
      validator
        .required('name')
        .email('email')
        .minLength('description', 10);

      const formData = {
        name: 'John Doe',
        email: 'john@example.com',
        description: 'This is a long description',
      };

      const result = validator.validate(formData);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return errors for invalid data', () => {
      validator
        .required('name')
        .email('email')
        .minLength('description', 10);

      const formData = {
        name: '',
        email: 'invalid-email',
        description: 'short',
      };

      const result = validator.validate(formData);
      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBeTruthy();
      expect(result.errors.email).toBeTruthy();
      expect(result.errors.description).toBeTruthy();
    });

    it('should clear errors', () => {
      validator.required('name');
      validator.validate({ name: '' });
      
      expect(validator.hasError('name')).toBe(true);
      
      validator.clearErrors();
      expect(validator.hasError('name')).toBe(false);
    });
  });
});
