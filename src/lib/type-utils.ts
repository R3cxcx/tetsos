// Utility function to safely access string properties on unknown types
export const safeString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    return String(value);
  }
  return '';
};

// Utility function to safely trim strings
export const safeTrim = (value: unknown): string => {
  const str = safeString(value);
  return str.trim();
};

// Utility function to safely convert to lowercase
export const safeLowerCase = (value: unknown): string => {
  const str = safeString(value);
  return str.toLowerCase();
};

// Type guard for checking if a value has a message property
export const hasMessage = (value: unknown): value is { message: string } => {
  return value && typeof value === 'object' && 'message' in value && typeof (value as any).message === 'string';
};

// Safe error message extraction
export const getErrorMessage = (error: unknown): string => {
  if (hasMessage(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
};