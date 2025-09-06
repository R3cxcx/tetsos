import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRecruitment, type RecruitmentRequest, type InterviewAssessment } from '@/hooks/useRecruitment';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Calendar, DollarSign, FileSignature, FileText, Check, X, UserPlus, Building2, Send, Edit, Save, Users } from 'lucide-react';

const statusColors = {
  draft: 'secondary',
  pending_hiring_manager: 'destructive',
  approved_by_hiring_manager: 'default',
  rejected_by_hiring_manager: 'destructive',
  pending_recruiter: 'destructive',
  in_recruitment_process: 'default',
  pending_recruitment_manager: 'destructive',
  contract_generated: 'default',
  hired: 'default',
  rejected: 'destructive',
  hiring_request: 'destructive',
  pending_projects_director: 'destructive',
} as const;

const statusLabels = {
  draft: 'Draft',
  pending_hiring_manager: 'Pending Hiring Manager',
  approved_by_hiring_manager: 'Approved by Hiring Manager',
  rejected_by_hiring_manager: 'Rejected by Hiring Manager',
  pending_recruiter: 'Pending Recruiter',
  in_recruitment_process: 'In Recruitment Process',
  pending_recruitment_manager: 'Pending Recruitment Manager',
  contract_generated: 'Contract Generated',
  hired: 'Hired',
  rejected: 'Rejected',
  hiring_request: 'Pending Projects Director',
  pending_projects_director: 'Pending Projects Director',
} as const;

interface Activity {
  id: string;
  activity_type: string;
  activity_details: string | null;
  created_at: string;
  previous_status: string | null;
  new_status: string | null;
  performed_by: string;
  recruitment_request_id: string;
}

