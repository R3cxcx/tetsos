import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EmployeeMatchResult {
  user_id: string;
  employee_id: string;
  name: string;
  matched_employee?: {
    id: string;
    employee_id: string;
    english_name: string;
    arabic_name?: string;
  };
  match_confidence: 'exact' | 'normalized' | 'fuzzy' | 'none';
  match_method: string;
}

export interface ProcessingStats {
  total_records: number;
  matched_records: number;
  unmatched_records: number;
  processed_records: number;
  skipped_records: number;
  anomalies_detected: number;
  business_rules_applied: string[];
}

export interface EnhancedRawAttendanceRecord {
  id?: string;
  user_id: string;
  employee_id: string;
  employee_uuid?: string; // Added for storing the UUID lookup
  name: string;
  clocking_time: string;
  terminal_description: string;
  processed: boolean;
  match_status?: 'matched' | 'unmatched' | 'rejected'; // Track employee matching status
  created_at?: string;
  updated_at?: string;
  hr_name?: string;
  match_result?: EmployeeMatchResult;
  anomaly_flags?: string[];
}

export const useEnhancedRawAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart employee matching algorithm
  const performSmartMatching = useCallback(async (records: EnhancedRawAttendanceRecord[]): Promise<EmployeeMatchResult[]> => {
    setLoading(true);
    setError(null);

    try {
      // Get all employees for matching
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('id, employee_id, english_name, arabic_name, work_phone')
        .eq('deleted_at', null);

      if (employeeError) throw employeeError;

      const results: EmployeeMatchResult[] = records.map(record => {
        let matchedEmployee = null;
        let confidence: 'exact' | 'normalized' | 'fuzzy' | 'none' = 'none';
        let method = 'no_match';

        // Strategy 1: Exact employee ID match
        matchedEmployee = employees?.find(emp => emp.employee_id === record.employee_id);
        if (matchedEmployee) {
          confidence = 'exact';
          method = 'exact_employee_id';
        }

        // Strategy 2: Normalized employee ID match (remove leading zeros, special chars)
        if (!matchedEmployee) {
          const normalizedRecordId = normalizeEmployeeId(record.employee_id);
          matchedEmployee = employees?.find(emp => normalizeEmployeeId(emp.employee_id) === normalizedRecordId);
          if (matchedEmployee) {
            confidence = 'normalized';
            method = 'normalized_employee_id';
          }
        }

        // Strategy 3: Name-based fuzzy matching
        if (!matchedEmployee) {
          const normalizedRecordName = record.name.toLowerCase().trim();
          matchedEmployee = employees?.find(emp => {
            const englishMatch = emp.english_name?.toLowerCase().includes(normalizedRecordName) || 
                                normalizedRecordName.includes(emp.english_name?.toLowerCase() || '');
            const arabicMatch = emp.arabic_name?.toLowerCase().includes(normalizedRecordName) || 
                               normalizedRecordName.includes(emp.arabic_name?.toLowerCase() || '');
            return englishMatch || arabicMatch;
          });
          if (matchedEmployee) {
            confidence = 'fuzzy';
            method = 'name_fuzzy_match';
          }
        }

        return {
          user_id: record.user_id,
          employee_id: record.employee_id,
          name: record.name,
          matched_employee: matchedEmployee || undefined,
          match_confidence: confidence,
          match_method: method
        };
      });

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to perform smart matching';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Enhanced processing with business rules and anomaly detection
  const processWithEnhancements = useCallback(async (
    records: EnhancedRawAttendanceRecord[],
    options: {
      dateFrom?: string;
      dateTo?: string;
      applyBusinessRules?: boolean;
      detectAnomalies?: boolean;
      autoApprove?: boolean;
    } = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      // First perform smart matching
      const matchResults = await performSmartMatching(records);
      
      // Enhanced processing via RPC with business rules
      const { data, error: rpcError } = await supabase.rpc('enhanced_process_raw_attendance', {
        p_date_from: options.dateFrom || null,
        p_date_to: options.dateTo || null,
        p_mark_processed: true,
        p_auto_approve: options.autoApprove || false
      });

      if (rpcError) throw rpcError;

      // Calculate enhanced statistics
      const resultData = data as any;
      const stats: ProcessingStats = {
        total_records: records.length,
        matched_records: matchResults.filter(r => r.matched_employee).length,
        unmatched_records: matchResults.filter(r => !r.matched_employee).length,
        processed_records: resultData?.upserted || 0,
        skipped_records: resultData?.skipped_unmatched || 0,
        anomalies_detected: resultData?.anomalies_detected || 0,
        business_rules_applied: resultData?.business_rules_applied ? Object.keys(resultData.business_rules_applied) : []
      };

      return {
        success: true,
        matchResults,
        processingResult: data,
        stats,
        error: null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process with enhancements';
      setError(errorMessage);
      return {
        success: false,
        matchResults: [],
        processingResult: null,
        stats: null,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [performSmartMatching]);

  // Bulk operations for common fixes
  const bulkUpdateEmployeeIds = useCallback(async (updates: Array<{ user_id: string; new_employee_id: string }>) => {
    setLoading(true);
    setError(null);

    try {
      // Update multiple records individually since we need more fields
      const updatePromises = updates.map(update => 
        supabase
          .from('raw_attendance_data')
          .update({ 
            employee_id: update.new_employee_id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', update.user_id)
      );

      const results = await Promise.all(updatePromises);
      const hasErrors = results.some(result => result.error);
      
      if (hasErrors) {
        throw new Error('Some updates failed');
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to bulk update employee IDs';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-register missing employees
  const autoRegisterEmployees = useCallback(async (unmatchedRecords: EmployeeMatchResult[]) => {
    setLoading(true);
    setError(null);

    try {
      const newEmployees = unmatchedRecords.map(record => ({
        employee_id: record.employee_id,
        english_name: record.name,
        status: 'active',
        created_by: null // Will be set by function
      }));

      // Use bulk employee creation function
      const results = await Promise.all(
        newEmployees.map(emp => 
          supabase.rpc('upsert_employee_data', {
            p_employee_id: emp.employee_id,
            p_english_name: emp.english_name,
            p_status: emp.status
          })
        )
      );

      const successful = results.filter(r => {
        const data = r.data as any;
        return data?.success;
      }).length;
      const failed = results.length - successful;

      return {
        success: true,
        created: successful,
        failed,
        error: null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to auto-register employees';
      setError(errorMessage);
      return {
        success: false,
        created: 0,
        failed: unmatchedRecords.length,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get processing dashboard data
  const getProcessingDashboard = useCallback(async (dateRange?: { from: string; to: string }) => {
    setLoading(true);
    setError(null);

    try {
      // Get raw data statistics
      let rawQuery = supabase
        .from('raw_attendance_data')
        .select('processed, created_at, clocking_time', { count: 'exact' });

      if (dateRange) {
        rawQuery = rawQuery
          .gte('clocking_time', dateRange.from)
          .lte('clocking_time', dateRange.to);
      }

      const { count: totalRaw, error: rawError } = await rawQuery;
      if (rawError) throw rawError;

      // Get processed vs unprocessed counts
      const { count: processedCount, error: processedError } = await supabase
        .from('raw_attendance_data')
        .select('*', { count: 'exact', head: true })
        .eq('processed', true);

      if (processedError) throw processedError;

      // Get recent processing activity
      const { data: recentActivity, error: activityError } = await supabase
        .from('raw_attendance_data')
        .select('created_at, processed, employee_id')
        .order('created_at', { ascending: false })
        .limit(100);

      if (activityError) throw activityError;

      return {
        success: true,
        data: {
          totalRecords: totalRaw || 0,
          processedRecords: processedCount || 0,
          unprocessedRecords: (totalRaw || 0) - (processedCount || 0),
          processingRate: totalRaw ? (processedCount || 0) / totalRaw : 0,
          recentActivity: recentActivity || []
        },
        error: null
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get dashboard data';
      setError(errorMessage);
      return {
        success: false,
        data: null,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    performSmartMatching,
    processWithEnhancements,
    bulkUpdateEmployeeIds,
    autoRegisterEmployees,
    getProcessingDashboard
  };
};

// Helper function to normalize employee IDs
function normalizeEmployeeId(employeeId: string): string {
  if (!employeeId) return '';
  
  // Remove leading zeros, special characters, normalize case
  return employeeId
    .toUpperCase()
    .replace(/^0+/, '') // Remove leading zeros
    .replace(/[^A-Z0-9]/g, ''); // Remove special characters
}