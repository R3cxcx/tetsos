import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface EmployeeUpdateData {
  employee_id: string;
  english_name?: string;
  arabic_name?: string;
  status?: string;
  position?: string;
  personal_email?: string;
  qualifications?: string;
  nationality?: string;
  gender?: string;
  marital_status?: string;
  id_number?: string;
  issuing_body?: string;
  birth_place?: string;
  work_phone?: string;
  home_phone?: string;
  nok_person?: string;
  nok_name?: string;
  nok_phone_number?: string;
  category?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  issue_date?: string;
  birth_date?: string;
}

export interface UploadResult {
  success: boolean;
  created: number;
  updated: number;
  errors: Array<{ row: number; employee_id: string; error: string }>;
}

export interface UploadProgress {
  current: number;
  total: number;
  currentEmployee: string;
  status: 'uploading' | 'completed' | 'error';
}

export const useEmployeeUpdates = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const { toast } = useToast();

  const uploadEmployeeData = async (
    employeeData: EmployeeUpdateData[], 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> => {
    setLoading(true);
    setProgress({ current: 0, total: employeeData.length, currentEmployee: '', status: 'uploading' });
    
    const result: UploadResult = {
      success: true,
      created: 0,
      updated: 0,
      errors: []
    };

    try {
      for (let i = 0; i < employeeData.length; i++) {
        const employee = employeeData[i];
        
        // Update progress
        const currentProgress = {
          current: i + 1,
          total: employeeData.length,
          currentEmployee: employee.employee_id || `Record ${i + 1}`,
          status: 'uploading' as const
        };
        setProgress(currentProgress);
        onProgress?.(currentProgress);
        
        if (!employee.employee_id) {
          result.errors.push({
            row: i + 1,
            employee_id: employee.employee_id || 'N/A',
            error: 'Employee ID is required'
          });
          continue;
        }

        try {
          const { data, error } = await supabase.rpc('upsert_employee_data', {
            p_employee_id: employee.employee_id,
            p_english_name: employee.english_name || null,
            p_arabic_name: employee.arabic_name || null,
            p_status: employee.status || null,
            p_position: employee.position || null,
            p_personal_email: employee.personal_email || null,
            p_qualifications: employee.qualifications || null,
            p_nationality: employee.nationality || null,
            p_gender: employee.gender || null,
            p_marital_status: employee.marital_status || null,
            p_id_number: employee.id_number || null,
            p_issuing_body: employee.issuing_body || null,
            p_birth_place: employee.birth_place || null,
            p_work_phone: employee.work_phone || null,
            p_home_phone: employee.home_phone || null,
            p_nok_person: employee.nok_person || null,
            p_nok_name: employee.nok_name || null,
            p_nok_phone_number: employee.nok_phone_number || null,
            p_category: employee.category || null,
            p_date_of_joining: employee.date_of_joining || null,
            p_date_of_leaving: employee.date_of_leaving || null,
            p_issue_date: employee.issue_date || null,
            p_birth_date: employee.birth_date || null
          });

          if (error) throw error;

          if ((data as any)?.operation === 'created') {
            result.created++;
          } else if ((data as any)?.operation === 'updated') {
            result.updated++;
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
          result.errors.push({
            row: i + 1,
            employee_id: employee.employee_id,
            error: errorMessage
          });
        }
      }

      if (result.errors.length === 0) {
        toast({
          title: 'Upload Successful',
          description: `Created ${result.created} new employees, updated ${result.updated} existing employees.`,
        });
      } else {
        toast({
          title: 'Upload Completed with Errors',
          description: `Created ${result.created}, updated ${result.updated}. ${result.errors.length} errors occurred.`,
          variant: 'destructive',
        });
        result.success = false;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error uploading employee data:', err);
      toast({
        title: 'Upload Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      result.success = false;
    } finally {
      setLoading(false);
      setProgress(null);
    }

    return result;
  };

  const updateSingleEmployee = async (employeeData: EmployeeUpdateData) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('upsert_employee_data', {
        p_employee_id: employeeData.employee_id,
        p_english_name: employeeData.english_name || null,
        p_arabic_name: employeeData.arabic_name || null,
        p_status: employeeData.status || null,
        p_position: employeeData.position || null,
        p_personal_email: employeeData.personal_email || null,
        p_qualifications: employeeData.qualifications || null,
        p_nationality: employeeData.nationality || null,
        p_gender: employeeData.gender || null,
        p_marital_status: employeeData.marital_status || null,
        p_id_number: employeeData.id_number || null,
        p_issuing_body: employeeData.issuing_body || null,
        p_birth_place: employeeData.birth_place || null,
        p_work_phone: employeeData.work_phone || null,
        p_home_phone: employeeData.home_phone || null,
        p_nok_person: employeeData.nok_person || null,
        p_nok_name: employeeData.nok_name || null,
        p_nok_phone_number: employeeData.nok_phone_number || null,
        p_category: employeeData.category || null,
        p_date_of_joining: employeeData.date_of_joining || null,
        p_date_of_leaving: employeeData.date_of_leaving || null,
        p_issue_date: employeeData.issue_date || null,
        p_birth_date: employeeData.birth_date || null
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Employee ${employeeData.employee_id} ${(data as any)?.operation === 'created' ? 'created' : 'updated'} successfully.`,
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating employee:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    progress,
    uploadEmployeeData,
    updateSingleEmployee,
  };
};