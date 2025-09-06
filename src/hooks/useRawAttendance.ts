import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RawAttendanceRecord {
  id?: string;
  user_id: string;
  employee_id: string; // Now required since we parse it directly from file
  employee_uuid?: string; // Added for storing the UUID lookup
  name: string;
  clocking_time: string;
  terminal_description: string;
  processed: boolean;
  match_status?: 'matched' | 'unmatched' | 'rejected'; // Track employee matching status
  created_at?: string;
  updated_at?: string;
  hr_name?: string; // Employee name from employees table
}

export interface UserIdMapping {
  id?: string;
  user_id: string;
  employee_id: string;
  employee_name?: string;
  created_at?: string;
  updated_at?: string;
}

export const useRawAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadRawData = useCallback(async (records: RawAttendanceRecord[]) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: uploadError } = await supabase
        .from('raw_attendance_data')
        .insert(records);

      if (uploadError) throw uploadError;

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload raw data';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRawData = useCallback(async (filters?: {
    processed?: boolean;
    date_from?: string;
    date_to?: string;
    user_id?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      // First fetch raw data (with match_status if available)
      let query = supabase
        .from('raw_attendance_data')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.processed !== undefined) {
        query = query.eq('processed', filters.processed);
      }

      if (filters?.date_from) {
        query = query.gte('clocking_time', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('clocking_time', filters.date_to);
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      const { data: rawData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!rawData || rawData.length === 0) {
        return { data: [], error: null };
      }

      // Get unique employee IDs for lookup
      const employeeIds = [...new Set(rawData.map(record => record.employee_id).filter(Boolean))];
      
      // Fetch employee names for the employee IDs
      const { data: employees, error: employeeError } = await supabase
        .from('employees')
        .select('employee_id, english_name')
        .in('employee_id', employeeIds);

      if (employeeError) throw employeeError;

      // Create a map of employee_id to english_name
      const employeeMap = new Map(
        (employees || []).map(emp => [emp.employee_id, emp.english_name])
      );

      // Detect if lookup likely blocked by RLS (no results while requesting many IDs)
      const lookupBlocked = (employees?.length ?? 0) === 0 && employeeIds.length > 0;

      // Map the data to include hr_name with graceful fallback
      const mappedData: RawAttendanceRecord[] = rawData.map(record => ({
        ...record,
        hr_name: employeeMap.get(record.employee_id) || (lookupBlocked ? record.name : 'Not Registered')
      }));

      return { data: mappedData, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch raw data';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserIdMappings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_id_mapping')
        .select(`
          id,
          user_id,
          employee_id,
          employees!inner(english_name)
        `)
        .order('user_id');

      if (fetchError) throw fetchError;

      const mappings: UserIdMapping[] = data?.map(m => ({
        id: m.id,
        user_id: m.user_id,
        employee_id: m.employee_id,
        employee_name: m.employees.english_name
      })) || [];

      return { data: mappings, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user ID mappings';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const addUserIdMapping = useCallback(async (mapping: Omit<UserIdMapping, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('user_id_mapping')
        .insert(mapping)
        .select()
        .single();

      if (insertError) throw insertError;

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add user ID mapping';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUserIdMapping = useCallback(async (mappingId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('user_id_mapping')
        .delete()
        .eq('id', mappingId);

      if (deleteError) throw deleteError;

      return { data: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user ID mapping';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAllRawData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('raw_attendance_data')
        .delete()
        .not('id', 'is', null);

      if (deleteError) throw deleteError;

      return { data: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear raw data';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const processRawData = useCallback(async (dateFrom?: string, dateTo?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch unprocessed raw data
      const { data: rawData, error: fetchError } = await supabase
        .from('raw_attendance_data')
        .select('*')
        .eq('processed', false)
        .gte('clocking_time', dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .lte('clocking_time', dateTo || new Date().toISOString());

      if (fetchError) throw fetchError;

      if (!rawData || rawData.length === 0) {
        return { data: [], error: null };
      }

      // Process the data similar to code.py logic
      const processedRecords = processAttendanceData(rawData);

      // Mark raw data as processed
      const { error: updateError } = await supabase
        .from('raw_attendance_data')
        .update({ processed: true })
        .in('id', rawData.map(r => r.id));

      if (updateError) throw updateError;

      return { data: processedRecords, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process raw data';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const processRawDataRPC = useCallback(async (dateFrom?: string, dateTo?: string, markProcessed: boolean = true) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[processRawDataRPC] Invoking RPC process_raw_attendance with', { dateFrom, dateTo, markProcessed });
      const { data, error: rpcError } = await supabase.rpc('process_raw_attendance', {
        p_date_from: dateFrom ?? null,
        p_date_to: dateTo ?? null,
        p_mark_processed: markProcessed
      });

      if (rpcError) throw rpcError;
      console.log('[processRawDataRPC] Result:', data);

      // data is a jsonb with keys: upserted, raw_marked_processed, skipped_unmatched
      return { data, error: null as string | null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process raw data on server';
      console.error('[processRawDataRPC] Error:', err);
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const processAttendanceData = (rawData: any[]) => {
    // Group by user_id and date
    const grouped = rawData.reduce((acc, record) => {
      const date = new Date(record.clocking_time).toISOString().split('T')[0];
      const key = `${record.user_id}_${date}`;
      
      if (!acc[key]) {
        acc[key] = {
          user_id: record.user_id,
          employee_id: record.employee_id, // Use employee_id directly from record
          date,
          records: []
        };
      }
      
      acc[key].records.push(record);
      return acc;
    }, {} as Record<string, { user_id: string; employee_id?: string; date: string; records: any[] }>);

    // Process each group to find clock in/out times
    const groups = Object.values(grouped) as { user_id: string; employee_id?: string; date: string; records: any[] }[];
    return groups.map((group) => {
      const sortedRecords = group.records.sort((a, b) =>
        new Date(a.clocking_time).getTime() - new Date(b.clocking_time).getTime()
      );

      const clockIn = sortedRecords[0];
      const clockOut = sortedRecords[sortedRecords.length - 1];

      return {
        user_id: group.user_id,
        employee_id: group.employee_id,
        date: group.date,
        clock_in: clockIn.clocking_time,
        clock_out: clockOut.clocking_time,
        terminal_in: clockIn.terminal_description,
        terminal_out: clockOut.terminal_description,
      };
    });
  };

  return {
    loading,
    error,
    uploadRawData,
    fetchRawData,
    fetchUserIdMappings,
    addUserIdMapping,
    deleteUserIdMapping,
    clearAllRawData,
    processRawData,
    processRawDataRPC
  };
};
