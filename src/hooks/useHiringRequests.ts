import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type HiringRequestStatus = 
  | 'pending_rm_approval'
  | 'approved_by_rm'
  | 'rejected_by_rm'
  | 'pending_hr_approval'
  | 'approved_by_hr'
  | 'rejected_by_hr'
  | 'pending_pd_approval'
  | 'approved_by_pd'
  | 'rejected_by_pd'
  | 'pending_payroll'
  | 'approved_by_payroll'
  | 'rejected_by_payroll'
  | 'contract_generated'
  | 'hired'
  | 'rejected';

export interface HiringRequest {
  id: string;
  recruitment_request_id: string;
  candidate_id: string;
  created_by: string;
  proposed_salary: number | null;
  proposed_start_date: string | null;
  justification: string | null;
  contract_details: string | null;
  status: HiringRequestStatus;
  recruitment_manager_id: string | null;
  rm_approved_at: string | null;
  rm_comments: string | null;
  final_salary: number | null;
  final_contract_details: string | null;
  hr_manager_id: string | null;
  hr_approved_at: string | null;
  hr_comments: string | null;
  projects_director_id: string | null;
  pd_approved_at: string | null;
  pd_comments: string | null;
  payroll_officer_id: string | null;
  payroll_approved_at: string | null;
  payroll_comments: string | null;
  hired_employee_id: string | null;
  hired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateHiringRequestData {
  recruitment_request_id: string;
  candidate_id: string;
  proposed_salary: number;
  proposed_start_date?: string;
  justification?: string;
  contract_details?: string;
  recruitment_manager_id?: string;
}

export const useHiringRequests = () => {
  const [hiringRequests, setHiringRequests] = useState<HiringRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchHiringRequests = async (recruitmentRequestId?: string) => {
    try {
      setLoading(true);
      let query = supabase.from('hiring_requests').select('*').order('created_at', { ascending: false });
      
      if (recruitmentRequestId) {
        query = query.eq('recruitment_request_id', recruitmentRequestId);
      }
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      
      setHiringRequests(data || []);
      setError(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching hiring requests:', error);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createHiringRequest = async (requestData: CreateHiringRequestData) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.from('hiring_requests').insert({
      ...requestData,
      created_by: user.id,
      status: 'pending_rm_approval'
    });

    if (error) throw error;

    // Log activity
    await logActivity(requestData.recruitment_request_id, 'hiring_request_created', 
      'Hiring request created for candidate');
  };

  const updateHiringRequest = async (id: string, updates: Partial<HiringRequest>) => {
    const { error } = await supabase
      .from('hiring_requests')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  };

  const approveByRM = async (id: string, finalSalary?: number, contractDetails?: string, comments?: string) => {
    const updates: Partial<HiringRequest> = {
      status: 'approved_by_rm',
      rm_approved_at: new Date().toISOString(),
      rm_comments: comments
    };

    if (finalSalary) updates.final_salary = finalSalary;
    if (contractDetails) updates.final_contract_details = contractDetails;

    await updateHiringRequest(id, updates);
  };

  const rejectByRM = async (id: string, comments?: string) => {
    await updateHiringRequest(id, {
      status: 'rejected_by_rm',
      rm_comments: comments
    });
  };

  const approveByHR = async (id: string, comments?: string) => {
    await updateHiringRequest(id, {
      status: 'approved_by_hr',
      hr_approved_at: new Date().toISOString(),
      hr_comments: comments
    });
  };

  const rejectByHR = async (id: string, comments?: string) => {
    await updateHiringRequest(id, {
      status: 'rejected_by_hr',
      hr_comments: comments
    });
  };

  const markHired = async (id: string, employeeId?: string) => {
    const updates: Partial<HiringRequest> = {
      status: 'hired',
      hired_at: new Date().toISOString()
    };

    if (employeeId) updates.hired_employee_id = employeeId;

    await updateHiringRequest(id, updates);
  };

  const logActivity = async (recruitmentRequestId: string, activityType: string, details: string) => {
    if (!user) return;

    const { error } = await supabase.from('recruitment_activities').insert({
      recruitment_request_id: recruitmentRequestId,
      activity_type: activityType,
      performed_by: user.id,
      activity_details: details
    });

    if (error) console.error('Error logging activity:', error);
  };

  useEffect(() => {
    fetchHiringRequests();

    // Set up real-time subscription
    const subscription = supabase
      .channel('hiring_requests_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'hiring_requests' },
        () => {
          fetchHiringRequests();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    hiringRequests,
    loading,
    error,
    fetchHiringRequests,
    createHiringRequest,
    updateHiringRequest,
    approveByRM,
    rejectByRM,
    approveByHR,
    rejectByHR,
    markHired
  };
};