import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface RecruitmentRequest {
  id: string;
  requested_by: string;
  position_title: string;
  department: string;
  cost_center: string;
  job_description?: string;
  required_qualifications?: string;
  preferred_qualifications?: string;
  salary_range_min?: number;
  salary_range_max?: number;
  expected_start_date?: string;
  justification?: string;
  headcount_increase: boolean;
  replacement_for?: string;
  status: 'draft'
    | 'pending_hiring_manager'
    | 'approved_by_hiring_manager'
    | 'rejected_by_hiring_manager'
    | 'pending_recruiter'
    | 'in_recruitment_process'
    | 'pending_recruitment_manager'
    | 'contract_generated'
    | 'hired'
    | 'rejected'
    | 'approved_by_hm'
    | 'candidates_created'
    | 'pending_interview_assessment'
    | 'pending_hr_manager'
    | 'pending_projects_director'
    | 'pending_payroll'
    | 'recruiter_assigned'
    | 'hiring_request';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  hiring_manager_id?: string;
  hiring_manager_approved_at?: string;
  hiring_manager_comments?: string;
  recruiter_id?: string;
  recruiter_assigned_at?: string;
  recruitment_manager_id?: string;
  recruitment_manager_approved_at?: string;
  final_salary?: number;
  contract_details?: string;
  hired_employee_id?: string;
  hired_at?: string;
}

export interface CreateRecruitmentRequestData {
  position_title: string;
  department: string;
  cost_center: string;
  job_description?: string;
  required_qualifications?: string;
  preferred_qualifications?: string;
  salary_range_min?: number;
  salary_range_max?: number;
  expected_start_date?: string;
  justification?: string;
  headcount_increase: boolean;
  replacement_for?: string;
}

export interface InterviewAssessment {
  id: string;
  recruitment_request_id: string;
  interviewer_id: string;
  candidate_id?: string;
  candidate_name: string;
  candidate_email?: string;
  candidate_phone?: string;
  interview_date?: string;
  technical_skills_score?: number;
  communication_score?: number;
  experience_score?: number;
  cultural_fit_score?: number;
  overall_score?: number;
  technical_notes?: string;
  communication_notes?: string;
  experience_notes?: string;
  cultural_fit_notes?: string;
  additional_comments?: string;
  recommendation?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInterviewAssessmentData {
  recruitment_request_id: string;
  candidate_name: string;
  candidate_email?: string;
  candidate_phone?: string;
  interview_date?: string;
  technical_skills_score?: number;
  communication_score?: number;
  experience_score?: number;
  cultural_fit_score?: number;
  overall_score?: number;
  technical_notes?: string;
  communication_notes?: string;
  experience_notes?: string;
  cultural_fit_notes?: string;
  additional_comments?: string;
  recommendation?: string;
}

export function useRecruitment() {
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recruitment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
      setError(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching recruitment requests:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to fetch recruitment requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: CreateRecruitmentRequestData) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('recruitment_requests')
        .insert({
          ...requestData,
          requested_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logActivity(data.id, 'request_created', 'Recruitment request created');
      await fetchRequests();

      toast({
        title: "Success",
        description: "Recruitment request created successfully",
      });

      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating recruitment request:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to create recruitment request",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateRequest = async (id: string, updates: Partial<RecruitmentRequest>) => {
    try {
      const currentRequest = requests.find(r => r.id === id);
      const { data, error } = await supabase
        .from('recruitment_requests')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log status change if status was updated
      if (updates.status && currentRequest && currentRequest.status !== updates.status) {
        await logActivity(id, 'status_changed', `Status changed from ${currentRequest.status} to ${updates.status}`, currentRequest.status, updates.status);
      }

      await fetchRequests();

      toast({
        title: "Success",
        description: "Recruitment request updated successfully",
      });

      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error updating recruitment request:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to update recruitment request",
        variant: "destructive",
      });
      throw err;
    }
  };

  const submitRequest = async (id: string) => {
    await updateRequest(id, {
      status: 'pending_hiring_manager',
      submitted_at: new Date().toISOString(),
    });
  };

  const approveByHiringManager = async (id: string, comments?: string) => {
    await updateRequest(id, {
      status: 'approved_by_hiring_manager',
      hiring_manager_id: user?.id,
      hiring_manager_approved_at: new Date().toISOString(),
      hiring_manager_comments: comments,
    });
  };

  const rejectByHiringManager = async (id: string, comments?: string) => {
    await updateRequest(id, {
      status: 'rejected_by_hiring_manager',
      hiring_manager_id: user?.id,
      hiring_manager_comments: comments,
    });
  };

