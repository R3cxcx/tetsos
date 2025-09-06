import { useState, useEffect } from 'react';
import { Clock, Users, Calendar, TrendingUp, AlertCircle, CheckCircle, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useRefresh } from '@/contexts/RefreshContext';
import { ClockInOutDialog } from '../components/ClockInOutDialog';

export default function ClockInOut() {
  const navigate = useNavigate();
  const [showClockInOut, setShowClockInOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { attendanceStats, attendanceRecords, fetchAttendanceStats } = useAttendance();
  const { employees } = useEmployees();
  const { setRefreshFunction } = useRefresh();

  useEffect(() => {
    setRefreshFunction(() => fetchAttendanceStats);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction, fetchAttendanceStats]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  
  // Get today's attendance summary
  const todayStats = {
    total: employees.filter(emp => emp.status === 'active').length,
    present: attendanceRecords.filter(ar => ar.date === today && ar.clock_in).length,
    absent: employees.filter(emp => emp.status === 'active').length - 
            attendanceRecords.filter(ar => ar.date === today && ar.clock_in).length,
    late: attendanceRecords.filter(ar => ar.date === today && ar.status === 'late').length,
    onLeave: attendanceRecords.filter(ar => ar.date === today && ar.status === 'on_leave').length,
    working: attendanceRecords.filter(ar => ar.date === today && ar.clock_in && !ar.clock_out).length
  };

  // Get recent clock in/out activities
  const recentActivities = attendanceRecords
    .filter(ar => ar.date === today)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 10);

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

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.english_name : 'Unknown Employee';
  };

  const getEmployeeId = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? employee.employee_id : 'Unknown ID';
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
                <BreadcrumbPage>Clock In/Out</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Clock In/Out Management</h1>
            <p className="text-muted-foreground">Manage employee attendance and working hours</p>
          </div>
          <Button 
            onClick={() => setShowClockInOut(true)}
            className="bg-primary hover:bg-primary/90 text-lg px-6 py-3"
          >
            <Clock className="h-6 w-6 mr-2" />
            Clock In/Out
          </Button>
        </div>

        {/* Current Time Display */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-6xl font-mono font-bold text-primary mb-2">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-xl text-muted-foreground">
                {currentTime.toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <div className="grid gap-4 md:grid-cols-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{todayStats.total}</div>
              <div className="text-sm text-muted-foreground">Total Employees</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{todayStats.present}</div>
              <div className="text-sm text-muted-foreground">Present Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{todayStats.absent}</div>
              <div className="text-sm text-muted-foreground">Absent Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{todayStats.late}</div>
              <div className="text-sm text-muted-foreground">Late Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{todayStats.onLeave}</div>
              <div className="text-sm text-muted-foreground">On Leave</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{todayStats.working}</div>
              <div className="text-sm text-muted-foreground">Currently Working</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => setShowClockInOut(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Clock In/Out</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Record employee attendance for today
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Bulk Operations</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Clock in/out multiple employees at once
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Settings</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Configure working hours and policies
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>Today's clock in/out activities</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No activities recorded today</p>
                <p className="text-sm text-muted-foreground">Start by clocking in employees</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {getEmployeeName(activity.employee_id).split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">
                          {getEmployeeName(activity.employee_id)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {getEmployeeId(activity.employee_id)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-sm font-medium">Clock In</div>
                        <div className="text-sm text-green-600">
                          {formatTime(activity.clock_in)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Clock Out</div>
                        <div className="text-sm text-red-600">
                          {formatTime(activity.clock_out) || '-'}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Status</div>
                        {getStatusBadge(activity.status)}
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">Time</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(activity.updated_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Working Employees */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Currently Working</CardTitle>
            <CardDescription>Employees who are clocked in but not yet clocked out</CardDescription>
          </CardHeader>
          <CardContent>
            {todayStats.working === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No employees currently working</p>
                <p className="text-sm text-muted-foreground">All employees have clocked out for the day</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {attendanceRecords
                  .filter(ar => ar.date === today && ar.clock_in && !ar.clock_out)
                  .map((activity) => (
                    <Card key={activity.id} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {getEmployeeName(activity.employee_id)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Clocked in at {formatTime(activity.clock_in)}
                          </div>
                        </div>
                        <Badge variant="default">Working</Badge>
                      </div>
                    </Card>
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
