// Form validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

export const validateRequired = (value) => {
  return value && value.toString().trim().length > 0;
};

export const validateMinLength = (value, minLength) => {
  return value && value.toString().length >= minLength;
};

export const validateMaxLength = (value, maxLength) => {
  return !value || value.toString().length <= maxLength;
};

export const validateDate = (date) => {
  const dateObj = new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj);
};

export const validateCurrency = (amount) => {
  const currencyRegex = /^\d+(\.\d{1,2})?$/;
  return currencyRegex.test(amount);
};

export const validateSSN = (ssn) => {
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  return ssnRegex.test(ssn);
};

export const validateZipCode = (zipCode) => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zipCode);
};

// Form validation schemas
export const clientValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'First name is required and must be 2-50 characters'
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Last name is required and must be 2-50 characters'
  },
  email: {
    required: false,
    validate: validateEmail,
    message: 'Please enter a valid email address'
  },
  phone: {
    required: false,
    validate: validatePhone,
    message: 'Please enter a valid phone number'
  },
  zipCode: {
    required: false,
    validate: validateZipCode,
    message: 'Please enter a valid zip code'
  },
  ssn: {
    required: false,
    validate: validateSSN,
    message: 'Please enter a valid SSN (XXX-XX-XXXX)'
  }
};

export const caseValidationSchema = {
  title: {
    required: true,
    minLength: 5,
    maxLength: 200,
    message: 'Case title is required and must be 5-200 characters'
  },
  description: {
    required: false,
    maxLength: 1000,
    message: 'Description must not exceed 1000 characters'
  },
  type: {
    required: true,
    message: 'Case type is required'
  },
  clientId: {
    required: true,
    message: 'Client is required'
  },
  settlementAmount: {
    required: false,
    validate: validateCurrency,
    message: 'Please enter a valid amount'
  },
  attorneyFees: {
    required: false,
    validate: validateCurrency,
    message: 'Please enter a valid amount'
  },
  costs: {
    required: false,
    validate: validateCurrency,
    message: 'Please enter a valid amount'
  }
};

export const taskValidationSchema = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 200,
    message: 'Task title is required and must be 3-200 characters'
  },
  description: {
    required: false,
    maxLength: 1000,
    message: 'Description must not exceed 1000 characters'
  },
  assignedToId: {
    required: true,
    message: 'Task must be assigned to someone'
  },
  priority: {
    required: true,
    message: 'Priority is required'
  },
  dueDate: {
    required: false,
    validate: validateDate,
    message: 'Please enter a valid date'
  }
};

export const userValidationSchema = {
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'First name is required and must be 2-50 characters'
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Last name is required and must be 2-50 characters'
  },
  email: {
    required: true,
    validate: validateEmail,
    message: 'Please enter a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    message: 'Password must be at least 8 characters long'
  },
  role: {
    required: true,
    message: 'Role is required'
  },
  phone: {
    required: false,
    validate: validatePhone,
    message: 'Please enter a valid phone number'
  }
};

// Generic validation function
export const validateForm = (data, schema) => {
  const errors = {};
  
  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const value = data[field];
    
    // Check required fields
    if (rules.required && !validateRequired(value)) {
      errors[field] = rules.message || `${field} is required`;
      return;
    }
    
    // Skip validation if field is empty and not required
    if (!value && !rules.required) {
      return;
    }
    
    // Check minimum length
    if (rules.minLength && !validateMinLength(value, rules.minLength)) {
      errors[field] = rules.message || `${field} must be at least ${rules.minLength} characters`;
      return;
    }
    
    // Check maximum length
    if (rules.maxLength && !validateMaxLength(value, rules.maxLength)) {
      errors[field] = rules.message || `${field} must not exceed ${rules.maxLength} characters`;
      return;
    }
    
    // Custom validation function
    if (rules.validate && !rules.validate(value)) {
      errors[field] = rules.message || `${field} is invalid`;
      return;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};