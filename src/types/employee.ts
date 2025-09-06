// Enhanced employee type definitions with comprehensive database mapping
// Phase 1: Fix critical data mapping issues

export interface EmployeeBasic {
  id: string;
  employee_id: string;
  category?: string;
  status: string;
  english_name: string;
  arabic_name?: string;
  position?: string; // Fixed: matches database column name
  date_of_joining?: string;
  date_of_leaving?: string;
  nationality?: string;
  work_phone?: string;
  qualifications?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  is_deletable: boolean;
  total_count?: number; // For pagination
}

export interface EmployeeWithSensitiveData extends EmployeeBasic {
  gender?: 'male' | 'female';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  id_number?: string;
  issuing_body?: string;
  issue_date?: string;
  home_phone?: string;
  nok_person?: string;
  nok_name?: string;
  nok_phone_number?: string;
  personal_email?: string;
  birth_date?: string;
  birth_place?: string;
  created_by?: string;
  deleted_at?: string;
}

export interface CreateEmployeeData {
  employee_id: string;
  category?: string;
  status?: 'active' | 'inactive' | 'pending';
  english_name: string;
  arabic_name?: string;
  position?: string; // Fixed: matches database column name
  date_of_joining?: string;
  date_of_leaving?: string;
  nationality?: string;
  gender?: 'male' | 'female';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  id_number?: string;
  issuing_body?: string;
  issue_date?: string;
  work_phone?: string;
  home_phone?: string;
  nok_person?: string;
  nok_name?: string;
  nok_phone_number?: string;
  personal_email?: string;
  birth_date?: string;
  birth_place?: string;
  qualifications?: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  search?: string;
  statusFilter?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T = EmployeeBasic> {
  employees: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface EmployeeFormData extends CreateEmployeeData {
  // Additional form-specific fields if needed
}

export interface EmployeeUpdateResult {
  data: any;
  error: any;
}

export interface EmployeeSearchFilters {
  search?: string;
  status?: string;
  category?: string;
  department?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
}

// Enhanced validation error interface
export interface ValidationError {
  field: keyof CreateEmployeeData;
  message: string;
  severity?: 'error' | 'warning';
}

// Real-time update payload types
export interface EmployeeRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: EmployeeWithSensitiveData;
  old?: EmployeeWithSensitiveData;
}