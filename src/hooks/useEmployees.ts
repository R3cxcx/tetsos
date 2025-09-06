import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import type {
  EmployeeBasic,
  EmployeeWithSensitiveData,
  CreateEmployeeData,
  PaginationParams,
  PaginatedResult,
  EmployeeUpdateResult,
  EmployeeRealtimePayload
} from '@/types/employee';

// Re-export types for backward compatibility
export type Employee = EmployeeBasic;
export type {
  CreateEmployeeData,
  PaginationParams,
  PaginatedResult,
  EmployeeWithSensitiveData
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [paginatedResult, setPaginatedResult] = useState<PaginatedResult>({
    employees: [],
    totalCount: 0,
    totalPages: 0,
    currentPage: 1
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use secure RPC function for basic employee data (excludes sensitive PII)
      // This returns only non-sensitive fields in compliance with security requirements
      const { data, error } = await supabase
        .rpc('get_employees_basic_data');

      if (error) {
        throw error;
      }

      setEmployees(data || []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching employees:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesPaginated = async (params: PaginationParams): Promise<PaginatedResult> => {
    try {
      setLoading(true);
      setError(null);

      const offset = (params.page - 1) * params.pageSize;
      
      const { data, error } = await supabase
        .rpc('get_employees_paginated', {
          p_limit: params.pageSize,
          p_offset: offset,
          p_search: params.search || '',
          p_status_filter: params.statusFilter || 'all',
          p_sort_field: params.sortField || 'english_name',
          p_sort_direction: params.sortDirection || 'asc'
        });

      if (error) {
        throw error;
      }

      const employees = data || [];
      const totalCount = employees.length > 0 ? employees[0].total_count || 0 : 0;
      const totalPages = Math.ceil(totalCount / params.pageSize);

      const result: PaginatedResult = {
        employees,
        totalCount,
        totalPages,
        currentPage: params.page
      };

      setPaginatedResult(result);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching paginated employees:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
      
      const emptyResult: PaginatedResult = {
        employees: [],
        totalCount: 0,
        totalPages: 0,
        currentPage: params.page
      };
      setPaginatedResult(emptyResult);
      return emptyResult;
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async (employeeData: CreateEmployeeData) => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert([{
          ...employeeData,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Employee created successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating employee:', err);
      toast({
        title: "Error",
        description: errorMessage || "Failed to create employee",
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const updateEmployee = useCallback(async (id: string, updates: Partial<CreateEmployeeData>): Promise<EmployeeUpdateResult> => {
    try {
      // Normalize payload: remove undefined fields and convert empty date strings to null
      const cleanedEntries = Object.entries(updates).filter(([, v]) => v !== undefined);
      const normalized = Object.fromEntries(cleanedEntries) as Partial<CreateEmployeeData & Record<string, unknown>>;

      // Ensure date columns are either valid ISO strings or null
      (['date_of_joining', 'date_of_leaving', 'issue_date', 'birth_date'] as const).forEach((key) => {
        const val = normalized[key] as unknown as string | undefined;
        if (val === '') {
          (normalized as any)[key] = null;
        }
      });

      console.log('Updating employee with ID:', id, 'Data:', normalized);

      // Store original employee for rollback
      const originalEmployee = employees.find(emp => emp.id === id);
      
      // Optimistically update the UI first
      setEmployees(prev => 
        prev.map(emp => 
          emp.id === id ? { ...emp, ...normalized } : emp
        )
      );

      setPaginatedResult(prev => ({
        ...prev,
        employees: prev.employees.map(emp => 
          emp.id === id ? { ...emp, ...normalized } : emp
        )
      }));

      // Try the secure RPC function first 
      const { data, error } = await supabase.rpc('update_employee_secure', {
        p_employee_id: id,
        p_updates: normalized as any
      });

      if (error) {
        console.error('RPC update error:', error);
        
        // Rollback optimistic updates
        if (originalEmployee) {
          setEmployees(prev => 
            prev.map(emp => 
              emp.id === id ? originalEmployee : emp
            )
          );
          setPaginatedResult(prev => ({
            ...prev,
            employees: prev.employees.map(emp => 
              emp.id === id ? originalEmployee : emp
            )
          }));
        }
        
        // Enhanced error handling
        if (error.message?.toLowerCase().includes('permission denied') || 
            error.message?.toLowerCase().includes('row-level security') ||
            error.code === '42501') {
          return { 
            data: null, 
            error: { 
              ...error, 
              message: 'You do not have permission to update employee records. Please contact your administrator.',
              code: 'PERMISSION_DENIED'
            }
          };
        }
        
        return { data: null, error };
      }

      return { data: { id, ...normalized }, error: null };
    } catch (err: any) {
      console.error('Error updating employee:', err);
      
      // Rollback any optimistic updates
      const originalEmployee = employees.find(emp => emp.id === id);
      if (originalEmployee) {
        setEmployees(prev => 
          prev.map(emp => 
            emp.id === id ? originalEmployee : emp
          )
        );
        setPaginatedResult(prev => ({
          ...prev,
          employees: prev.employees.map(emp => 
            emp.id === id ? originalEmployee : emp
          )
        }));
      }
      
      const rawMessage = err?.message || '';
      let userMessage = 'Failed to update employee';

      if (rawMessage.toLowerCase().includes('row-level security') || err?.code === '42501') {
        userMessage = 'Permission denied: you need employees.update permission.';
      } else if (rawMessage.toLowerCase().includes('duplicate key')) {
        userMessage = 'Employee ID already exists. Please use a unique ID.';
      } else if (rawMessage.toLowerCase().includes('invalid input syntax for type date')) {
        userMessage = 'Invalid date format. Use YYYY-MM-DD or leave empty.';
      } else if (rawMessage.toLowerCase().includes('not found')) {
        userMessage = 'Employee not found. Refresh the list and try again.';
      }

      return { data: null, error: { message: userMessage } };
    }
  }, [employees]);

  // Enhanced function to fetch employee with sensitive data for authorized users
  const fetchEmployeeWithSensitiveData = useCallback(async (id: string): Promise<EmployeeWithSensitiveData | null> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching sensitive employee data:', error);
        return null;
      }

      return data as EmployeeWithSensitiveData;
    } catch (err) {
      console.error('Error fetching sensitive employee data:', err);
      return null;
    }
  }, []);

  const deleteEmployee = async (id: string) => {
    try {
      const { data, error } = await supabase
        .rpc('safe_delete_employee', { p_employee_id: id });

      if (error) {
        throw error;
      }

      if (data && typeof data === 'object' && 'success' in data) {
        const result = data as { success: boolean; message: string };
        if (result.success) {
          toast({
            title: "Success",
            description: result.message || "Employee deleted successfully",
          });
          await fetchEmployees(); // Refresh the list
          return { error: null };
        } else {
          toast({
            title: "Cannot Delete Employee",
            description: result.message || "Employee cannot be deleted due to existing references",
            variant: "destructive",
          });
          return { error: new Error(result.message || "Delete operation failed") };
        }
      }

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error deleting employee:', err);
      toast({
        title: "Error",
        description: errorMessage || "Failed to delete employee",
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const bulkCreateEmployees = async (employeesData: CreateEmployeeData[]) => {
    try {
      const employeesToInsert = employeesData.map(emp => ({
        ...emp,
        created_by: user?.id
      }));

      const { data, error } = await supabase
        .from('employees')
        .insert(employeesToInsert)
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `${data?.length || 0} employees created successfully`,
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error bulk creating employees:', err);
      toast({
        title: "Error",
        description: errorMessage || "Failed to create employees",
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  // Enhanced real-time subscription with better state management
  useEffect(() => {
    fetchEmployees();

    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees'
        },
        (payload) => {
          console.log('Employee data changed:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newEmployee = payload.new as Employee;
            setEmployees(prev => [newEmployee, ...prev]);
            setEmployees(prev => [newEmployee, ...prev]);
            
            // Update paginated result if we're on the first page
            setPaginatedResult(prev => {
              if (prev.currentPage === 1) {
                const updatedEmployees = [newEmployee, ...prev.employees];
                return {
                  ...prev,
                  employees: updatedEmployees.slice(0, prev.employees.length), // Maintain page size
                  totalCount: prev.totalCount + 1
                };
              }
              return { ...prev, totalCount: prev.totalCount + 1 };
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedEmployee = payload.new as Employee;
            
            setEmployees(prev => 
              prev.map(emp => 
                emp.id === updatedEmployee.id ? updatedEmployee : emp
              )
            );

            setPaginatedResult(prev => ({
              ...prev,
              employees: prev.employees.map(emp => 
                emp.id === updatedEmployee.id ? updatedEmployee : emp
              )
            }));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedEmployeeId = payload.old.id;
            
            setEmployees(prev => 
              prev.filter(emp => emp.id !== deletedEmployeeId)
            );

            setPaginatedResult(prev => ({
              ...prev,
              employees: prev.employees.filter(emp => emp.id !== deletedEmployeeId),
              totalCount: Math.max(0, prev.totalCount - 1)
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Bulk create employees in staging table (all text fields)
  const bulkCreateEmployeesStaging = async (employeesData: Record<string, string | null | undefined>[]) => {
    try {
      const employeesToInsert = employeesData.map(emp => ({
        ...emp,
        created_by: user?.id?.toString() || null
      }));

      const { data, error } = await supabase
        .from('employees_staging')
        .insert(employeesToInsert)
        .select();

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Successfully uploaded ${data.length} employees to staging`,
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error bulk creating staging employees:', err);
      toast({
        title: "Error", 
        description: errorMessage || "Failed to upload employees to staging",
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  return {
    employees,
    paginatedResult,
    loading,
    error,
    fetchEmployees,
    fetchEmployeesPaginated,
    fetchEmployeeWithSensitiveData,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    bulkCreateEmployees,
    bulkCreateEmployeesStaging,
  };
};