  const assignRecruiter = async (id: string, recruiterId: string) => {
    const previousStatus = requests.find(r => r.id === id)?.status;
    await updateRequest(id, {
      status: 'pending_recruiter',
      recruiter_id: recruiterId,
      recruiter_assigned_at: new Date().toISOString(),
    });
    await logActivity(id, 'recruiter_assigned', `Recruiter assigned`, previousStatus, 'pending_recruiter');
  };

  const startRecruitmentProcess = async (id: string) => {
    const previousStatus = requests.find(r => r.id === id)?.status || 'approved_by_hiring_manager';
    await updateRequest(id, {
      status: 'in_recruitment_process',
    });
    await logActivity(id, 'recruitment_started', 'Recruitment process started', previousStatus, 'in_recruitment_process');
  };

  const createAssessment = async (assessmentData: CreateInterviewAssessmentData) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('interview_assessments')
        .insert({
          ...assessmentData,
          interviewer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await logActivity(assessmentData.recruitment_request_id, 'assessment_created', `Interview assessment created for ${assessmentData.candidate_name}`);

      toast({
        title: "Success",
        description: "Interview assessment created successfully",
      });

      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error creating interview assessment:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to create interview assessment",
        variant: "destructive",
      });
      throw err;
    }
  };

  const requestRecruitmentManagerApproval = async (id: string) => {
    const previousStatus = requests.find(r => r.id === id)?.status || 'in_recruitment_process';
    await updateRequest(id, {
      status: 'pending_recruitment_manager',
    });
    await logActivity(id, 'rm_approval_requested', 'Requested approval from Recruitment Manager', previousStatus, 'pending_recruitment_manager');
  };

  const approveByRecruitmentManager = async (
    id: string,
    finalSalary?: number,
    contractDetails?: string,
  ) => {
    await updateRequest(id, {
      status: 'contract_generated',
      final_salary: finalSalary,
      contract_details: contractDetails,
    });
    await logActivity(id, 'rm_approved', 'Recruitment Manager approved and contract generated', 'pending_recruitment_manager', 'contract_generated');
  };

  const rejectRequest = async (id: string, reason?: string) => {
    const previousStatus = requests.find(r => r.id === id)?.status;
    await updateRequest(id, {
      status: 'rejected',
    });
    await logActivity(id, 'request_rejected', reason ? `Rejected: ${reason}` : 'Request rejected', previousStatus, 'rejected');
  };

  const markHired = async (id: string, hiredEmployeeId?: string) => {
    await updateRequest(id, {
      status: 'hired',
      hired_employee_id: hiredEmployeeId,
      hired_at: new Date().toISOString(),
    });
    await logActivity(id, 'hired', 'Candidate hired', 'contract_generated', 'hired');
  };

  const createHiringRequest = async (id: string, candidateIds: string[]) => {
    const previousStatus = requests.find(r => r.id === id)?.status || 'in_recruitment_process';
    await updateRequest(id, {
      status: 'hiring_request',
    });
    await logActivity(id, 'hiring_request_created', `Hiring request created for ${candidateIds.length} candidate(s)`, previousStatus, 'hiring_request');
  };

  const getCandidates = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('recruitment_candidates')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: unknown) {
      console.error('Error fetching candidates:', err);
      throw err;
    }
  };

  const getAssessments = async (requestId: string): Promise<InterviewAssessment[]> => {
    try {
      const { data, error } = await supabase
        .from('interview_assessments')
        .select('*')
        .eq('recruitment_request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InterviewAssessment[];
    } catch (err: unknown) {
      console.error('Error fetching assessments:', err);
      throw err;
    }
  };

  const logActivity = async (
    requestId: string, 
    activityType: string, 
    details: string,
    previousStatus?: string,
    newStatus?: string
  ) => {
    try {
      if (!user) return;

      const payload = {
        recruitment_request_id: requestId,
        activity_type: activityType,
        performed_by: user.id,
        activity_details: details,
        previous_status: previousStatus,
        new_status: newStatus,
      } as any;

      await supabase
        .from('recruitment_activities')
        .insert(payload);
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel('recruitment_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recruitment_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    requests,
    loading,
    error,
    createRequest,
    updateRequest,
    submitRequest,
    approveByHiringManager,
    rejectByHiringManager,
    assignRecruiter,
    startRecruitmentProcess,
    createAssessment,
    getAssessments,
    refreshRequests: fetchRequests,
    requestRecruitmentManagerApproval,
    approveByRecruitmentManager,
    rejectRequest,
    markHired,
    createHiringRequest,
    getCandidates,
  };
}