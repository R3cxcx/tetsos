/**
 * Input sanitization and validation utilities for XSS protection
 */

// HTML entities to escape
const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escapes HTML characters to prevent XSS attacks
 */
export const escapeHtml = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"'`=\/]/g, (s) => htmlEscapeMap[s] || s);
};

/**
 * Removes potentially dangerous characters and scripts
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove other dangerous HTML tags
    .replace(/<(iframe|object|embed|link|meta|style|form)[^>]*>/gi, '')
    // Remove javascript: and data: URLs
    .replace(/javascript:|data:|vbscript:/gi, '')
    // Remove on* event handlers
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    // Trim whitespace
    .trim();
};

/**
 * Validates and sanitizes text input with length limits
 */
export const validateTextInput = (
  input: string, 
  options: {
    maxLength?: number;
    minLength?: number;
    allowEmpty?: boolean;
    pattern?: RegExp;
    fieldName?: string;
  } = {}
): { isValid: boolean; sanitized: string; error?: string } => {
  const { maxLength = 255, minLength = 0, allowEmpty = true, pattern, fieldName = 'Field' } = options;
  
  if (!input || input.trim() === '') {
    if (!allowEmpty) {
      return { isValid: false, sanitized: '', error: `${fieldName} is required` };
    }
    return { isValid: true, sanitized: '' };
  }
  
  const sanitized = sanitizeInput(input);
  
  if (sanitized.length < minLength) {
    return { 
      isValid: false, 
      sanitized, 
      error: `${fieldName} must be at least ${minLength} characters long` 
    };
  }
  
  if (sanitized.length > maxLength) {
    return { 
      isValid: false, 
      sanitized, 
      error: `${fieldName} must not exceed ${maxLength} characters` 
    };
  }
  
  if (pattern && !pattern.test(sanitized)) {
    return { 
      isValid: false, 
      sanitized, 
      error: `${fieldName} format is invalid` 
    };
  }
  
  return { isValid: true, sanitized };
};

/**
 * Validates email addresses with XSS protection
 */
export const validateEmail = (email: string): { isValid: boolean; sanitized: string; error?: string } => {
  const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return validateTextInput(email, {
    maxLength: 254,
    minLength: 5,
    allowEmpty: true,
    pattern: emailPattern,
    fieldName: 'Email'
  });
};

/**
 * Validates phone numbers with international format support
 */
export const validatePhone = (phone: string): { isValid: boolean; sanitized: string; error?: string } => {
  const phonePattern = /^[+]?[1-9][\d\s\-()]{6,20}$/;
  
  return validateTextInput(phone, {
    maxLength: 25,
    minLength: 7,
    allowEmpty: true,
    pattern: phonePattern,
    fieldName: 'Phone number'
  });
};

/**
 * Validates employee ID with alphanumeric characters, hyphens, and underscores only
 */
export const validateEmployeeId = (employeeId: string): { isValid: boolean; sanitized: string; error?: string } => {
  const employeeIdPattern = /^[A-Za-z0-9\-_]+$/;
  
  return validateTextInput(employeeId, {
    maxLength: 50,
    minLength: 1,
    allowEmpty: false,
    pattern: employeeIdPattern,
    fieldName: 'Employee ID'
  });
};

/**
 * Validates and sanitizes file content for Excel/CSV uploads
 */
export const sanitizeFileContent = (content: unknown): unknown => {
  if (typeof content === 'string') {
    return sanitizeInput(content);
  }
  
  if (Array.isArray(content)) {
    return content.map(sanitizeFileContent);
  }
  
  if (content && typeof content === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(content)) {
      sanitized[sanitizeInput(key)] = sanitizeFileContent(value);
    }
    return sanitized;
  }
  
  return content;
};

/**
 * Validates date strings in YYYY-MM-DD format
 */
export const validateDate = (dateStr: string): { isValid: boolean; sanitized: string; error?: string } => {
  if (!dateStr || dateStr.trim() === '') {
    return { isValid: true, sanitized: '' };
  }
  
  const sanitized = sanitizeInput(dateStr.trim());
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  
  if (!datePattern.test(sanitized)) {
    return {
      isValid: false,
      sanitized,
      error: 'Date must be in YYYY-MM-DD format'
    };
  }
  
  const date = new Date(sanitized);
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      sanitized,
      error: 'Invalid date'
    };
  }
  
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    return {
      isValid: false,
      sanitized,
      error: 'Date must be between 1900 and 2100'
    };
  }
  
  return { isValid: true, sanitized };
};

/**
 * Comprehensive form data sanitization for employee data
 */
export const sanitizeEmployeeData = (data: Record<string, unknown>): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};
