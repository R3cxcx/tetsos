// Enhanced error handling utilities for the employee management system
import { toast } from '@/hooks/use-toast';
import type { EmployeeUpdateResult } from '@/types/employee';

export interface ErrorHandler {
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

export const getErrorHandler = (error: any): ErrorHandler => {
  const rawMessage = error?.message || '';
  
  if (rawMessage.toLowerCase().includes('row-level security') || error?.code === '42501') {
    return {
      title: 'Permission Denied',
      description: 'You do not have sufficient permissions to perform this action.',
      variant: 'destructive'
    };
  }
  
  if (rawMessage.toLowerCase().includes('duplicate key')) {
    return {
      title: 'Duplicate Entry',
      description: 'Employee ID already exists. Please use a unique ID.',
      variant: 'destructive'
    };
  }
  
  if (rawMessage.toLowerCase().includes('invalid input syntax for type date')) {
    return {
      title: 'Invalid Date',
      description: 'Please use YYYY-MM-DD format for dates or leave empty.',
      variant: 'destructive'
    };
  }
  
  if (rawMessage.toLowerCase().includes('not found')) {
    return {
      title: 'Not Found',
      description: 'Employee not found. Please refresh the list and try again.',
      variant: 'destructive'
    };
  }
  
  return {
    title: 'Error',
    description: rawMessage || 'An unexpected error occurred',
    variant: 'destructive'
  };
};

export const handleEmployeeUpdateResult = (
  result: EmployeeUpdateResult,
  successMessage = 'Employee updated successfully',
  onSuccess?: () => void
): boolean => {
  if (result.error) {
    const errorHandler = getErrorHandler(result.error);
    toast(errorHandler);
    return false;
  }
  
  toast({
    title: 'Success',
    description: successMessage,
  });
  
  onSuccess?.();
  return true;
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorContext: string = 'operation'
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const errorHandler = getErrorHandler(error);
    toast({
      ...errorHandler,
      title: `${errorHandler.title} (${errorContext})`
    });
    return null;
  }
};