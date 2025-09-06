import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AttendanceRecord {
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
}

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  averageWorkHours: number;
  totalWorkHours: number;
}

export interface ClockInOutData {
  employee_id: string;
  action: 'clock_in' | 'clock_out';
  timestamp: string;
  location?: string;
  notes?: string;
}

export const useAttendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAttendanceRecords = useCallback(async (date?: string) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error: fetchError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', targetDate)
        .order('clock_in', { ascending: true });

      if (fetchError) throw fetchError;
      
      setAttendanceRecords((data || []) as AttendanceRecord[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance records';
      setError(errorMessage);
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchAttendanceStats = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get total employees count
      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get today's attendance records
      const { data: todayRecords } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', today);

      // Calculate stats
      const presentToday = todayRecords?.filter(r => r.status === 'present' || r.status === 'late').length || 0;
      const absentToday = (totalEmployees || 0) - presentToday;
      const lateToday = todayRecords?.filter(r => r.status === 'late').length || 0;
      const onLeaveToday = todayRecords?.filter(r => r.status === 'on_leave').length || 0;
      
      // Calculate average work hours for present employees
      const presentRecords = todayRecords?.filter(r => r.total_hours && r.total_hours > 0) || [];
      const totalWorkHours = presentRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
      const averageWorkHours = presentRecords.length > 0 ? totalWorkHours / presentRecords.length : 0;

      const stats: AttendanceStats = {
        totalEmployees: totalEmployees || 0,
        presentToday,
        absentToday,
        lateToday,
        onLeaveToday,
        averageWorkHours: Math.round(averageWorkHours * 100) / 100,
        totalWorkHours: Math.round(totalWorkHours * 100) / 100
      };

      setAttendanceStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch attendance stats';
      setError(errorMessage);
      console.error('Error fetching attendance stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clockInOut = useCallback(async (data: ClockInOutData) => {
    if (!user) return { error: 'User not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (data.action === 'clock_in') {
        // Check if already clocked in today
        const { data: existingRecord } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('employee_id', data.employee_id)
          .eq('date', today)
          .single();

        if (existingRecord) {
          return { error: 'Employee already clocked in today' };
        }

        // Create new attendance record
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert({
            employee_id: data.employee_id,
            date: today,
            clock_in: data.timestamp,
            status: 'present',
            notes: data.notes
          });

        if (insertError) throw insertError;
      } else {
        // Clock out - update existing record
        const { error: updateError } = await supabase
          .from('attendance_records')
          .update({
            clock_out: data.timestamp,
            notes: data.notes
          })
          .eq('employee_id', data.employee_id)
          .eq('date', today);

        if (updateError) throw updateError;

        // Calculate total hours
        const { data: record } = await supabase
          .from('attendance_records')
          .select('clock_in, clock_out')
          .eq('employee_id', data.employee_id)
          .eq('date', today)
          .single();

        if (record?.clock_in && record?.clock_out) {
          const clockIn = new Date(record.clock_in);
          const clockOut = new Date(record.clock_out);
          const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

          await supabase
            .from('attendance_records')
            .update({ total_hours: totalHours })
            .eq('employee_id', data.employee_id)
            .eq('date', today);
        }
      }

      // Refresh data
      await fetchAttendanceRecords();
      await fetchAttendanceStats();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process clock in/out';
      setError(errorMessage);
      console.error('Error processing clock in/out:', err);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, fetchAttendanceRecords, fetchAttendanceStats]);

  const updateAttendanceRecord = useCallback(async (
    recordId: string, 
    updates: Partial<AttendanceRecord>
  ) => {
    if (!user) return { error: 'User not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update(updates)
        .eq('id', recordId);

      if (updateError) throw updateError;

      // Refresh data
      await fetchAttendanceRecords();
      await fetchAttendanceStats();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update attendance record';
      setError(errorMessage);
      console.error('Error updating attendance record:', err);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, fetchAttendanceRecords, fetchAttendanceStats]);

  const deleteAttendanceRecord = useCallback(async (recordId: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;

      // Refresh data
      await fetchAttendanceRecords();
      await fetchAttendanceStats();
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete attendance record';
      setError(errorMessage);
      console.error('Error deleting attendance record:', err);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, fetchAttendanceRecords, fetchAttendanceStats]);

  // Initial data fetch
  useEffect(() => {
    fetchAttendanceStats();
  }, [fetchAttendanceStats]);

  return {
    attendanceRecords,
    attendanceStats,
    loading,
    error,
    fetchAttendanceRecords,
    fetchAttendanceStats,
    clockInOut,
    updateAttendanceRecord,
    deleteAttendanceRecord
  };
};