export default function RequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    requests,
    submitRequest,
    approveByHiringManager,
    rejectByHiringManager,
    startRecruitmentProcess,
    assignRecruiter,
    requestRecruitmentManagerApproval,
    approveByRecruitmentManager,
    rejectRequest,
    markHired,
    getAssessments,
    createHiringRequest,
    getCandidates,
  } = useRecruitment();
  const { user, hasRole, hasPermission } = useAuth();

  const [request, setRequest] = useState<RecruitmentRequest | null>(null);
  const [assessments, setAssessments] = useState<InterviewAssessment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [candidates, setCandidates] = useState<Array<{
    id: string;
    request_id: string;
    full_name: string;
    email: string;
    phone: string;
    status: string;
    notes: string;
    created_at: string;
    created_by: string;
    updated_at: string;
  }>>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState('');
  const [selectedRecruiterId, setSelectedRecruiterId] = useState('');
  const [rmFinalSalary, setRmFinalSalary] = useState('');
  const [rmContractDetails, setRmContractDetails] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [employees, setEmployees] = useState<{ id: string; english_name: string }[]>([]);
  const [hiredEmployeeId, setHiredEmployeeId] = useState('');
  const [recruiters, setRecruiters] = useState<{ user_id: string; name: string; email: string | null }[]>([]);
  const [isEditingRecruiter, setIsEditingRecruiter] = useState(false);
  const [newRecruiterId, setNewRecruiterId] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      let current = requests.find(r => r.id === id) || null;
      if (!current) {
        const { data } = await supabase.from('recruitment_requests').select('*').eq('id', id).maybeSingle();
        current = data || null;
      }
      setRequest(current);
      if (current) {
        const assmts = await getAssessments(current.id);
        setAssessments(assmts);
        const candidatesData = await getCandidates(current.id);
        setCandidates(candidatesData);
        const { data: acts } = await supabase
          .from('recruitment_activities')
          .select('*')
          .eq('recruitment_request_id', current.id)
          .order('created_at', { ascending: false });
        setActivities(acts || []);
      }
      const { data: employeesData } = await supabase
        .rpc('get_employees_basic_data');
      setEmployees((employeesData || []).map((emp: { id: string; english_name: string }) => ({
        id: emp.id,
        english_name: emp.english_name
      })));

      // Load potential recruiters (users with HR or admin roles)
      // First get user IDs with the required roles
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'hr_manager', 'hr_staff', 'super_admin', 'recruiter']);

      console.log('User roles data:', userRolesData, 'Error:', rolesError);

      if (userRolesData && userRolesData.length > 0) {
        const userIds = userRolesData.map(ur => ur.user_id);
        console.log('User IDs to fetch profiles for:', userIds);
        
        // Then get the profile data for those users
        const { data: recruitersData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, email, approval_status')
          .in('user_id', userIds);

        console.log('Profiles data:', recruitersData, 'Error:', profilesError);

        if (recruitersData) {
          // Filter for approved users only
          const approvedRecruiters = recruitersData.filter(profile => profile.approval_status === 'approved');
          console.log('Approved recruiters:', approvedRecruiters);
          
          const recruiters = approvedRecruiters.map((profile: { user_id: string; first_name: string | null; last_name: string | null; email: string | null }) => ({
            user_id: profile.user_id,
            name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'Unknown',
            email: profile.email
          }));
          setRecruiters(recruiters);
          console.log('Final recruiters list:', recruiters);
        }
      } else {
        console.log('No user roles found');
        setRecruiters([]);
      }
    };
    load();
  }, [id, requests]);

  const canSubmit = useMemo(() => user && request && user.id === request.requested_by && request.status === 'draft', [user, request]);
  const isHiringManagerForRequest = useMemo(() => user && request && request.hiring_manager_id && user.id === request.hiring_manager_id, [user, request]);
  const canApproveReject = useMemo(() => request && request.status === 'pending_hiring_manager' && (hasRole('admin') || hasRole('super_admin') || !!isHiringManagerForRequest), [request, hasRole, isHiringManagerForRequest]);
  const canStartRecruitment = useMemo(() => request && (request.status === 'approved_by_hiring_manager' || request.status === 'pending_recruiter') && (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager') || (user && user.id === request.recruiter_id)), [request, hasRole, user]);
  const canAssignRecruiter = useMemo(() => request && (request.status === 'approved_by_hiring_manager' || request.status === 'pending_recruiter') && (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager')), [request, hasRole]);
  const canEditRecruiter = useMemo(() => request && (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager')), [request, hasRole]);
  const canRequestRMApproval = useMemo(() => request && request.status === 'in_recruitment_process' && (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager') || (user && user.id === request.recruiter_id)), [request, hasRole, user]);
  const canRMApproveReject = useMemo(() => request && request.status === 'pending_recruitment_manager' && (hasRole('admin') || hasRole('super_admin') || (user && user.id === request.recruitment_manager_id)), [request, hasRole, user]);
  const canMarkHired = useMemo(() => request && request.status === 'contract_generated' && (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager')), [request, hasRole]);
  const canCreateHiringRequest = useMemo(() => request && request.status === 'in_recruitment_process' && candidates.length > 0 && (hasRole('super_admin') || (user && user.id === request.recruiter_id)), [request, candidates, user, hasRole]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return `$${amount.toLocaleString()}`;
  };

  const refresh = async () => {
    if (!id) return;
    const { data } = await supabase.from('recruitment_requests').select('*').eq('id', id).maybeSingle();
    setRequest(data || null);
    if (data) {
      const candidatesData = await getCandidates(data.id);
      setCandidates(candidatesData);
    }
  };

  const handleSubmit = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await submitRequest(request.id);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await approveByHiringManager(request.id, comments);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await rejectByHiringManager(request.id, comments);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRecruitment = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await startRecruitmentProcess(request.id);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRecruiter = async () => {
    if (!request || !selectedRecruiterId) return;
    setIsSubmitting(true);
    try {
      await assignRecruiter(request.id, selectedRecruiterId);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRMApproval = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await requestRecruitmentManagerApproval(request.id);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRMApprove = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      const salaryNum = rmFinalSalary ? Number(rmFinalSalary) : undefined;
      await approveByRecruitmentManager(request.id, salaryNum, rmContractDetails || undefined);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRMReject = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await rejectRequest(request.id, rejectionReason || undefined);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkHired = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      await markHired(request.id, hiredEmployeeId || undefined);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateHiringRequest = async () => {
    if (!request || selectedCandidateIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await createHiringRequest(request.id, selectedCandidateIds);
      await refresh();
      setSelectedCandidateIds([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCandidateSelection = (candidateId: string, checked: boolean) => {
    if (checked) {
      setSelectedCandidateIds(prev => [...prev, candidateId]);
    } else {
      setSelectedCandidateIds(prev => prev.filter(id => id !== candidateId));
    }
  };

  const handleSelectAllCandidates = (checked: boolean) => {
    if (checked) {
      setSelectedCandidateIds(candidates.map(c => c.id));
    } else {
      setSelectedCandidateIds([]);
    }
  };

  const handleUpdateRecruiter = async () => {
    if (!request) return;
    setIsSubmitting(true);
    try {
      // If "unassigned" is selected, pass null to remove the recruiter
      const recruiterId = newRecruiterId === 'unassigned' ? null : newRecruiterId;
      await assignRecruiter(request.id, recruiterId);
      await refresh();
      setIsEditingRecruiter(false);
      setNewRecruiterId('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentRecruiterName = () => {
    if (!request?.recruiter_id) return 'Not assigned';
    const recruiter = recruiters.find(r => r.user_id === request.recruiter_id);
    return recruiter ? recruiter.name : 'Unknown Recruiter';
  };

  if (!request) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8 max-w-5xl">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading request...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl font-bold">{request.position_title}</h1>
            <p className="text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> {request.department} • {request.cost_center}</p>
          </div>
                      <Badge variant={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> Position Information
                </CardTitle>
                <CardDescription>Core information and compensation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Position Type</Label>
                    <p className="text-sm text-muted-foreground">
                      {request.headcount_increase ? 'New Position (Headcount Increase)' : 'Replacement Position'}
                    </p>
                    {!request.headcount_increase && request.replacement_for && (
                      <p className="text-sm">Replacing: {request.replacement_for}</p>
                    )}
                  </div>
                  <div>
                    <Label className="font-medium">Expected Start Date</Label>
                    <p className="text-sm text-muted-foreground">{new Date(request.expected_start_date || '').toLocaleDateString() || 'Not set'}</p>
                  </div>
                </div>

                {request.job_description && (
                  <div>
                    <Label className="font-medium">Job Description</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.job_description}</p>
                  </div>
                )}

                {request.required_qualifications && (
                  <div>
                    <Label className="font-medium">Required Qualifications</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.required_qualifications}</p>
                  </div>
                )}

                {request.preferred_qualifications && (
                  <div>
                    <Label className="font-medium">Preferred Qualifications</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.preferred_qualifications}</p>
                  </div>
                )}

                {(request.salary_range_min || request.salary_range_max || request.final_salary) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-medium">Salary Range</Label>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(request.salary_range_min)} - {formatCurrency(request.salary_range_max)}
                      </p>
                    </div>
                    {request.final_salary && (
                      <div>
                        <Label className="font-medium">Final Approved Salary</Label>
                        <p className="text-sm text-muted-foreground">{formatCurrency(request.final_salary)}</p>
                      </div>
                    )}
                   </div>
                 )}

                 {/* Recruiter Section */}
                 <div className="border-t pt-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <Label className="font-medium">Assigned Recruiter</Label>
                       <p className="text-sm text-muted-foreground">{getCurrentRecruiterName()}</p>
                     </div>
                     {canEditRecruiter && !isEditingRecruiter && (
                       <Button
                         variant="outline"
                         size="sm"
                        onClick={() => {
                          setIsEditingRecruiter(true);
                          setNewRecruiterId(request.recruiter_id || 'unassigned');
                        }}
                         className="gap-2"
                       >
                         <Edit className="h-4 w-4" />
                         Edit Recruiter
                       </Button>
                     )}
                   </div>

                   {canEditRecruiter && isEditingRecruiter && (
                     <div className="mt-3 space-y-3 p-3 border rounded-md bg-muted/50">
                       <div>
                         <Label className="font-medium">Select New Recruiter</Label>
                         <Select value={newRecruiterId} onValueChange={setNewRecruiterId}>
                           <SelectTrigger className="mt-1">
                             <SelectValue placeholder="Select recruiter" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="unassigned">No recruiter assigned</SelectItem>
                             {recruiters.map(recruiter => (
                               <SelectItem key={recruiter.user_id} value={recruiter.user_id}>
                                 {recruiter.name} {recruiter.email && `(${recruiter.email})`}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="flex gap-2">
                         <Button
                           onClick={handleUpdateRecruiter}
                           disabled={isSubmitting}
                           size="sm"
                           className="gap-2"
                         >
                           <Save className="h-4 w-4" />
                           {isSubmitting ? 'Updating...' : 'Update Recruiter'}
                         </Button>
                         <Button
                           variant="outline"
                           onClick={() => {
                             setIsEditingRecruiter(false);
                             setNewRecruiterId('');
                           }}
                           size="sm"
                         >
                           Cancel
                         </Button>
                       </div>
                     </div>
                   )}
                 </div>
               </CardContent>
             </Card>

            {(request.hiring_manager_comments || canSubmit || canApproveReject || canStartRecruitment || canAssignRecruiter || canRequestRMApproval || canRMApproveReject || canMarkHired) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileSignature className="h-5 w-5" /> Available Actions</CardTitle>
                  <CardDescription>Actions based on current status and your role</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {request.hiring_manager_comments && (
                    <div>
                      <Label className="font-medium">Hiring Manager Comments</Label>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.hiring_manager_comments}</p>
                    </div>
                  )}

                  {canSubmit && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Submit Request</h4>
                      <p className="text-sm text-muted-foreground">Submit this request for hiring manager approval</p>
                      <Button onClick={handleSubmit} disabled={isSubmitting}><FileText className="h-4 w-4 mr-2" /> {isSubmitting ? 'Submitting...' : 'Submit for Approval'}</Button>
                    </div>
                  )}

                  {canApproveReject && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Hiring Manager Review</h4>
                      <p className="text-sm text-muted-foreground">Approve or reject this recruitment request</p>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="comments">Comments (Optional)</Label>
                          <Textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} className="mt-2" />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleApprove} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700"><Check className="h-4 w-4 mr-2" /> {isSubmitting ? 'Processing...' : 'Approve'}</Button>
                          <Button variant="destructive" onClick={handleReject} disabled={isSubmitting}><X className="h-4 w-4 mr-2" /> {isSubmitting ? 'Processing...' : 'Reject'}</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {canStartRecruitment && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Start Recruitment Process</h4>
                      <p className="text-sm text-muted-foreground">Begin the recruitment process for this approved position</p>
                      <Button onClick={handleStartRecruitment} disabled={isSubmitting}><UserPlus className="h-4 w-4 mr-2" /> {isSubmitting ? 'Starting...' : 'Start Recruitment'}</Button>
                    </div>
                  )}

                  {canAssignRecruiter && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Assign Recruiter</h4>
                      <p className="text-sm text-muted-foreground">Select a recruiter to take ownership</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Recruiter</Label>
                           <Select value={selectedRecruiterId} onValueChange={setSelectedRecruiterId}>
                             <SelectTrigger><SelectValue placeholder="Select recruiter" /></SelectTrigger>
                             <SelectContent>
                               {recruiters.map(recruiter => (
                                 <SelectItem key={recruiter.user_id} value={recruiter.user_id}>
                                   {recruiter.name} {recruiter.email && `(${recruiter.email})`}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                          
                        </div>
                      </div>
                      <Button onClick={handleAssignRecruiter} disabled={isSubmitting || !selectedRecruiterId}><UserPlus className="h-4 w-4 mr-2" /> {isSubmitting ? 'Assigning...' : 'Assign Recruiter'}</Button>
                    </div>
                  )}

                  {canRequestRMApproval && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Request Recruitment Manager Approval</h4>
                      <p className="text-sm text-muted-foreground">Move to RM approval to generate an offer</p>
                      <Button onClick={handleRequestRMApproval} disabled={isSubmitting}><FileText className="h-4 w-4 mr-2" /> {isSubmitting ? 'Requesting...' : 'Request Approval'}</Button>
                    </div>
                  )}

                  {canRMApproveReject && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Recruitment Manager Decision</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Final Salary (optional)</Label>
                          <Input type="number" value={rmFinalSalary} onChange={(e) => setRmFinalSalary(e.target.value)} placeholder="e.g., 75000" />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="font-medium">Contract Details (optional)</Label>
                          <Textarea value={rmContractDetails} onChange={(e) => setRmContractDetails(e.target.value)} placeholder="Offer terms, contract notes..." className="min-h-[80px]" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleRMApprove} disabled={isSubmitting}><FileSignature className="h-4 w-4 mr-2" /> {isSubmitting ? 'Approving...' : 'Approve & Generate Contract'}</Button>
                        <Button variant="destructive" onClick={handleRMReject} disabled={isSubmitting}><X className="h-4 w-4 mr-2" /> {isSubmitting ? 'Rejecting...' : 'Reject'}</Button>
                      </div>
                      <div>
                        <Label className="font-medium">Rejection Reason (optional)</Label>
                        <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason for rejection..." className="mt-2" />
                      </div>
                    </div>
                  )}

                  {canMarkHired && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Mark as Hired</h4>
                      <p className="text-sm text-muted-foreground">Link the hired employee (optional) and close the request</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="font-medium">Hired Employee (optional)</Label>
                          <Select value={hiredEmployeeId} onValueChange={setHiredEmployeeId}>
                            <SelectTrigger><SelectValue placeholder="Select existing employee (optional)" /></SelectTrigger>
                            <SelectContent>
                              {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.english_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={handleMarkHired} disabled={isSubmitting}><Check className="h-4 w-4 mr-2" /> {isSubmitting ? 'Completing...' : 'Mark Hired'}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="candidates">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Candidates</CardTitle>
                    <CardDescription>Candidates and assessments for this recruitment request</CardDescription>
                  </div>
                  {canCreateHiringRequest && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all"
                          checked={candidates.length > 0 && selectedCandidateIds.length === candidates.length}
                          onCheckedChange={handleSelectAllCandidates}
                        />
                        <Label htmlFor="select-all" className="text-sm">Select All</Label>
                      </div>
                      <Button 
                        onClick={handleCreateHiringRequest}
                        disabled={isSubmitting || selectedCandidateIds.length === 0}
                        size="sm"
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSubmitting ? 'Creating...' : `Create Hiring Request (${selectedCandidateIds.length})`}
                      </Button>
                    </div>
                  )}
                  {/* Show Add Candidates button for recruiters when there are no candidates but there are assessments */}
                  {request.status === 'in_recruitment_process' && user && user.id === request.recruiter_id && candidates.length === 0 && assessments.length > 0 && (
                    <Button 
                      onClick={() => window.location.href = `/hr/recruitment/candidates?request=${request.id}`}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Candidates
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    Debug: Candidates: {candidates.length}, Can create hiring request: {canCreateHiringRequest.toString()}, 
                    User ID: {user?.id}, Recruiter ID: {request?.recruiter_id}, Status: {request?.status},
                    Can edit recruiter: {canEditRecruiter.toString()}, Has admin: {hasRole('admin').toString()}, 
                    Has HR manager: {hasRole('hr_manager').toString()}, Has super admin: {hasRole('super_admin').toString()}
                  </div>
                )}
                
                {candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">No candidates yet.</p>
                )}
                {candidates.map(candidate => {
                  const assessment = assessments.find(a => a.candidate_id === candidate.id);
                  return (
                    <div key={candidate.id} className="p-3 rounded-md border">
                      <div className="flex items-start gap-3">
                        {canCreateHiringRequest && (
                          <Checkbox
                            checked={selectedCandidateIds.includes(candidate.id)}
                            onCheckedChange={(checked) => handleCandidateSelection(candidate.id, checked as boolean)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{candidate.full_name}</p>
                              <p className="text-xs text-muted-foreground">{candidate.email || ''}</p>
                              {candidate.phone && (
                                <p className="text-xs text-muted-foreground">{candidate.phone}</p>
                              )}
                            </div>
                            <Badge variant="outline">{candidate.status || 'created'}</Badge>
                          </div>
                          {candidate.notes && (
                            <p className="text-sm text-muted-foreground mt-2">{candidate.notes}</p>
                          )}
                          {assessment && (
                            <div className="mt-3 p-2 bg-muted rounded border-l-4 border-primary">
                              <p className="text-sm font-medium">Interview Assessment</p>
                              <div className="text-xs text-muted-foreground mt-1">
                                {assessment.interview_date && (
                                  <span>Date: {new Date(assessment.interview_date).toLocaleDateString()} • </span>
                                )}
                                {assessment.overall_score && (
                                  <span>Score: {assessment.overall_score}/10</span>
                                )}
                              </div>
                              {assessment.recommendation && (
                                <p className="text-sm mt-1">Recommendation: {assessment.recommendation}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {assessments.filter(a => !a.candidate_id).length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Standalone Assessments</h4>
                    {assessments.filter(a => !a.candidate_id).map(a => (
                      <div key={a.id} className="p-3 rounded-md border">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{a.candidate_name}</p>
                            <p className="text-xs text-muted-foreground">{a.candidate_email || ''}</p>
                          </div>
                          <span className="text-xs">{a.interview_date ? new Date(a.interview_date).toLocaleDateString() : ''}</span>
                        </div>
                        {a.overall_score && (
                          <p className="text-sm mt-1">Overall score: {a.overall_score}</p>
                        )}
                        {a.recommendation && (
                          <p className="text-sm text-muted-foreground">Recommendation: {a.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Request Timeline & Activity</CardTitle>
                <CardDescription>Key dates and audit trail</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm"><div className="w-2 h-2 bg-primary rounded-full" /> <span className="font-medium">Request Created</span> <span className="text-muted-foreground">{formatDate(request.created_at)}</span></div>
                  {request.submitted_at && (<div className="flex items-center gap-3 text-sm"><div className="w-2 h-2 bg-primary rounded-full" /> <span className="font-medium">Submitted for Approval</span> <span className="text-muted-foreground">{formatDate(request.submitted_at)}</span></div>)}
                  {request.hiring_manager_approved_at && (<div className="flex items-center gap-3 text-sm"><div className="w-2 h-2 bg-green-500 rounded-full" /> <span className="font-medium">Approved by Hiring Manager</span> <span className="text-muted-foreground">{formatDate(request.hiring_manager_approved_at)}</span></div>)}
                  {request.recruiter_assigned_at && (<div className="flex items-center gap-3 text-sm"><div className="w-2 h-2 bg-blue-500 rounded-full" /> <span className="font-medium">Recruiter Assigned</span> <span className="text-muted-foreground">{formatDate(request.recruiter_assigned_at)}</span></div>)}
                  {request.recruitment_manager_approved_at && (<div className="flex items-center gap-3 text-sm"><div className="w-2 h-2 bg-green-500 rounded-full" /> <span className="font-medium">Approved by Recruitment Manager</span> <span className="text-muted-foreground">{formatDate(request.recruitment_manager_approved_at)}</span></div>)}
                  {request.hired_at && (<div className="flex items-center gap-3 text-sm"><div className="w-2 h-2 bg-green-600 rounded-full" /> <span className="font-medium">Position Filled</span> <span className="text-muted-foreground">{formatDate(request.hired_at)}</span></div>)}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Activity Log</h4>
                  {activities.length === 0 && (
                    <p className="text-sm text-muted-foreground">No activity yet.</p>
                  )}
                  <div className="space-y-2">
                    {activities.map(act => (
                      <div key={act.id} className="p-3 rounded-md border text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{act.activity_type.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-muted-foreground">{new Date(act.created_at).toLocaleString()}</span>
                        </div>
                        {act.activity_details && <p className="text-muted-foreground mt-1">{act.activity_details}</p>}
                        {(act.previous_status || act.new_status) && (
                          <p className="text-xs text-muted-foreground mt-1">{act.previous_status ? statusLabels[act.previous_status] : ''} → {act.new_status ? statusLabels[act.new_status] : ''}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


