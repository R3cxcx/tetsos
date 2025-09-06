import { useState, useEffect } from 'react';
import { Clock, Calendar, Users, TrendingUp, Clock3, AlertCircle, Upload, Database, MapPin, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useAttendance } from '@/hooks/useAttendance';
import { useRefresh } from '@/contexts/RefreshContext';
import { FingerprintUploadDialog } from '../components/FingerprintUploadDialog';
import { RawDataUploadDialog } from '../components/RawDataUploadDialog';
import { UserIdMappingDialog } from '../components/UserIdMappingDialog';

export default function AttendanceDataIndex() {
  const navigate = useNavigate();
  const { attendanceStats, fetchAttendanceStats } = useAttendance();
  const { setRefreshFunction } = useRefresh();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showRawDataUploadDialog, setShowRawDataUploadDialog] = useState(false);
  const [showUserIdMappingDialog, setShowUserIdMappingDialog] = useState(false);

  useEffect(() => {
    setRefreshFunction(() => fetchAttendanceStats);
    return () => setRefreshFunction(null);
  }, [setRefreshFunction, fetchAttendanceStats]);

  const stats = attendanceStats || {
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    averageWorkHours: 0,
    totalWorkHours: 0
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/hr/attendance')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Attendance Data Management</h1>
            <p className="text-muted-foreground">Track attendance, process data, and manage employee records</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/overview')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalEmployees} employees
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/overview')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalEmployees > 0 ? Math.round((stats.absentToday / stats.totalEmployees) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/overview')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late Today</CardTitle>
              <Clock3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.lateToday}</div>
              <p className="text-xs text-muted-foreground">
                {stats.presentToday > 0 ? Math.round((stats.lateToday / stats.presentToday) * 100) : 0}% of present
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/overview')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.onLeaveToday}</div>
              <p className="text-xs text-muted-foreground">
                Approved time off
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/overview')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Daily Overview</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                View today's attendance status for all employees
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/clock-in-out')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Clock In/Out</CardTitle>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manual clock in/out for employees
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/calendar')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Calendar View</CardTitle>
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monthly and weekly attendance calendar
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => navigate('/hr/attendance/raw-records')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Raw Records</CardTitle>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Process and manage raw attendance data
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => setShowRawDataUploadDialog(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Upload Data</CardTitle>
              <Upload className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload fingerprint or raw attendance data
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" 
                onClick={() => setShowUserIdMappingDialog(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">User ID Mapping</CardTitle>
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <CardDescription>
                Map fingerprint IDs to employee records
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest attendance events and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">System startup completed</span>
                </div>
                <Badge variant="secondary">Just now</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Attendance data synchronized</span>
                </div>
                <Badge variant="secondary">2 min ago</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Dialog */}
        <FingerprintUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
        />

        {/* Raw Data Upload Dialog */}
        <RawDataUploadDialog
          open={showRawDataUploadDialog}
          onOpenChange={setShowRawDataUploadDialog}
        />

        {/* User ID Mapping Dialog */}
        <UserIdMappingDialog
          open={showUserIdMappingDialog}
          onOpenChange={setShowUserIdMappingDialog}
        />
      </div>
    </div>
  );
}