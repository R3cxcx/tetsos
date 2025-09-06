import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EnhancedAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: 'present' | 'absent' | 'late' | 'on_leave' | 'half_day';
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    employee_id: string;
    english_name: string;
    arabic_name: string;
    position: string;
    category: string;
  };
}

export interface AttendanceStats {
  date: string;
  total_employees: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  on_leave_count: number;
  total_work_hours: number;
  average_work_hours: number;
  attendance_rate: number;
}

export interface AttendanceAnomaly {
  employee_id: string;
  employee_name: string;
  anomaly_type: string;
  anomaly_details: any;
  date: string;
  severity: 'low' | 'medium' | 'high';
}

export interface BusinessRule {
  id: string;
  rule_type: string;
  name: string;
  parameters: any;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
}

export const useEnhancedAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<EnhancedAttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [anomalies, setAnomalies] = useState<AttendanceAnomaly[]>([]);
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch attendance records with employee details
  const fetchAttendanceRecords = useCallback(async (
    dateFrom?: string, 
    dateTo?: string,
    employeeId?: string,
    status?: string
  ) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(
            id,
            employee_id,
            english_name,
            arabic_name,
            position,
            category
          )
        `)
        .order('date', { ascending: false })
        .order('clock_in', { ascending: true });

      if (dateFrom) {
        query = query.gte('date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('date', dateTo);
      }
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      
      const mappedData = (data || []).map(record => ({
        ...record,
        employee: Array.isArray(record.employees) ? record.employees[0] : record.employees
      }));
      
      setAttendanceRecords(mappedData as EnhancedAttendanceRecord[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance records';
      setError(errorMessage);
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Enhanced processing using new RPC function
  const processRawAttendance = useCallback(async (
    dateFrom?: string,
    dateTo?: string,
    markProcessed: boolean = true,
    autoApprove: boolean = false
  ) => {
    if (!user) return { error: 'User not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('enhanced_process_raw_attendance', {
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null,
        p_mark_processed: markProcessed,
        p_auto_approve: autoApprove
      });

      if (rpcError) throw rpcError;
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process raw attendance';
      setError(errorMessage);
      console.error('Error processing raw attendance:', err);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch daily statistics
  const fetchDailyStats = useCallback(async (date?: string) => {
    if (!user) return;
    
    try {
      const { data, error: rpcError } = await supabase.rpc('calculate_daily_attendance_stats', {
        p_date: date || new Date().toISOString().split('T')[0]
      });

      if (rpcError) throw rpcError;
      
      setAttendanceStats(data as unknown as AttendanceStats);
    } catch (err) {
      console.error('Error fetching daily stats:', err);
    }
  }, [user]);

  // Fetch anomalies
  const fetchAnomalies = useCallback(async (dateFrom?: string, dateTo?: string) => {
    if (!user) return;
    
    try {
      const { data, error: rpcError } = await supabase.rpc('detect_attendance_anomalies', {
        p_date_from: dateFrom || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_date_to: dateTo || new Date().toISOString().split('T')[0]
      });

      if (rpcError) throw rpcError;
      
      setAnomalies((data || []).map(item => ({
        ...item,
        severity: item.severity as 'low' | 'medium' | 'high'
      })));
    } catch (err) {
      console.error('Error fetching anomalies:', err);
    }
  }, [user]);

  // Auto-approve normal attendance
  const autoApproveAttendance = useCallback(async (date?: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    try {
      const { data, error: rpcError } = await supabase.rpc('auto_approve_normal_attendance', {
        p_date: date || new Date().toISOString().split('T')[0]
      });

      if (rpcError) throw rpcError;
      
      return { success: true, data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-approve attendance';
      console.error('Error auto-approving attendance:', err);
      return { error: errorMessage };
    }
  }, [user]);

  // Fetch business rules
  const fetchBusinessRules = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error: fetchError } = await supabase
        .from('attendance_business_rules')
        .select('*')
        .eq('is_active', true)
        .order('rule_type');

      if (fetchError) throw fetchError;
      
      setBusinessRules(data || []);
    } catch (err) {
      console.error('Error fetching business rules:', err);
    }
  }, [user]);

  // Update business rule
  const updateBusinessRule = useCallback(async (
    ruleId: string,
    updates: Partial<BusinessRule>
  ) => {
    if (!user) return { error: 'User not authenticated' };
    
    try {
      const { error: updateError } = await supabase
        .from('attendance_business_rules')
        .update(updates)
        .eq('id', ruleId);

      if (updateError) throw updateError;
      
      await fetchBusinessRules();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update business rule';
      console.error('Error updating business rule:', err);
      return { error: errorMessage };
    }
  }, [user, fetchBusinessRules]);

  // Get attendance for date range (for calendar view)
  const getAttendanceForDateRange = useCallback(async (
    startDate: string,
    endDate: string,
    employeeIds?: string[]
  ) => {
    if (!user) return [];
    
    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(
            id,
            employee_id,
            english_name,
            arabic_name
          )
        `)
        .gte('date', startDate)
        .lte('date', endDate);

      if (employeeIds && employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return data || [];
    } catch (err) {
      console.error('Error fetching attendance for date range:', err);
      return [];
    }
  }, [user]);

  // Bulk update attendance records
  const bulkUpdateAttendance = useCallback(async (
    updates: Array<{ id: string; updates: Partial<EnhancedAttendanceRecord> }>
  ) => {
    if (!user) return { error: 'User not authenticated' };
    
    setLoading(true);
    
    try {
      const updatePromises = updates.map(({ id, updates: recordUpdates }) =>
        supabase
          .from('attendance_records')
          .update(recordUpdates)
          .eq('id', id)
      );

      const results = await Promise.all(updatePromises);
      
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} records`);
      }
      
      return { success: true, updated: updates.length };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk update attendance';
      setError(errorMessage);
      console.error('Error bulk updating attendance:', err);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initialize data
  useEffect(() => {
    if (user) {
      fetchBusinessRules();
      fetchDailyStats();
      fetchAnomalies();
    }
  }, [user, fetchBusinessRules, fetchDailyStats, fetchAnomalies]);

  return {
    attendanceRecords,
    attendanceStats,
    anomalies,
    businessRules,
    loading,
    error,
    fetchAttendanceRecords,
    processRawAttendance,
    fetchDailyStats,
    fetchAnomalies,
    autoApproveAttendance,
    fetchBusinessRules,
    updateBusinessRule,
    getAttendanceForDateRange,
    bulkUpdateAttendance
  };
};