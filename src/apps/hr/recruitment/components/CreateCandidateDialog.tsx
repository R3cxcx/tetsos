import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRecruitment } from '@/hooks/useRecruitment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Mail, Phone, Calendar, Building2, FileText, Link, Unlink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CreateCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCandidateCreated: () => void;
}

interface CandidateFormData {
  candidate_name: string;
  candidate_email: string;
  candidate_phone: string;
  interview_date: string;
  technical_skills_score: number;
  communication_score: number;
  experience_score: number;
  cultural_fit_score: number;
  overall_score: number;
  technical_notes: string;
  communication_notes: string;
  experience_notes: string;
  cultural_fit_notes: string;
  additional_comments: string;
  recommendation: 'strongly_recommend' | 'recommend' | 'neutral' | 'not_recommend' | 'strongly_reject';
  recruitment_request_id?: string;
}

export function CreateCandidateDialog({ open, onOpenChange, onCandidateCreated }: CreateCandidateDialogProps) {
  const { requests } = useRecruitment();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [linkMode, setLinkMode] = useState<'linked' | 'independent'>('linked');
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [formData, setFormData] = useState<CandidateFormData>({
    candidate_name: '',
    candidate_email: '',
    candidate_phone: '',
    interview_date: '',
    technical_skills_score: 0,
    communication_score: 0,
    experience_score: 0,
    cultural_fit_score: 0,
    overall_score: 0,
    technical_notes: '',
    communication_notes: '',
    experience_notes: '',
    cultural_fit_notes: '',
    additional_comments: '',
            recommendation: 'neutral' as const
  });

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        candidate_name: '',
        candidate_email: '',
        candidate_phone: '',
        interview_date: '',
        technical_skills_score: 0,
        communication_score: 0,
        experience_score: 0,
        cultural_fit_score: 0,
        overall_score: 0,
        technical_notes: '',
        communication_notes: '',
        experience_notes: '',
        cultural_fit_notes: '',
        additional_comments: '',
        recommendation: 'neutral' as const
      });
      setSelectedRequest('');
      setLinkMode('linked');
    }
  }, [open]);

  // Calculate overall score when individual scores change
  useEffect(() => {
    const scores = [
      formData.technical_skills_score,
      formData.communication_score,
      formData.experience_score,
      formData.cultural_fit_score
    ].filter(score => score > 0);
    
    if (scores.length > 0) {
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      setFormData(prev => ({ ...prev, overall_score: Math.round(average * 10) / 10 }));
    }
  }, [formData.technical_skills_score, formData.communication_score, formData.experience_score, formData.cultural_fit_score]);

  const handleInputChange = (field: keyof CandidateFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.candidate_name.trim()) {
        toast({
          title: "Validation Error",
          description: "Candidate name is required",
          variant: "destructive"
        });
        return;
      }

      if (linkMode === 'linked' && !selectedRequest) {
        toast({
          title: "Validation Error",
          description: "Please select a recruitment request",
          variant: "destructive"
        });
        return;
      }

      // For independent candidates, we need to create a placeholder request first
      let finalRecruitmentRequestId = selectedRequest;
      
      if (linkMode === 'independent') {
        // Create a placeholder recruitment request for independent candidates
        const placeholderRequestData = {
          requested_by: user?.id,
          position_title: `Independent Candidate: ${formData.candidate_name}`,
          department: 'TBD',
          cost_center: 'TBD',
          job_description: 'Independent candidate - position to be determined',
          headcount_increase: false,
          status: 'draft' as const
        };

        const { data: placeholderRequest, error: placeholderError } = await supabase
          .from('recruitment_requests')
          .insert(placeholderRequestData)
          .select()
          .single();

        if (placeholderError) {
          console.error('Error creating placeholder request:', placeholderError);
          toast({
            title: "Error",
            description: "Failed to create placeholder request for independent candidate",
            variant: "destructive"
          });
          return;
        }

        finalRecruitmentRequestId = placeholderRequest.id;
      }

      // Create candidate data
      const candidateData = {
        candidate_name: formData.candidate_name.trim(),
        candidate_email: formData.candidate_email.trim() || null,
        candidate_phone: formData.candidate_phone.trim() || null,
        interview_date: formData.interview_date || null,
        technical_skills_score: formData.technical_skills_score || null,
        communication_score: formData.communication_score || null,
        experience_score: formData.experience_score || null,
        cultural_fit_score: formData.cultural_fit_score || null,
        overall_score: formData.overall_score || null,
        technical_notes: formData.technical_notes.trim() || null,
        communication_notes: formData.communication_notes.trim() || null,
        experience_notes: formData.experience_notes.trim() || null,
        cultural_fit_notes: formData.cultural_fit_notes.trim() || null,
        additional_comments: formData.additional_comments.trim() || null,
        recommendation: formData.recommendation,
        recruitment_request_id: finalRecruitmentRequestId,
        interviewer_id: user?.id
      };

      // Insert candidate
      const { data, error } = await supabase
        .from('interview_assessments')
        .insert([candidateData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Candidate ${formData.candidate_name} has been added successfully`,
      });

      onCandidateCreated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating candidate:', error);
      toast({
        title: "Error",
        description: "Failed to create candidate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const activeRequests = requests.filter(r => 
    ['approved_by_hiring_manager', 'in_recruitment_process', 'pending_recruitment_manager'].includes(r.status)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Add New Candidate
          </DialogTitle>
          <DialogDescription>
            Create a new candidate profile with interview assessment details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Link Mode Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium">Link Mode:</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={linkMode === 'linked' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLinkMode('linked')}
                  className="gap-2"
                >
                  <Link className="h-4 w-4" />
                  Link to Request
                </Button>
                <Button
                  type="button"
                  variant={linkMode === 'independent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLinkMode('independent')}
                  className="gap-2"
                >
                  <Unlink className="h-4 w-4" />
                  Independent
                </Button>
              </div>
            </div>

            {linkMode === 'linked' && (
              <div className="space-y-3">
                <Label htmlFor="request-select">Select Recruitment Request</Label>
                <Select value={selectedRequest} onValueChange={setSelectedRequest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a recruitment request" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeRequests.map((request) => (
                      <SelectItem key={request.id} value={request.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.position_title}</span>
                          <Badge variant="outline" className="text-xs">
                            {request.department}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedRequest && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Selected Request Details</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {(() => {
                        const request = requests.find(r => r.id === selectedRequest);
                        if (!request) return null;
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{request.position_title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span>{request.department}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Status:</span>
                              <Badge variant="outline">{request.status.replace(/_/g, ' ')}</Badge>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {linkMode === 'independent' && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <p className="text-sm text-blue-800">
                    <Unlink className="h-4 w-4 inline mr-2" />
                    This candidate will be created independently. You can link them to a recruitment request later.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Candidate Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="candidate_name">Candidate Name *</Label>
              <Input
                id="candidate_name"
                value={formData.candidate_name}
                onChange={(e) => handleInputChange('candidate_name', e.target.value)}
                placeholder="Enter candidate's full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate_email">Email</Label>
              <Input
                id="candidate_email"
                type="email"
                value={formData.candidate_email}
                onChange={(e) => handleInputChange('candidate_email', e.target.value)}
                placeholder="candidate@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="candidate_phone">Phone</Label>
              <Input
                id="candidate_phone"
                value={formData.candidate_phone}
                onChange={(e) => handleInputChange('candidate_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interview_date">Interview Date</Label>
              <Input
                id="interview_date"
                type="date"
                value={formData.interview_date}
                onChange={(e) => handleInputChange('interview_date', e.target.value)}
              />
            </div>
          </div>

          {/* Assessment Scores */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Assessment Scores (1-10)</Label>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="technical_skills_score">Technical Skills</Label>
                <Input
                  id="technical_skills_score"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.technical_skills_score || ''}
                  onChange={(e) => handleInputChange('technical_skills_score', parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="communication_score">Communication</Label>
                <Input
                  id="communication_score"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.communication_score || ''}
                  onChange={(e) => handleInputChange('communication_score', parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience_score">Experience</Label>
                <Input
                  id="experience_score"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.experience_score || ''}
                  onChange={(e) => handleInputChange('experience_score', parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cultural_fit_score">Cultural Fit</Label>
                <Input
                  id="cultural_fit_score"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.cultural_fit_score || ''}
                  onChange={(e) => handleInputChange('cultural_fit_score', parseInt(e.target.value) || 0)}
                  className="text-center"
                />
              </div>
            </div>

            {/* Overall Score Display */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Overall Score:</Label>
              <span className={`text-lg font-bold ${getScoreColor(formData.overall_score)}`}>
                {formData.overall_score > 0 ? formData.overall_score.toFixed(1) : 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">/ 10</span>
            </div>
          </div>

          {/* Assessment Notes */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Assessment Notes</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="technical_notes">Technical Skills Notes</Label>
                <Textarea
                  id="technical_notes"
                  value={formData.technical_notes}
                  onChange={(e) => handleInputChange('technical_notes', e.target.value)}
                  placeholder="Technical skills assessment notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="communication_notes">Communication Notes</Label>
                <Textarea
                  id="communication_notes"
                  value={formData.communication_notes}
                  onChange={(e) => handleInputChange('communication_notes', e.target.value)}
                  placeholder="Communication assessment notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience_notes">Experience Notes</Label>
                <Textarea
                  id="experience_notes"
                  value={formData.experience_notes}
                  onChange={(e) => handleInputChange('experience_notes', e.target.value)}
                  placeholder="Experience assessment notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cultural_fit_notes">Cultural Fit Notes</Label>
                <Textarea
                  id="cultural_fit_notes"
                  value={formData.cultural_fit_notes}
                  onChange={(e) => handleInputChange('cultural_fit_notes', e.target.value)}
                  placeholder="Cultural fit assessment notes..."
                  rows={3}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_comments">Additional Comments</Label>
              <Textarea
                id="additional_comments"
                value={formData.additional_comments}
                onChange={(e) => handleInputChange('additional_comments', e.target.value)}
                placeholder="Any additional comments or observations..."
                rows={3}
              />
            </div>
          </div>

          {/* Recommendation */}
          <div className="space-y-2">
            <Label htmlFor="recommendation">Recommendation</Label>
            <Select value={formData.recommendation} onValueChange={(value) => handleInputChange('recommendation', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strongly_recommend">Strongly Recommend</SelectItem>
                <SelectItem value="recommend">Recommend</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="not_recommend">Not Recommend</SelectItem>
                <SelectItem value="strongly_reject">Strongly Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Candidate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
