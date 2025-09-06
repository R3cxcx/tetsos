import { useState, useEffect } from 'react';
import { Calendar, Clock, Search, Filter, Download, Eye, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useAttendance } from '@/hooks/useAttendance';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useRefresh } from '@/contexts/RefreshContext';
import { ClockInOutDialog } from '../components/ClockInOutDialog';
import { Label } from '@/components/ui/label';

export default function DailyOverview() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showClockInOut, setShowClockInOut] = useState(false);
  
  const { attendanceRecords, fetchAttendanceRecords, loading } = useAttendance();
  const { attendanceStats, fetchDailyStats } = useEnhancedAttendance();
  const { employees } = useEmployees();
  const { setRefreshFunction } = useRefresh();

  useEffect(() => {
    setRefreshFunction(() => () => fetchAttendanceRecords(selectedDate));
    return () => setRefreshFunction(null);
  }, [setRefreshFunction, fetchAttendanceRecords, selectedDate]);

  useEffect(() => {
    fetchAttendanceRecords(selectedDate);
    fetchDailyStats(selectedDate);
  }, [fetchAttendanceRecords, fetchDailyStats, selectedDate]);

  // Get all employees and their attendance status for the selected date
  const employeeAttendance = employees
    .filter(emp => emp.status === 'active')
    .map(employee => {
      const record = attendanceRecords.find(ar => ar.employee_id === employee.id);
      return {
        employee,
        record,
        status: record ? record.status : 'absent',
        clockIn: record?.clock_in,
        clockOut: record?.clock_out,
        totalHours: record?.total_hours,
        notes: record?.notes
      };
    });

  // Filter employees based on search and status
  const filteredEmployees = employeeAttendance.filter(item => {
    const matchesSearch = 
      item.employee.english_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.employee.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      present: "default",
      absent: "destructive",
      late: "secondary",
      on_leave: "outline",
      half_day: "secondary"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      present: "text-green-600",
      absent: "text-red-600",
      late: "text-orange-600",
      on_leave: "text-blue-600",
      half_day: "text-yellow-600"
    };

    return colors[status] || "text-gray-600";
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatHours = (hours: number | null) => {
    if (!hours) return '-';
    return `${hours.toFixed(2)}h`;
  };

  // Calculate summary stats
  const stats = {
    total: filteredEmployees.length,
    present: filteredEmployees.filter(item => item.status === 'present').length,
    absent: filteredEmployees.filter(item => item.status === 'absent').length,
    late: filteredEmployees.filter(item => item.status === 'late').length,
    onLeave: filteredEmployees.filter(item => item.status === 'on_leave').length,
    halfDay: filteredEmployees.filter(item => item.status === 'half_day').length
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/hr/attendance')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate('/')} className="cursor-pointer flex items-center">
                  <Home className="h-4 w-4" />
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate('/hr')} className="cursor-pointer">
                  HR Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate('/hr/attendance')} className="cursor-pointer">
                  Attendance Management
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Daily Overview</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Daily Overview</h1>
            <p className="text-muted-foreground">
              Attendance status for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowClockInOut(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Clock className="h-4 w-4 mr-2" />
              Clock In/Out
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Date Selector and Filters */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="space-y-2">
            <Label htmlFor="date">Select Date</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="search">Search Employees</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="half_day">Half Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{attendanceStats?.total_employees || stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{attendanceStats?.present_count || stats.present}</div>
              <div className="text-sm text-muted-foreground">Present</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{attendanceStats?.absent_count || stats.absent}</div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{attendanceStats?.late_count || stats.late}</div>
              <div className="text-sm text-muted-foreground">Late</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{attendanceStats?.on_leave_count || stats.onLeave}</div>
              <div className="text-sm text-muted-foreground">On Leave</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">
                {attendanceStats?.attendance_rate ? `${attendanceStats.attendance_rate.toFixed(1)}%` : '0%'}
              </div>
              <div className="text-sm text-muted-foreground">Attendance Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Employee List */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Attendance</CardTitle>
            <CardDescription>
              {filteredEmployees.length} employees found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading attendance data...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No employees found matching the criteria</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredEmployees.map((item) => (
                  <div
                    key={item.employee.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                         <span className="text-sm font-medium text-primary">
                           {item.employee.english_name?.split(' ').map(n => n[0]).join('') || 'N/A'}
                         </span>
                       </div>
                       <div>
                         <div className="font-medium">
                           {item.employee.english_name}
                         </div>
                        <div className="text-sm text-muted-foreground">
                          {item.employee.employee_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">Clock In</div>
                        <div className={`text-sm ${getStatusColor(item.status)}`}>
                          {formatTime(item.clockIn)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Clock Out</div>
                        <div className={`text-sm ${getStatusColor(item.status)}`}>
                          {formatTime(item.clockOut)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Hours</div>
                        <div className={`text-sm ${getStatusColor(item.status)}`}>
                          {formatHours(item.totalHours)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Status</div>
                        {getStatusBadge(item.status)}
                      </div>
                      {item.notes && (
                        <div className="text-center">
                          <div className="text-sm font-medium">Notes</div>
                          <div className="text-sm text-muted-foreground max-w-32 truncate">
                            {item.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clock In/Out Dialog */}
      <ClockInOutDialog 
        open={showClockInOut} 
        onOpenChange={setShowClockInOut} 
      />
    </div>
  );
}
