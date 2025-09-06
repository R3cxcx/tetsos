import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

// Safe employee data for self-service (no sensitive PII)
export interface SafeEmployeeData {
  id: string;
  employee_id: string;
  english_name: string;
  arabic_name?: string;
  position_title?: string;
  category?: string;
  status: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  nationality?: string;
  work_phone?: string;
  qualifications?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const useEmployeeSelfData = () => {
  const [employeeData, setEmployeeData] = useState<SafeEmployeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, hasRole } = useAuth();

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!hasRole('employee')) {
        throw new Error('Access denied. Employee role required.');
      }

      // Use the secure function to get employee data without sensitive PII
      const { data: employeeData, error } = await supabase
        .rpc('get_employee_safe_data');

      if (error) {
        throw error;
      }

      // Since the function returns an array, get the first (and only) result
      setEmployeeData(employeeData?.[0] || null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching employee data:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load your profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && hasRole('employee')) {
      fetchEmployeeData();
    }
  }, [user, hasRole]);

  return {
    employeeData,
    loading,
    error,
    refetch: fetchEmployeeData,
  };
};