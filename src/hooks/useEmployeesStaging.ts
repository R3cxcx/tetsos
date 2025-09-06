import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface EmployeeStaging {
  id: string;
  employee_id: string;
  english_name: string;
  arabic_name: string | null;
  status: string;
  position: string | null;
  personal_email: string | null;
  qualifications: string | null;
  nationality: string | null;
  gender: string | null;
  marital_status: string | null;
  id_number: string | null;
  issuing_body: string | null;
  birth_place: string | null;
  work_phone: string | null;
  home_phone: string | null;
  nok_person: string | null;
  nok_name: string | null;
  nok_phone_number: string | null;
  category: string | null;
  date_of_joining: string | null;
  date_of_leaving: string | null;
  issue_date: string | null;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export const useEmployeesStaging = () => {
  const [employees, setEmployees] = useState<EmployeeStaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees using pagination to handle large datasets
      let allEmployees: EmployeeStaging[] = [];
      let fromIndex = 0;
      const pageSize = 1000;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore) {
        pageCount++;
        
        const { data, error } = await supabase
          .from('employees_staging')
          .select('*')
          .order('created_at', { ascending: false })
          .range(fromIndex, fromIndex + pageSize - 1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          allEmployees = [...allEmployees, ...data];
          fromIndex += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      setEmployees(allEmployees);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching staging employees:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to fetch staging employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStagingEmployee = async (id: string, updates: Partial<EmployeeStaging>) => {
    try {
      const { data, error } = await supabase
        .from('employees_staging')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      setEmployees(prev => prev.map(emp => 
        emp.id === id ? { ...emp, ...updates } : emp
      ));

      toast({
        title: "Success",
        description: "Staging employee updated successfully",
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating staging employee:', err);
      toast({
        title: "Error",
        description: errorMessage || "Failed to update staging employee",
        variant: "destructive",
      });
      return { data: null, error: err };
    }
  };

  const deleteStagingEmployee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('employees_staging')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      setEmployees(prev => prev.filter(emp => emp.id !== id));

      toast({
        title: "Success",
        description: "Staging employee deleted successfully",
      });

      return { error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error deleting staging employee:', err);
      toast({
        title: "Error",
        description: errorMessage || "Failed to delete staging employee",
        variant: "destructive",
      });
      return { error: err };
    }
  };

  const promoteToProduction = async (stagingEmployee: EmployeeStaging) => {
    try {
      // Use secure RPC to bypass RLS for authorized roles
      const { data, error } = await supabase.rpc('promote_staging_employee', {
        p_staging_employee_id: stagingEmployee.id,
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Employee ${stagingEmployee.employee_id} promoted to production`,
      });

      return { data, error: null };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error promoting to production via RPC:', err);
      toast({
        title: 'Promotion error',
        description: errorMessage,
        variant: 'destructive',
      });
      return { data: null, error: err };
    }
  };

  // Batch promote all staged employees that appear in raw attendance logs
  const promoteStagingFromRawAttendance = async (onProgress?: (steps: any[], currentStep: number) => void) => {
    try {
      const steps: Array<{
        id: string;
        name: string;
        status: 'pending' | 'running' | 'completed' | 'error';
        details?: string;
        count?: number;
      }> = [
        { id: 'fetch-raw', name: 'Fetching raw attendance data', status: 'pending', details: '', count: 0 },
        { id: 'fetch-mappings', name: 'Loading user ID mappings', status: 'pending', details: '', count: 0 },
        { id: 'fetch-staging', name: 'Loading staging employees', status: 'pending', details: '', count: 0 },
        { id: 'match-records', name: 'Matching records', status: 'pending', details: '', count: 0 },
        { id: 'promote-employees', name: 'Promoting employees', status: 'pending', details: '', count: 0 },
        { id: 'cleanup', name: 'Cleaning up staging records', status: 'pending', details: '', count: 0 }
      ];

      let currentStep = 0;
      onProgress?.(steps, currentStep);

      const normalizeId = (v: any) => {
        if (!v || typeof v !== 'string') return '';
        const s = v.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        // Collapse leading zeros after alpha prefix (e.g., IG0004122 -> IG4122)
        const m = s.match(/^([A-Z]+)0+(\d+)$/);
        return m ? `${m[1]}${m[2]}` : s;
      };

      // Step 1: Pull raw user_id and employee_id
      steps[0].status = 'running';
      onProgress?.(steps, currentStep);
      
      const { data: rawRows, error: rawErr } = await supabase
        .from('raw_attendance_data')
        .select('user_id, employee_id');
      if (rawErr) throw rawErr;

      const rawEmpSet = new Set<string>();
      const rawUserSet = new Set<string>();
      (rawRows || []).forEach((r: any) => {
        const e = normalizeId(r.employee_id);
        const u = normalizeId(r.user_id);
        if (e) rawEmpSet.add(e);
        if (u) rawUserSet.add(u);
      });

      steps[0].status = 'completed';
      steps[0].details = `Found ${rawRows?.length || 0} raw attendance records`;
      steps[0].count = rawRows?.length || 0;
      currentStep = 1;
      onProgress?.(steps, currentStep);

      // Step 2: Load user_id_mapping and map user_ids to employee_ids
      steps[1].status = 'running';
      onProgress?.(steps, currentStep);

      const { data: mappings, error: mapErr } = await supabase
        .from('user_id_mapping')
        .select('user_id, employee_id');
      if (mapErr) throw mapErr;

      const userToEmp = new Map<string, string>();
      (mappings || []).forEach((m: any) => {
        const u = normalizeId(m.user_id);
        const e = normalizeId(m.employee_id);
        if (u && e && !userToEmp.has(u)) userToEmp.set(u, e);
      });

      // Merge mapped employee ids from raw user_ids
      rawUserSet.forEach((u) => {
        const mappedEmp = userToEmp.get(u);
        if (mappedEmp) rawEmpSet.add(mappedEmp);
      });

      steps[1].status = 'completed';
      steps[1].details = `Processed ${mappings?.length || 0} user ID mappings`;
      steps[1].count = mappings?.length || 0;
      currentStep = 2;
      onProgress?.(steps, currentStep);

      if (rawEmpSet.size === 0) {
        steps[1].status = 'error';
        steps[1].details = 'No employee IDs found in raw data or user ID mappings';
        onProgress?.(steps, currentStep);
        toast({ title: 'No matches', description: 'No employee IDs found in raw data or user ID mappings.' });
        return { matched: 0, promoted: 0, removed: 0 };
      }

      // Step 3: Load staging employees and match
      steps[2].status = 'running';
      onProgress?.(steps, currentStep);

      const { data: stagingAll, error: stagingErr } = await supabase
        .from('employees_staging')
        .select('*');
      if (stagingErr) throw stagingErr;

      steps[2].status = 'completed';
      steps[2].details = `Loaded ${stagingAll?.length || 0} staging employees`;
      steps[2].count = stagingAll?.length || 0;
      currentStep = 3;
      onProgress?.(steps, currentStep);

      // Step 4: Match records
      steps[3].status = 'running';
      onProgress?.(steps, currentStep);

      const matches = (stagingAll || []).filter((st: any) => rawEmpSet.has(normalizeId(st.employee_id)));

      if (matches.length === 0) {
        steps[3].status = 'error';
        steps[3].details = 'No staging records matched with raw attendance data';
        onProgress?.(steps, currentStep);
        // Debug hint in console for specific ID like IG4122
        const probe = 'IG4122';
        // eslint-disable-next-line no-console
        console.debug('[Sync] Raw IDs contain IG4122?', rawEmpSet.has(normalizeId(probe)));
        toast({ title: 'No staging records matched', description: 'IDs exist in raw data, but not matching staging (formatting/casing?).' });
        return { matched: 0, promoted: 0, removed: 0 };
      }

      steps[3].status = 'completed';
      steps[3].details = `Found ${matches.length} matching records`;
      steps[3].count = matches.length;
      currentStep = 4;
      onProgress?.(steps, currentStep);

      // Step 5: Promote employees
      steps[4].status = 'running';
      onProgress?.(steps, currentStep);

      let promoted = 0;
      let removed = 0;
      const toDeleteIds: string[] = [];

      for (const st of matches) {
        const normId = normalizeId(st.employee_id);
        if (!normId) continue;

        // Avoid duplicates in production (case-insensitive exact)
        const { data: existingProd, error: existErr } = await supabase
          .from('employees')
          .select('id')
          .ilike('employee_id', st.employee_id)
          .maybeSingle();
        if (existErr) throw existErr;

        if (!existingProd) {
          const { error } = await promoteToProduction(st as EmployeeStaging);
          if (!error) {
            promoted++;
            toDeleteIds.push(st.id);
            steps[4].details = `Promoted ${promoted}/${matches.length} employees`;
            onProgress?.(steps, currentStep);
          } else {
            // keep in staging for review
            continue;
          }
        } else {
          // existing in production, keep staging for manual review (do not delete silently)
          continue;
        }
      }

      steps[4].status = 'completed';
      steps[4].details = `Promoted ${promoted} employees to production`;
      steps[4].count = promoted;
      currentStep = 5;
      onProgress?.(steps, currentStep);

      // Step 6: Cleanup staging records (only those successfully promoted)
      steps[5].status = 'running';
      onProgress?.(steps, currentStep);

      for (const id of toDeleteIds) {
        const { error: delErr } = await supabase
          .from('employees_staging')
          .delete()
          .eq('id', id);
        if (!delErr) {
          removed++;
          steps[5].details = `Removed ${removed}/${toDeleteIds.length} staging records`;
          onProgress?.(steps, currentStep);
        }
      }

      steps[5].status = 'completed';
      steps[5].details = `Removed ${removed} staging records`;
      steps[5].count = removed;
      onProgress?.(steps, currentStep);

      await fetchEmployees();

      toast({ title: 'Promotion complete', description: `Matched ${matches.length}, promoted ${promoted}, removed ${removed}.` });
      return { matched: matches.length, promoted, removed };
    } catch (err: unknown) {
      console.error('Error promoting from raw logs:', err);
      toast({ title: 'Error', description: 'Failed to promote from raw logs', variant: 'destructive' });
      return { matched: 0, promoted: 0, removed: 0, error: err } as any;
    }
  };

  // Helper function to map staging status to production status
  const mapStagingStatus = (stagingStatus: string | null): string => {
    if (!stagingStatus) return 'active';
    
    const status = stagingStatus.trim().toLowerCase();
    
    switch (status) {
      case 'left':
        return 'inactive';
      case 'yes':
      case 'active':
      case 'rehired':
        return 'active';
      case 'yet to join':
        return 'pending';
      default:
        return 'active'; // Default fallback
    }
  };

  // Helper function to parse date strings
  const parseDate = (dateStr: string | null): string | null => {
    if (!dateStr || dateStr === 'null' || dateStr === 'undefined') {
      return null;
    }
    
    // If it's already a valid ISO date format
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Try to parse other date formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  };

  useEffect(() => {
    fetchEmployees();

    // Set up real-time subscription
    const channel = supabase
      .channel('employees_staging_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees_staging'
        },
        () => {
          fetchEmployees();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    employees,
    loading,
    error,
    fetchEmployees,
    updateStagingEmployee,
    deleteStagingEmployee,
    promoteToProduction,
    promoteStagingFromRawAttendance,
  };
};