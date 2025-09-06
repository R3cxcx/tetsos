import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRecruitment } from '@/hooks/useRecruitment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Mail, Phone, Star, Calendar, Eye, ArrowLeft, Grid3X3, List, SortAsc, SortDesc, Building2, User, Filter, Link, Unlink } from 'lucide-react';
import { RequestDetailsDialog } from '../components/RequestDetailsDialog';
import { CreateCandidateDialog } from '../components/CreateCandidateDialog';
import type { RecruitmentRequest } from '@/hooks/useRecruitment';
import type { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';

interface Candidate {
  id: string;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
  interview_date: string | null;
  overall_score: number | null;
  recommendation: string | null;
  recruitment_request_id: string;
  position_title: string;
  department: string;
  request_status: string;
  interviewer_name?: string;
}

export default function CandidatesIndex() {
  const { requests } = useRecruitment();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [recommendationFilter, setRecommendationFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'candidate_name' | 'position_title' | 'department' | 'overall_score' | 'interview_date'>('candidate_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedRequest, setSelectedRequest] = useState<RecruitmentRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCreateCandidateDialogOpen, setIsCreateCandidateDialogOpen] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_assessments')
        .select(`
          id,
          candidate_name,
          candidate_email,
          candidate_phone,
          interview_date,
          overall_score,
          recommendation,
          recruitment_request_id,
          interviewer_id,
          recruitment_requests!inner(
            position_title,
            department,
            status
          )
        `);

      if (error) throw error;

      // Get interviewer details separately
      const interviewerIds = [...new Set(data.map(d => d.interviewer_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', interviewerIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const formattedCandidates = data.map((assessment: {
        id: string;
        candidate_name: string;
        candidate_email: string | null;
        candidate_phone: string | null;
        interview_date: string | null;
        overall_score: number | null;
        recommendation: string | null;
        recruitment_request_id: string;
        interviewer_id: string;
        recruitment_requests: {
          position_title: string;
          department: string;
          status: string;
        };
      }) => {
        const profile = profilesMap.get(assessment.interviewer_id);
        return {
          id: assessment.id,
          candidate_name: assessment.candidate_name,
          candidate_email: assessment.candidate_email,
          candidate_phone: assessment.candidate_phone,
          interview_date: assessment.interview_date,
          overall_score: assessment.overall_score,
          recommendation: assessment.recommendation,
          recruitment_request_id: assessment.recruitment_request_id,
          position_title: assessment.recruitment_requests.position_title,
          department: assessment.recruitment_requests.department,
          request_status: assessment.recruitment_requests.status,
          interviewer_name: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown'
            : 'Unknown'
        };
      });

      setCandidates(formattedCandidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique departments and recommendations for filters
  const departments = useMemo(() => {
    const depts = [...new Set(candidates.map(c => c.department))];
    return depts.sort();
  }, [candidates]);

  const recommendations = useMemo(() => {
    const recs = [...new Set(candidates.map(c => c.recommendation).filter(Boolean))];
    return recs.sort((a, b) => {
      const order = ['strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_reject'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [candidates]);

  // Filter and sort candidates
  const filteredAndSortedCandidates = useMemo(() => {
    const filtered = candidates.filter(candidate => {
      const matchesSearch = 
        candidate.candidate_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (candidate.candidate_email && candidate.candidate_email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDepartment = departmentFilter === 'all' || candidate.department === departmentFilter;
      const matchesRecommendation = recommendationFilter === 'all' || candidate.recommendation === recommendationFilter;
      
      return matchesSearch && matchesDepartment && matchesRecommendation;
    });

    // Sort candidates
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case 'candidate_name':
          aValue = a.candidate_name.toLowerCase();
          bValue = b.candidate_name.toLowerCase();
          break;
        case 'position_title':
          aValue = a.position_title.toLowerCase();
          bValue = b.position_title.toLowerCase();
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'overall_score':
          aValue = a.overall_score || 0;
          bValue = b.overall_score || 0;
          break;
        case 'interview_date':
          aValue = a.interview_date ? new Date(a.interview_date).getTime() : 0;
          bValue = b.interview_date ? new Date(b.interview_date).getTime() : 0;
          break;
        default:
                return 0;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  return sorted;
  }, [candidates, searchTerm, departmentFilter, recommendationFilter, sortBy, sortOrder]);

  const handleViewRequest = (candidate: Candidate) => {
    const request = requests.find(r => r.id === candidate.recruitment_request_id);
    if (request) {
      setSelectedRequest(request);
      setIsDetailsDialogOpen(true);
    }
  };

  const getRecommendationColor = (recommendation: string | null) => {
    switch (recommendation) {
      case 'strongly_recommend':
        return 'default';
      case 'recommend':
        return 'default';
      case 'neutral':
        return 'secondary';
      case 'not_recommend':
        return 'destructive';
      case 'strongly_reject':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getRecommendationLabel = (recommendation: string | null) => {
    switch (recommendation) {
      case 'strongly_recommend':
        return 'Strongly Recommend';
      case 'recommend':
        return 'Recommend';
      case 'neutral':
        return 'Neutral';
      case 'not_recommend':
        return 'Not Recommend';
      case 'strongly_reject':
        return 'Strongly Reject';
      default:
        return recommendation || 'No recommendation';
    }
  };

  const formatDate = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleDateString() : 'Not scheduled';
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/hr/recruitment')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Overview
              </Button>
              <div>
                <h2 className="text-2xl font-bold">Candidates</h2>
                <p className="text-muted-foreground">View all candidates and their linked recruitment requests</p>
              </div>
            </div>
            
            <Button onClick={() => setIsCreateCandidateDialogOpen(true)} className="gap-2">
              <User className="h-4 w-4" />
              Add New Candidate
            </Button>
          </div>

          {/* Enhanced Filters and Controls */}
          <div className="space-y-4">
            {/* Search and View Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search candidates, positions, departments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-48">
                    <Building2 className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by recommendation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Recommendations</SelectItem>
                    {recommendations.map(rec => (
                      <SelectItem key={rec} value={rec}>
                        {rec === 'strongly_recommend' && 'Strongly Recommend'}
                        {rec === 'recommend' && 'Recommend'}
                        {rec === 'neutral' && 'Neutral'}
                        {rec === 'not_recommend' && 'Not Recommend'}
                        {rec === 'strongly_reject' && 'Strongly Reject'}
                        {!['strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_reject'].includes(rec) && rec}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="h-9 px-3"
                >
                  <List className="h-4 w-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-9 px-3"
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Grid
                </Button>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Showing {filteredAndSortedCandidates.length} of {candidates.length} candidates
              </span>
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('candidate_name')}
                  className="h-7 px-2 text-xs"
                >
                  Name {getSortIcon('candidate_name')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('position_title')}
                  className="h-7 px-2 text-xs"
                >
                  Position {getSortIcon('position_title')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('department')}
                  className="h-7 px-2 text-xs"
                >
                  Department {getSortIcon('department')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('overall_score')}
                  className="h-7 px-2 text-xs"
                >
                  Score {getSortIcon('overall_score')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('interview_date')}
                  className="h-7 px-2 text-xs"
                >
                  Date {getSortIcon('interview_date')}
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading candidates...</p>
            </div>
          ) : filteredAndSortedCandidates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <User className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || departmentFilter !== 'all' || recommendationFilter !== 'all' 
                    ? 'Try adjusting your filters or search terms.'
                    : 'No candidates have been interviewed yet.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Table View */}
              {viewMode === 'table' && (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Candidate</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Recommendation</TableHead>
                        <TableHead>Interview Date</TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedCandidates.map((candidate) => (
                        <TableRow key={candidate.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{candidate.candidate_name}</span>
                                {candidate.recruitment_request_id ? (
                                  <Badge variant="outline" className="text-xs">
                                    <Link className="h-3 w-3 mr-1" />
                                    Linked
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    <Unlink className="h-3 w-3 mr-1" />
                                    Independent
                                  </Badge>
                                )}
                              </div>
                              {candidate.candidate_email && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {candidate.candidate_email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{candidate.position_title}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {candidate.department}
                            </div>
                          </TableCell>
                          <TableCell>
                            {candidate.overall_score ? (
                              <div className="flex items-center gap-2">
                                <Star className="h-4 w-4 text-yellow-500" />
                                <span className={`font-medium ${getScoreColor(candidate.overall_score)}`}>
                                  {candidate.overall_score}/10
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No score</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.recommendation ? (
                              <Badge variant={getRecommendationColor(candidate.recommendation)}>
                                {getRecommendationLabel(candidate.recommendation)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No recommendation</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{formatDate(candidate.interview_date)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewRequest(candidate)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              
                              {!candidate.recruitment_request_id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2"
                                  title="Link to recruitment request"
                                >
                                  <Link className="h-3 w-3 mr-1" />
                                  Link
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}

              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredAndSortedCandidates.map((candidate) => (
                    <Card key={candidate.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                          onClick={() => handleViewRequest(candidate)}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base leading-tight truncate">{candidate.candidate_name}</CardTitle>
                            <CardDescription className="truncate">{candidate.position_title}</CardDescription>
                          </div>
                          {candidate.overall_score && (
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className={`text-xs font-medium ${getScoreColor(candidate.overall_score)}`}>
                                {candidate.overall_score}/10
                              </span>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{candidate.department}</span>
                          </div>
                          
                          {candidate.candidate_email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs truncate">{candidate.candidate_email}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs">{formatDate(candidate.interview_date)}</span>
                          </div>
                          
                          {candidate.recommendation && (
                            <div className="flex items-center gap-2">
                              <Badge variant={getRecommendationColor(candidate.recommendation)} className="text-xs">
                                {getRecommendationLabel(candidate.recommendation)}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

      {selectedRequest && (
        <RequestDetailsDialog
          request={selectedRequest}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          onRequestUpdate={setSelectedRequest}
        />
      )}

      <CreateCandidateDialog
        open={isCreateCandidateDialogOpen}
        onOpenChange={setIsCreateCandidateDialogOpen}
        onCandidateCreated={fetchCandidates}
      />
        </div>
      </div>
    </div>
  );
}