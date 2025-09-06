import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecruitment } from '@/hooks/useRecruitment';
import { useAuth } from '@/contexts/AuthContext';
import { RecruitmentRequest } from '@/hooks/useRecruitment';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, UserPlus, FileText, Calendar, DollarSign, FileSignature } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';

interface RequestDetailsDialogProps {
  request: RecruitmentRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestUpdate: (request: RecruitmentRequest) => void;
}

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
} as const;

export function RequestDetailsDialog({ 
  request, 
  open, 
  onOpenChange, 
  onRequestUpdate 
}: RequestDetailsDialogProps) {
  const navigate = useNavigate();
  const { 
    submitRequest, 
    approveByHiringManager, 
    rejectByHiringManager,
    startRecruitmentProcess,
    updateRequest,
    assignRecruiter,
    requestRecruitmentManagerApproval,
    approveByRecruitmentManager,
    rejectRequest,
    markHired,
  } = useRecruitment();
  const { user, hasRole, hasPermission } = useAuth();
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recruiters, setRecruiters] = useState<{ user_id: string; name: string; email: string | null }[]>([]);
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string>('');
  const [rmFinalSalary, setRmFinalSalary] = useState<string>('');
  const [rmContractDetails, setRmContractDetails] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [employees, setEmployees] = useState<{ id: string; english_name: string }[]>([]);
  const [hiredEmployeeId, setHiredEmployeeId] = useState<string>('');

  useEffect(() => {
    if (open && request?.id) {
      navigate(`/hr/recruitment/requests/${request.id}`);
      // Close the dialog in parent to keep state consistent
      onOpenChange(false);
    }
  }, [open, request?.id, navigate, onOpenChange]);

  // Reset comments when dialog opens
  useEffect(() => {
    if (open) {
      setComments('');
      setSelectedRecruiterId('');
      setRmFinalSalary('');
      setRmContractDetails('');
      setRejectionReason('');
      setHiredEmployeeId('');
    }
  }, [open]);

  useEffect(() => {
    const loadAuxiliaryData = async () => {
      try {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('role', ['hr_manager', 'hr_staff', 'recruiter']);
        if (rolesError) throw rolesError;

        const userIds = Array.from(new Set((rolesData || []).map(r => r.user_id)));
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', userIds);
          if (profilesError) throw profilesError;
          setRecruiters(
            (profilesData || [])
              .map(p => ({
                user_id: p.user_id,
                name: [p.first_name, p.last_name].filter(Boolean).join(' ') || (p.email || 'User'),
                email: p.email,
              }))
              .sort((a, b) => a.name.localeCompare(b.name))
          );
        } else {
          setRecruiters([]);
        }

        const { data: employeesData, error: employeesError } = await supabase
          .rpc('get_employees_basic_data');
        if (employeesError) throw employeesError;
        setEmployees((employeesData || []).map(emp => ({
          id: emp.id,
          english_name: emp.english_name
        })));
      } catch (err) {
        console.error('Failed to load auxiliary data:', err);
      }
    };

    if (open) {
      loadAuxiliaryData();
    }
  }, [open]);

  // Don't render anything if not open
  if (!open) {
    return null;
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified';
    return `$${amount.toLocaleString()}`;
  };

  const canSubmit = user?.id === request.requested_by && request.status === 'draft';
  const isHiringManagerForRequest = user?.id && request.hiring_manager_id && user.id === request.hiring_manager_id;
  const canApproveReject = request.status === 'pending_hiring_manager' && 
    (hasRole('admin') || hasRole('super_admin') || Boolean(isHiringManagerForRequest));
  const canStartRecruitment = (request.status === 'approved_by_hiring_manager' || request.status === 'pending_recruiter') && 
    (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager') || user?.id === request.recruiter_id);
  const canAssignRecruiter = (request.status === 'approved_by_hiring_manager' || request.status === 'pending_recruiter') &&
    (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager'));
  const canRequestRMApproval = request.status === 'in_recruitment_process' &&
    (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager') || user?.id === request.recruiter_id);
  const canRMApproveReject = request.status === 'pending_recruitment_manager' &&
    (hasRole('admin') || hasRole('super_admin') || user?.id === request.recruitment_manager_id);
  const canMarkHired = request.status === 'contract_generated' &&
    (hasRole('admin') || hasRole('super_admin') || hasRole('hr_manager'));

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await submitRequest(request.id);
      const updatedRequest = { ...request, status: 'pending_hiring_manager' as const };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to submit request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await approveByHiringManager(request.id, comments);
      const updatedRequest = { 
        ...request, 
        status: 'approved_by_hiring_manager' as const,
        hiring_manager_comments: comments 
      };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to approve request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsSubmitting(true);
      await rejectByHiringManager(request.id, comments);
      const updatedRequest = { 
        ...request, 
        status: 'rejected_by_hiring_manager' as const,
        hiring_manager_comments: comments 
      };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to reject request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRecruitment = async () => {
    try {
      setIsSubmitting(true);
      await startRecruitmentProcess(request.id);
      const updatedRequest = { ...request, status: 'in_recruitment_process' as const };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to start recruitment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRecruiter = async () => {
    try {
      setIsSubmitting(true);
      if (!selectedRecruiterId) return;
      await assignRecruiter(request.id, selectedRecruiterId);
      const updatedRequest = { 
        ...request, 
        status: 'pending_recruiter' as const,
        recruiter_id: selectedRecruiterId,
        recruiter_assigned_at: new Date().toISOString(),
      };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to assign recruiter:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestRMApproval = async () => {
    try {
      setIsSubmitting(true);
      await requestRecruitmentManagerApproval(request.id);
      const updatedRequest = { ...request, status: 'pending_recruitment_manager' as const };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to request RM approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRMApprove = async () => {
    try {
      setIsSubmitting(true);
      const salaryNum = rmFinalSalary ? Number(rmFinalSalary) : undefined;
      await approveByRecruitmentManager(request.id, salaryNum, rmContractDetails || undefined);
      const updatedRequest = { 
        ...request, 
        status: 'contract_generated' as const,
        final_salary: salaryNum,
        contract_details: rmContractDetails || undefined,
      };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to approve by RM:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRMReject = async () => {
    try {
      setIsSubmitting(true);
      await rejectRequest(request.id, rejectionReason || undefined);
      const updatedRequest = { 
        ...request, 
        status: 'rejected' as const,
      };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to reject by RM:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkHired = async () => {
    try {
      setIsSubmitting(true);
      await markHired(request.id, hiredEmployeeId || undefined);
      const updatedRequest = { 
        ...request, 
        status: 'hired' as const,
        hired_employee_id: hiredEmployeeId || undefined,
        hired_at: new Date().toISOString(),
      };
      onRequestUpdate(updatedRequest);
    } catch (error) {
      console.error('Failed to mark hired:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-2xl">{request.position_title}</DialogTitle>
              <DialogDescription className="text-lg">
                {request.department} • {request.cost_center}
              </DialogDescription>
            </div>
            <Badge variant={statusColors[request.status]} className="text-sm">
              {statusLabels[request.status]}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Position Information
                </CardTitle>
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
                    <p className="text-sm text-muted-foreground">
                      {formatDate(request.expected_start_date)}
                    </p>
                  </div>
                </div>

                {request.job_description && (
                  <div>
                    <Label className="font-medium">Job Description</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request.job_description}
                    </p>
                  </div>
                )}

                {request.required_qualifications && (
                  <div>
                    <Label className="font-medium">Required Qualifications</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request.required_qualifications}
                    </p>
                  </div>
                )}

                {request.preferred_qualifications && (
                  <div>
                    <Label className="font-medium">Preferred Qualifications</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request.preferred_qualifications}
                    </p>
                  </div>
                )}

                {request.justification && (
                  <div>
                    <Label className="font-medium">Business Justification</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {request.justification}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compensation */}
            {(request.salary_range_min || request.salary_range_max) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Compensation
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(request.final_salary)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hiring Manager Comments */}
            {request.hiring_manager_comments && (
              <Card>
                <CardHeader>
                  <CardTitle>Hiring Manager Comments</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {request.hiring_manager_comments}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Available Actions */}
            {(canSubmit || canApproveReject || canStartRecruitment || canAssignRecruiter || canRequestRMApproval || canRMApproveReject || canMarkHired) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5" />
                    Available Actions
                  </CardTitle>
                  <CardDescription>
                    Actions available based on current status and your role
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Submit Request */}
                  {canSubmit && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Submit Request</h4>
                      <p className="text-sm text-muted-foreground">Submit this request for hiring manager approval</p>
                      <Button onClick={handleSubmit} disabled={isSubmitting}>
                        <FileText className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
                      </Button>
                    </div>
                  )}

                  {/* Hiring Manager Actions */}
                  {canApproveReject && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Hiring Manager Review</h4>
                      <p className="text-sm text-muted-foreground">Review and approve/reject this recruitment request</p>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="comments">Comments (Optional)</Label>
                          <Textarea
                            id="comments"
                            placeholder="Add any comments about this request..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleApprove} 
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Processing...' : 'Approve'}
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={handleReject} 
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Processing...' : 'Reject'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Start Recruitment */}
                  {canStartRecruitment && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Start Recruitment Process</h4>
                      <p className="text-sm text-muted-foreground">Begin the recruitment process for this approved position</p>
                      <Button onClick={handleStartRecruitment} disabled={isSubmitting}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Starting...' : 'Start Recruitment'}
                      </Button>
                    </div>
                  )}

                  {/* Assign Recruiter */}
                  {canAssignRecruiter && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Assign Recruiter</h4>
                      <p className="text-sm text-muted-foreground">Select a recruiter to take ownership of this request</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="font-medium">Recruiter</Label>
                            <Select value={selectedRecruiterId} onValueChange={setSelectedRecruiterId}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recruiter" />
                              </SelectTrigger>
                              <SelectContent>
                                {recruiters.map(r => (
                                  <SelectItem key={r.user_id} value={r.user_id}>
                                    {r.name} {r.email ? `(${r.email})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button onClick={handleAssignRecruiter} disabled={isSubmitting || !selectedRecruiterId}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          {isSubmitting ? 'Assigning...' : 'Assign Recruiter'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Request RM Approval */}
                  {canRequestRMApproval && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Request Recruitment Manager Approval</h4>
                      <p className="text-sm text-muted-foreground">Move to RM approval when ready to generate an offer/contract</p>
                      <Button onClick={handleRequestRMApproval} disabled={isSubmitting}>
                        <FileText className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Requesting...' : 'Request Approval'}
                      </Button>
                    </div>
                  )}

                  {/* RM Approve/Reject */}
                  {canRMApproveReject && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Recruitment Manager Decision</h4>
                      <p className="text-sm text-muted-foreground">Approve and generate contract or reject the request</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="font-medium">Final Salary (optional)</Label>
                            <Input 
                              type="number" 
                              value={rmFinalSalary}
                              onChange={(e) => setRmFinalSalary(e.target.value)}
                              placeholder="e.g., 75000"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Label className="font-medium">Contract Details (optional)</Label>
                            <Textarea 
                              value={rmContractDetails}
                              onChange={(e) => setRmContractDetails(e.target.value)}
                              placeholder="Offer terms, contract notes..."
                              className="min-h-[80px]"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleRMApprove} disabled={isSubmitting}>
                            <FileSignature className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Approving...' : 'Approve & Generate Contract'}
                          </Button>
                          <Button variant="destructive" onClick={handleRMReject} disabled={isSubmitting}>
                            <X className="h-4 w-4 mr-2" />
                            {isSubmitting ? 'Rejecting...' : 'Reject'}
                          </Button>
                        </div>
                        <div>
                          <Label className="font-medium">Rejection Reason (optional)</Label>
                          <Textarea 
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mark Hired */}
                  {canMarkHired && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Mark as Hired</h4>
                      <p className="text-sm text-muted-foreground">Link the hired employee (optional) and close the request</p>
                      <div className="space-y-3">
                        <div>
                          <Label className="font-medium">Hired Employee (optional)</Label>
                          <Select value={hiredEmployeeId} onValueChange={setHiredEmployeeId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select existing employee (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>
                                  {emp.english_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleMarkHired} disabled={isSubmitting}>
                          <Check className="h-4 w-4 mr-2" />
                          {isSubmitting ? 'Completing...' : 'Mark Hired'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Request Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="font-medium">Request Created</span>
                    <span className="text-muted-foreground">{formatDate(request.created_at)}</span>
                  </div>
                  
                  {request.submitted_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-medium">Submitted for Approval</span>
                      <span className="text-muted-foreground">{formatDate(request.submitted_at)}</span>
                    </div>
                  )}
                  
                  {request.hiring_manager_approved_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Approved by Hiring Manager</span>
                      <span className="text-muted-foreground">{formatDate(request.hiring_manager_approved_at)}</span>
                    </div>
                  )}

                  {request.recruiter_assigned_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Recruiter Assigned</span>
                      <span className="text-muted-foreground">{formatDate(request.recruiter_assigned_at)}</span>
                    </div>
                  )}

                  {request.recruitment_manager_approved_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Approved by Recruitment Manager</span>
                      <span className="text-muted-foreground">{formatDate(request.recruitment_manager_approved_at)}</span>
                    </div>
                  )}

                  {request.hired_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="font-medium">Position Filled</span>
                      <span className="text-muted-foreground">{formatDate(request.hired_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}