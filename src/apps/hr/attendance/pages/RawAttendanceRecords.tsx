import { useState, useEffect } from 'react';
import { ArrowLeft, Database, RefreshCw, CheckCircle, XCircle, Clock, Search, ChevronLeft, ChevronRight, BarChart3, Upload, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';
import { useRawAttendance, RawAttendanceRecord } from '@/hooks/useRawAttendance';
import { useEnhancedRawAttendance } from '@/hooks/useEnhancedRawAttendance';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';
import { RawDataUploadDialog } from '../components/RawDataUploadDialog';
import { toast } from 'sonner';

export default function RawAttendanceRecords() {
  const navigate = useNavigate();
  const { fetchRawData, loading, error, processRawDataRPC, clearAllRawData } = useRawAttendance();
  const { getProcessingDashboard } = useEnhancedRawAttendance();
  const { processRawAttendance, autoApproveAttendance } = useEnhancedAttendance();
  
  const [records, setRecords] = useState<RawAttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<RawAttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [processingInProgress, setProcessingInProgress] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(50);

  const loadRecords = async () => {
    const filters: any = {};
    
    // Only apply processed/unprocessed filters at database level
    // Match status filters will be applied at frontend level
    if (statusFilter === 'processed') filters.processed = true;
    else if (statusFilter === 'unprocessed') filters.processed = false;
    // For match status filters (matched, rejected, unmatched), load all records
    
    if (dateFromFilter) filters.date_from = dateFromFilter;
    if (dateToFilter) filters.date_to = dateToFilter;

    console.log('Loading records with filters:', filters);
    const result = await fetchRawData(filters);
    console.log('Fetch result:', { data: result.data?.length, error: result.error });
    
    if (result.data) {
      setRecords(result.data);
      console.log('Records loaded:', result.data.length);
    } else if (result.error) {
      console.error('Failed to load records:', result.error);
      toast.error('Failed to load raw attendance records: ' + result.error);
    }
  };

  const loadDashboardData = async () => {
    try {
      const result = await getProcessingDashboard();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  useEffect(() => {
    loadRecords();
    loadDashboardData();
  }, [statusFilter, dateFromFilter, dateToFilter]);

  useEffect(() => {
    // Apply search and status filters and reset to first page
    let filtered = records;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.terminal_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter === 'processed') {
      filtered = filtered.filter(record => record.processed === true);
    } else if (statusFilter === 'unprocessed') {
      filtered = filtered.filter(record => record.processed === false);
    } else if (statusFilter === 'matched') {
      filtered = filtered.filter(record => record.match_status === 'matched');
    } else if (statusFilter === 'rejected') {
      filtered = filtered.filter(record => record.match_status === 'rejected');
    } else if (statusFilter === 'unmatched') {
      filtered = filtered.filter(record => !record.match_status || record.match_status === 'unmatched');
    }
    
    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [records, searchTerm, statusFilter]);

  // Calculate pagination
  const totalRecords = filteredRecords.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(parseInt(value));
    setCurrentPage(1);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (processed: boolean) => {
    return processed ? (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3 mr-1" />
        Processed
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <XCircle className="h-3 w-3 mr-1" />
        Unprocessed
      </Badge>
    );
  };

  const handleEnhancedProcessing = async () => {
    setProcessingInProgress(true);
    try {
      await processRawAttendance();
      toast.success('Processing completed successfully');
      await loadRecords();
      await loadDashboardData();
    } catch (error) {
      toast.error('Processing failed');
    } finally {
      setProcessingInProgress(false);
    }
  };

  const handleAutoApprove = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await autoApproveAttendance(today);
      toast.success('Auto-approval completed for today');
      await loadDashboardData();
    } catch (error) {
      toast.error('Auto-approval failed');
    }
  };

  const handleClearRaw = async () => {
    try {
      const res = await clearAllRawData();
      if (res.data) {
        toast.success('All raw records cleared');
        await loadRecords();
        await loadDashboardData();
      } else {
        toast.error(res.error || 'Failed to clear raw records');
      }
    } catch (error) {
      toast.error('Failed to clear raw records');
    }
  };

  // Quick filter functions
  const applyQuickFilter = (filterType: string) => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (filterType) {
      case 'today':
        setDateFromFilter(today);
        setDateToFilter(today);
        break;
      case 'yesterday':
        setDateFromFilter(yesterday);
        setDateToFilter(yesterday);
        break;
      case 'week':
        setDateFromFilter(weekStart);
        setDateToFilter(today);
        break;
      case 'unprocessed':
        setStatusFilter('unprocessed');
        setDateFromFilter('');
        setDateToFilter('');
        break;
      case 'processed':
        setStatusFilter('processed');
        setDateFromFilter('');
        setDateToFilter('');
        break;
      case 'clear':
        setStatusFilter('all');
        setDateFromFilter('');
        setDateToFilter('');
        setSearchTerm('');
        break;
    }
  };

  const processedCount = filteredRecords.filter(r => r.processed).length;
  const unprocessedCount = totalRecords - processedCount;
  const processingRate = dashboardData ? 
    (dashboardData.processedRecords / Math.max(dashboardData.totalRecords, 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/hr/attendance')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Raw Attendance Dashboard</h1>
              <p className="text-muted-foreground">Attendance data processing and management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowUploadDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Raw Data
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Raw Records
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all raw attendance records?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all rows from raw_attendance_data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearRaw}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button 
              variant="outline" 
              onClick={loadRecords}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processingRate.toFixed(1)}%</div>
              <Progress value={processingRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalRecords || 'Loading...'}</div>
              <p className="text-xs text-muted-foreground">
                {unprocessedCount} unprocessed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{processedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Settings className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">ACTIVE</div>
              <p className="text-xs text-muted-foreground">System operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="processing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="processing">Processing Control</TabsTrigger>
            <TabsTrigger value="records">Raw Records</TabsTrigger>
          </TabsList>

          <TabsContent value="processing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Processing Control
                </CardTitle>
                <CardDescription>
                  Process raw attendance data with intelligent matching and business rule validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleEnhancedProcessing}
                      disabled={processingInProgress || loading}
                      className="flex-1"
                    >
                      {processingInProgress ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4 mr-2" />
                          Start Processing
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={handleAutoApprove}
                      disabled={loading}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Auto-Approve Today
                    </Button>
                  </div>

                  {/* Processing Statistics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">
                        {dashboardData?.processedRecords || processedCount}
                      </div>
                      <div className="text-xs text-green-600">Processed</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">
                        {dashboardData?.unprocessedRecords || unprocessedCount}
                      </div>
                      <div className="text-xs text-yellow-600">Pending</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {processingRate.toFixed(0)}%
                      </div>
                      <div className="text-xs text-blue-600">Efficiency</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>Filter raw attendance records by various criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                  {/* Search Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search by name, ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="processed">Processed</SelectItem>
                        <SelectItem value="unprocessed">Unprocessed</SelectItem>
                        <SelectItem value="matched">Matched</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="unmatched">Unmatched</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">From Date</label>
                    <Input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* To Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">To Date</label>
                    <Input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {/* Clear Button */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground opacity-0">Actions</label>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setDateFromFilter('');
                        setDateToFilter('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>

                  {/* Refresh Button */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground opacity-0">Actions</label>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={loadRecords}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Records Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Quick Filters */}
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground mr-2">Quick filters:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter('today')}
                      className="h-8"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter('yesterday')}
                      className="h-8"
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter('week')}
                      className="h-8"
                    >
                      This Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter('unprocessed')}
                      className="h-8"
                    >
                      Unprocessed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickFilter('clear')}
                      className="h-8"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Records per page:</span>
                  <Select value={recordsPerPage.toString()} onValueChange={handleRecordsPerPageChange}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    Loading records...
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-600">
                    Error loading records: {error}
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No records found matching your criteria
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead>Match Status</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>HR Name</TableHead>
                            <TableHead>User ID</TableHead>
                            <TableHead>Clocking Time</TableHead>
                            <TableHead>Terminal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                {getStatusBadge(record.processed)}
                              </TableCell>
                              <TableCell>
                                {record.match_status ? (
                                  <Badge variant={
                                    record.match_status === 'matched' ? 'default' :
                                    record.match_status === 'rejected' ? 'destructive' : 'secondary'
                                  }>
                                    {record.match_status.toUpperCase()}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    {record.hr_name && record.hr_name !== 'Not Registered' ? 'LEGACY' : 'UNKNOWN'}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {record.employee_id}
                              </TableCell>
                              <TableCell>{record.name}</TableCell>
                              <TableCell>
                                {record.hr_name === 'Not Registered' ? (
                                  <Badge variant="destructive" className="text-xs">
                                    Not Registered
                                  </Badge>
                                ) : (
                                  <span className="font-medium text-green-700">
                                    {record.hr_name}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {record.user_id}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {formatDateTime(record.clocking_time)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {record.terminal_description || 'Unknown'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls - Always show if there are records */}
                    {totalRecords > 0 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1} to {Math.min(endIndex, totalRecords)} of {dashboardData?.totalRecords || totalRecords}+ records
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                              let pageNumber;
                              if (totalPages <= 7) {
                                pageNumber = i + 1;
                              } else if (currentPage <= 4) {
                                pageNumber = i + 1;
                              } else if (currentPage >= totalPages - 3) {
                                pageNumber = totalPages - 6 + i;
                              } else {
                                pageNumber = currentPage - 3 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNumber}
                                  variant={currentPage === pageNumber ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handlePageChange(pageNumber)}
                                  className="w-8 h-8"
                                >
                                  {pageNumber}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Upload Dialog */}
        <RawDataUploadDialog 
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
        />
      </div>
    </div>
  );
}