// Enhanced employee validation utilities and business logic
import type { CreateEmployeeData, ValidationError } from '@/types/employee';
import { 
  validateTextInput, 
  validateEmail, 
  validatePhone, 
  validateEmployeeId, 
  validateDate,
  sanitizeEmployeeData 
} from './input-sanitization';

// Re-export ValidationError from types
export type { ValidationError } from '@/types/employee';

export const validateEmployeeData = (data: Partial<CreateEmployeeData>, isEdit: boolean = false): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Sanitize all input data first
  const sanitizedData = sanitizeEmployeeData(data);

  // Employee ID validation - skip for edit mode as it's read-only
  if (!isEdit) {
    if (!String(sanitizedData.employee_id || '').trim()) {
      errors.push({ field: 'employee_id', message: 'Employee ID is required' });
    } else {
      const empIdValidation = validateEmployeeId(String(sanitizedData.employee_id));
      if (!empIdValidation.isValid) {
        errors.push({ field: 'employee_id', message: empIdValidation.error || 'Invalid Employee ID' });
      }
    }
  }

  // English name validation - more lenient for edits
  if (!isEdit && !String(sanitizedData.english_name || '').trim()) {
    errors.push({ field: 'english_name', message: 'English name is required' });
  } else if (sanitizedData.english_name && String(sanitizedData.english_name).trim()) {
    const nameValidation = validateTextInput(String(sanitizedData.english_name));
    if (!nameValidation.isValid) {
      errors.push({ field: 'english_name', message: nameValidation.error || 'Invalid English name' });
    }
  }

  // Personal email validation - only if provided and not empty
  if (sanitizedData.personal_email && String(sanitizedData.personal_email).trim()) {
    const emailValidation = validateEmail(String(sanitizedData.personal_email));
    if (!emailValidation.isValid) {
      errors.push({ field: 'personal_email', message: emailValidation.error || 'Invalid email format' });
    }
  }

  return errors;
};

// Simplified validation functions for bulk uploads
export const validateBulkEmployeeData = (rows: any[]): Array<{ row: number; errors: string[] }> => {
  const results: Array<{ row: number; errors: string[] }> = [];

  rows.forEach((row, index) => {
    const rowIndex = index + 1;
    const errors: string[] = [];

    // Required field validations with safe string handling
    const englishName = String(row.english_name || '').trim();
    if (!englishName) {
      errors.push(`Row ${rowIndex}: English name is required`);
    }

    const employeeId = String(row.employee_id || '').trim();
    if (!employeeId) {
      errors.push(`Row ${rowIndex}: Employee ID is required`);
    }

    if (errors.length > 0) {
      results.push({ row: rowIndex, errors });
    }
  });

  return results;
};

// Helper function to check for duplicate employee IDs
export const findDuplicateEmployeeIds = (employees: any[]): string[] => {
  const ids = employees.map(emp => String(emp.employee_id || '').trim()).filter(Boolean);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  return [...new Set(duplicates)];
};

// Helper function for field labels
export const getFieldLabel = (field: string): string => {
  const labels: Record<string, string> = {
    employee_id: 'Employee ID',
    english_name: 'English Name',
    arabic_name: 'Arabic Name',
    personal_email: 'Personal Email',
    // Add more labels as needed
  };
  return labels[field] || field.replace('_', ' ').toUpperCase();
};

// Export other utility functions
export * from './input-sanitization';
