import { useState, useMemo } from 'react';
import { useRecruitment } from '@/hooks/useRecruitment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Eye, FileText, ArrowLeft, Grid3X3, List, SortAsc, SortDesc, Calendar, DollarSign, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreateRequestDialog } from '../components/CreateRequestDialog';
import { RequestDetailsDialog } from '../components/RequestDetailsDialog';
import { InterviewAssessmentDialog } from '../components/InterviewAssessmentDialog';
import type { RecruitmentRequest } from '@/hooks/useRecruitment';
import { useNavigate } from 'react-router-dom';

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

export default function RequestsIndex() {
  const { requests, loading } = useRecruitment();
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<'created_at' | 'position_title' | 'department' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RecruitmentRequest | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isAssessmentDialogOpen, setIsAssessmentDialogOpen] = useState(false);

  // Get unique departments for filter
  const departments = useMemo(() => {
    const depts = [...new Set(requests.map(r => r.department))];
    return depts.sort();
  }, [requests]);

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    const filtered = requests.filter(request => {
      const matchesSearch = 
        request.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.cost_center.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesDepartment = departmentFilter === 'all' || request.department === departmentFilter;
      
      return matchesSearch && matchesStatus && matchesDepartment;
    });

    // Sort requests
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'position_title':
          aValue = a.position_title.toLowerCase();
          bValue = b.position_title.toLowerCase();
          break;
        case 'department':
          aValue = a.department.toLowerCase();
          bValue = b.department.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
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
  }, [requests, searchTerm, statusFilter, departmentFilter, sortBy, sortOrder]);

  const handleViewDetails = (request: RecruitmentRequest) => {
    setSelectedRequest(request);
    setIsDetailsDialogOpen(true);
  };

  const handleCreateAssessment = (request: RecruitmentRequest) => {
    setSelectedRequest(request);
    setIsAssessmentDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
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

  const canCreateRequest = hasPermission('employees.create');

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
                <h2 className="text-2xl font-bold">Recruitment Requests</h2>
                <p className="text-muted-foreground">Manage hiring requests and recruitment process</p>
              </div>
            </div>
            
            {canCreateRequest && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Button>
            )}
          </div>

      {/* Enhanced Filters and Controls */}
      <div className="space-y-4">
        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search requests, departments, cost centers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending_hiring_manager">Pending Hiring Manager</SelectItem>
                <SelectItem value="approved_by_hiring_manager">Approved by Hiring Manager</SelectItem>
                <SelectItem value="rejected_by_hiring_manager">Rejected by Hiring Manager</SelectItem>
                <SelectItem value="pending_recruiter">Pending Recruiter</SelectItem>
                <SelectItem value="in_recruitment_process">In Recruitment Process</SelectItem>
                <SelectItem value="pending_recruitment_manager">Pending Recruitment Manager</SelectItem>
                <SelectItem value="contract_generated">Contract Generated</SelectItem>
                <SelectItem value="hired">Hired</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

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
            Showing {filteredAndSortedRequests.length} of {requests.length} requests
          </span>
          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSort('created_at')}
              className="h-7 px-2 text-xs"
            >
              Date {getSortIcon('created_at')}
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
              onClick={() => handleSort('status')}
              className="h-7 px-2 text-xs"
            >
              Status {getSortIcon('status')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading requests...</p>
        </div>
      ) : filteredAndSortedRequests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No requests found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || departmentFilter !== 'all' 
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first recruitment request.'
              }
            </p>
            {canCreateRequest && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="mx-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Request
              </Button>
            )}
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
                    <TableHead className="w-[250px]">Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.position_title}</div>
                          {request.salary_range_min && request.salary_range_max && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${request.salary_range_min?.toLocaleString()} - ${request.salary_range_max?.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {request.department}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{request.cost_center}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[request.status]}>
                          {statusLabels[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(request.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(request)}
                            className="h-8 px-2"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          
                          {(request.status === 'approved_by_hiring_manager' || 
                            request.status === 'in_recruitment_process') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreateAssessment(request)}
                              className="h-8 px-2"
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              Assess
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
              {filteredAndSortedRequests.map((request) => (
                <Card key={request.id} className="hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => handleViewDetails(request)}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight truncate">{request.position_title}</CardTitle>
                        <CardDescription className="truncate">{request.department}</CardDescription>
                      </div>
                      <Badge variant={statusColors[request.status]} className="ml-2 flex-shrink-0">
                        {statusLabels[request.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{request.cost_center}</span>
                      </div>
                      {request.salary_range_min && request.salary_range_max && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs">
                            ${request.salary_range_min?.toLocaleString()} - ${request.salary_range_max?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs">{formatDate(request.created_at)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <CreateRequestDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {selectedRequest && (
        <>
          <RequestDetailsDialog
            request={selectedRequest}
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
            onRequestUpdate={setSelectedRequest}
          />
          
          <InterviewAssessmentDialog
            request={selectedRequest}
            open={isAssessmentDialogOpen}
            onOpenChange={setIsAssessmentDialogOpen}
          />
        </>
      )}
        </div>
      </div>
    </div>
  );
}