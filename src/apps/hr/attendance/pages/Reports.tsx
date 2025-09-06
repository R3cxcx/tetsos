import { useState, useEffect } from 'react';
import { Calendar, Download, BarChart3, TrendingUp, Users, Clock, Filter, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeesStaging } from '@/hooks/useEmployeesStaging';
import { useRawAttendance } from '@/hooks/useRawAttendance';
import { PromotionProgressDialog } from '@/components/PromotionProgressDialog';

interface ReportData {
  period: string;
  totalEmployees: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  onLeaveCount: number;
  averageWorkHours: number;
  totalWorkHours: number;
  attendanceRate: number;
}

interface EmployeeAttendanceData {
  employee_id: string;
  employee_name: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  total_hours: number;
  average_hours: number;
  attendance_rate: number;
}

export default function Reports() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'employee'>('daily');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [employeeReportData, setEmployeeReportData] = useState<EmployeeAttendanceData[]>([]);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [progressSteps, setProgressSteps] = useState<any[]>([]);
  const [currentProgressStep, setCurrentProgressStep] = useState(0);
  const [isPromotionComplete, setIsPromotionComplete] = useState(false);
  
  const { attendanceStats } = useAttendance();
  const { employees } = useEmployees();
  const { toast } = useToast();
  const { user, hasRole } = useAuth();
  const { promoteStagingFromRawAttendance } = useEmployeesStaging();
  const { processRawDataRPC } = useRawAttendance();

  // Add debugging to see actual employee count
  console.log('Reports page - Active employees:', employees.filter(emp => emp.status === 'active'));
  console.log('Reports page - Total employees:', employees.length);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployeesData = async () => {
      if (!user) return;
      
      try {
        const { data: employeesData, error } = await supabase
          .from('employees')
          .select('employee_id, english_name, status')
          .eq('status', 'active');

        if (error) throw error;
        // Note: We're not setting employees state here since we're using the useEmployees hook
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchEmployeesData();
  }, [user]);

  // Generate reports when dependencies change
  useEffect(() => {
    if (reportType === 'employee') {
      generateEmployeeReport();
    } else {
      generateTimeBasedReport();
    }
  }, [startDate, endDate, reportType, selectedDepartment, user]);

  const generateTimeBasedReport = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch from raw_attendance_data (both processed and unprocessed)
      const { data: rawAttendanceData, error } = await supabase
        .from('raw_attendance_data')
        .select('*')
        .gte('clocking_time', startDate)
        .lte('clocking_time', endDate + 'T23:59:59');
        // Removed processed filter to show all data

      if (error) throw error;

      // Get active employees from direct database query to ensure accurate count
      const { data: activeEmployeesData, error: empError } = await supabase
        .from('employees')
        .select('employee_id, english_name, status')
        .eq('status', 'active');
      
      if (empError) throw empError;
      const activeEmployees = activeEmployeesData || [];
      const data: ReportData[] = [];

      if (reportType === 'daily') {
        // Generate daily reports from raw attendance data
        const daysBetween = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        for (let i = 0; i < daysBetween; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i);
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Filter raw data for current date
          const dayRecords = rawAttendanceData?.filter(r => 
            r.clocking_time.startsWith(dateStr)
          ) || [];
          
          // Count unique employees who clocked in that day
          const uniqueEmployees = new Set(dayRecords.map(r => r.employee_id));
          const presentCount = uniqueEmployees.size;
          const absentCount = Math.max(0, activeEmployees.length - presentCount);
          
          // For raw data, we don't have late/leave status, so we'll estimate
          const lateCount = 0; // Would need business logic to determine late
          const onLeaveCount = 0; // Would need separate leave tracking
          
          // Calculate work hours from raw clocking data (simplified)
          const totalHours = dayRecords.length * 8; // Assume 8 hours per day per employee
          const averageHours = presentCount > 0 ? totalHours / presentCount : 0;
          const attendanceRate = activeEmployees.length > 0 ? (presentCount / activeEmployees.length) * 100 : 0;

          data.push({
            period: currentDate.toLocaleDateString(),
            totalEmployees: activeEmployees.length,
            presentCount,
            absentCount,
            lateCount,
            onLeaveCount,
            averageWorkHours: averageHours,
            totalWorkHours: totalHours,
            attendanceRate
          });
        }
      } else if (reportType === 'weekly') {
        // Generate weekly reports
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start from Sunday
        
        while (weekStart <= new Date(endDate)) {
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const weekStartStr = weekStart.toISOString().split('T')[0];
          const weekEndStr = weekEnd.toISOString().split('T')[0];
          
          const weekRecords = rawAttendanceData?.filter(r => {
            const recordDate = r.clocking_time.split('T')[0];
            return recordDate >= weekStartStr && recordDate <= weekEndStr;
          }) || [];
          
          const uniqueEmployees = new Set(weekRecords.map(r => r.employee_id));
          const presentCount = uniqueEmployees.size;
          const absentCount = Math.max(0, activeEmployees.length - presentCount);
          const lateCount = 0; // Would need business logic to determine
          const onLeaveCount = 0; // Would need separate tracking
          
          const totalHours = weekRecords.length * 8; // Simplified calculation
          const averageHours = weekRecords.length > 0 ? totalHours / weekRecords.length : 0;
          const attendanceRate = activeEmployees.length > 0 ? (presentCount / activeEmployees.length) * 100 : 0;

          data.push({
            period: `Week of ${weekStart.toLocaleDateString()}`,
            totalEmployees: activeEmployees.length,
            presentCount,
            absentCount,
            lateCount,
            onLeaveCount,
            averageWorkHours: averageHours,
            totalWorkHours: totalHours,
            attendanceRate
          });
          
          weekStart.setDate(weekStart.getDate() + 7);
        }
      } else if (reportType === 'monthly') {
        // Generate monthly reports
        const monthStart = new Date(startDate);
        monthStart.setDate(1);
        
        while (monthStart <= new Date(endDate)) {
          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0); // Last day of month
          
          const monthStartStr = monthStart.toISOString().split('T')[0];
          const monthEndStr = monthEnd.toISOString().split('T')[0];
          
          const monthRecords = rawAttendanceData?.filter(r => {
            const recordDate = r.clocking_time.split('T')[0];
            return recordDate >= monthStartStr && recordDate <= monthEndStr;
          }) || [];
          
          const uniqueEmployees = new Set(monthRecords.map(r => r.employee_id));
          const presentCount = uniqueEmployees.size;
          const absentCount = Math.max(0, activeEmployees.length - presentCount);
          const lateCount = 0; // Would need business logic 
          const onLeaveCount = 0; // Would need separate tracking
          
          const totalHours = monthRecords.length * 8; // Simplified calculation
          const averageHours = monthRecords.length > 0 ? totalHours / monthRecords.length : 0;
          const attendanceRate = activeEmployees.length > 0 ? (presentCount / activeEmployees.length) * 100 : 0;

          data.push({
            period: monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
            totalEmployees: activeEmployees.length,
            presentCount,
            absentCount,
            lateCount,
            onLeaveCount,
            averageWorkHours: averageHours,
            totalWorkHours: totalHours,
            attendanceRate
          });
          
          monthStart.setMonth(monthStart.getMonth() + 1);
        }
      }

      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: "Failed to generate attendance report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateEmployeeReport = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch from raw_attendance_data for employee report (all data)
      const { data: rawAttendanceData, error } = await supabase
        .from('raw_attendance_data')
        .select('*')
        .gte('clocking_time', startDate)
        .lte('clocking_time', endDate + 'T23:59:59');
        // Removed processed filter to show all attendance data

      if (error) throw error;

      const employeeData: EmployeeAttendanceData[] = [];
      // Get active employees from direct database query
      const { data: activeEmployeesData, error: empError } = await supabase
        .from('employees')
        .select('employee_id, english_name, status')
        .eq('status', 'active');
      
      if (empError) throw empError;
      const activeEmployees = activeEmployeesData || [];

      // Calculate total working days in the period
      const totalDays = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;

      activeEmployees.forEach(employee => {
        const employeeRecords = rawAttendanceData?.filter(r => r.employee_id === employee.employee_id) || [];
        
        // Group records by date to count unique days
        const uniqueDays = new Set(employeeRecords.map(r => r.clocking_time.split('T')[0]));
        const presentDays = uniqueDays.size;
        const absentDays = Math.max(0, totalDays - presentDays);
        const lateDays = 0; // Would need business logic to determine late arrivals
        const totalHours = presentDays * 8; // Simplified: assume 8 hours per day present
        const averageHours = presentDays > 0 ? totalHours / presentDays : 0;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        employeeData.push({
          employee_id: employee.employee_id,
          employee_name: employee.english_name,
          total_days: totalDays,
          present_days: presentDays,
          absent_days: absentDays,
          late_days: lateDays,
          total_hours: totalHours,
          average_hours: averageHours,
          attendance_rate: attendanceRate
        });
      });

      // Sort by attendance rate descending
      employeeData.sort((a, b) => b.attendance_rate - a.attendance_rate);
      setEmployeeReportData(employeeData);
    } catch (error) {
      console.error('Error generating employee report:', error);
      toast({
        title: "Error",
        description: "Failed to generate employee attendance report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteFromRaw = async () => {
    // Check if user has required permissions
    if (!hasRole('super_admin') && !hasRole('admin') && !hasRole('hr_manager')) {
      toast({
        title: 'Access denied',
        description: 'Only super admins, admins, and HR managers can promote employees from staging.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      setShowProgressDialog(true);
      setIsPromotionComplete(false);
      setProgressSteps([]);
      setCurrentProgressStep(0);

      const handleProgress = (steps: any[], currentStep: number) => {
        setProgressSteps([...steps]);
        setCurrentProgressStep(currentStep);
      };

      const res = await promoteStagingFromRawAttendance(handleProgress);
      
      setIsPromotionComplete(true);
      toast({
        title: 'Staging sync complete',
        description: `Matched ${res.matched}, promoted ${res.promoted}, removed ${res.removed}.`
      });
    } catch (e) {
      setIsPromotionComplete(true);
      toast({ title: 'Sync failed', description: 'Could not promote from raw logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // NEW: Run server-side processing into attendance_records (final payroll table)
  const handleProcessToPayroll = async () => {
    try {
      setLoading(true);
      console.log('[Reports] Running Process to Payroll for range:', { startDate, endDate });
      const res = await processRawDataRPC(startDate, endDate, true);

      if (res.error) {
        throw new Error(res.error);
      }

      const summary = res.data as { upserted?: number; raw_marked_processed?: number; skipped_unmatched?: number } | null;
      const upserted = summary?.upserted ?? 0;
      const marked = summary?.raw_marked_processed ?? 0;
      const skipped = summary?.skipped_unmatched ?? 0;

      toast({
        title: 'Processing complete',
        description: `Upserted ${upserted}, marked processed ${marked}, unmatched skipped ${skipped}.`,
      });

      // Re-generate current report to reflect latest data
      if (reportType === 'employee') {
        await generateEmployeeReport();
      } else {
        await generateTimeBasedReport();
      }
    } catch (e: any) {
      console.error('[Reports] Process to Payroll failed:', e);
      toast({
        title: 'Processing failed',
        description: e?.message || 'Could not process attendance. Check permissions or data.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (reportType === 'employee') {
      const csvContent = [
        ['Employee ID', 'Employee Name', 'Total Days', 'Present Days', 'Absent Days', 'Late Days', 'Total Hours', 'Average Hours', 'Attendance Rate %'],
        ...employeeReportData.map(row => [
          row.employee_id,
          row.employee_name,
          row.total_days.toString(),
          row.present_days.toString(),
          row.absent_days.toString(),
          row.late_days.toString(),
          row.total_hours.toFixed(2),
          row.average_hours.toFixed(2),
          row.attendance_rate.toFixed(1) + '%'
        ])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee_attendance_report_${startDate}_to_${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const csvContent = [
        ['Period', 'Total Employees', 'Present Count', 'Absent Count', 'Late Count', 'On Leave Count', 'Average Work Hours', 'Total Work Hours', 'Attendance Rate %'],
        ...reportData.map(row => [
          row.period,
          row.totalEmployees.toString(),
          row.presentCount.toString(),
          row.absentCount.toString(),
          row.lateCount.toString(),
          row.onLeaveCount.toString(),
          row.averageWorkHours.toFixed(2),
          row.totalWorkHours.toFixed(2),
          row.attendanceRate.toFixed(1) + '%'
        ])
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_report_${reportType}_${startDate}_to_${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBadge = (percentage: number) => {
    if (percentage >= 95) return <Badge variant="default">Excellent</Badge>;
    if (percentage >= 85) return <Badge variant="secondary">Good</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
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
                <BreadcrumbPage>Reports</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Attendance Reports</h1>
            <p className="text-muted-foreground">Generate and analyze real attendance data</p>
          </div>
          <div className="flex gap-2">
            {/* NEW: Process to payroll button */}
            <Button onClick={handleProcessToPayroll} disabled={loading} className="bg-primary hover:bg-primary/90">
              <Clock className="h-4 w-4 mr-2" />
              Process to Payroll
            </Button>
            <Button onClick={exportReport} className="bg-primary hover:bg-primary/90" disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Report Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Select date range and report type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportType">Report Type</Label>
                <Select value={reportType} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'employee') => setReportType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="employee">Employee Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : (reportData.length > 0 ? reportData[0]?.totalEmployees || 5 : 5)}
              </div>
              <p className="text-xs text-muted-foreground">
                Active employees
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {reportType === 'employee' 
                  ? (employeeReportData.length > 0 ? (employeeReportData.reduce((sum, d) => sum + d.attendance_rate, 0) / employeeReportData.length).toFixed(1) : '0') + '%'
                  : (reportData.length > 0 ? (reportData.reduce((sum, d) => sum + d.attendanceRate, 0) / reportData.length).toFixed(1) : '0') + '%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Over selected period
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Work Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {reportType === 'employee'
                  ? (employeeReportData.length > 0 ? (employeeReportData.reduce((sum, d) => sum + d.average_hours, 0) / employeeReportData.length).toFixed(1) : '0') + 'h'
                  : (reportData.length > 0 ? (reportData.reduce((sum, d) => sum + d.averageWorkHours, 0) / reportData.length).toFixed(1) : '0') + 'h'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Per employee per day
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Work Hours</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {reportType === 'employee'
                  ? employeeReportData.reduce((sum, d) => sum + d.total_hours, 0).toFixed(0)
                  : reportData.reduce((sum, d) => sum + d.totalWorkHours, 0).toFixed(0)
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Over selected period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {reportType === 'employee' ? 'Employee Attendance Summary' : 'Detailed Report'}
            </CardTitle>
            <CardDescription>
              {reportType === 'employee' 
                ? `Individual employee attendance from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
                : `Attendance data from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Loading report data...</div>
                </div>
              ) : reportType === 'employee' ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Employee</th>
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Present Days</th>
                      <th className="text-left p-3 font-medium">Absent Days</th>
                      <th className="text-left p-3 font-medium">Late Days</th>
                      <th className="text-left p-3 font-medium">Total Hours</th>
                      <th className="text-left p-3 font-medium">Avg Hours/Day</th>
                      <th className="text-left p-3 font-medium">Attendance Rate</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeReportData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{row.employee_name}</td>
                        <td className="p-3">{row.employee_id}</td>
                        <td className="p-3">{row.present_days}</td>
                        <td className="p-3">{row.absent_days}</td>
                        <td className="p-3">{row.late_days}</td>
                        <td className="p-3">{row.total_hours.toFixed(1)}h</td>
                        <td className="p-3">{row.average_hours.toFixed(1)}h</td>
                        <td className="p-3">
                          <span className={`font-medium ${getAttendanceColor(row.attendance_rate)}`}>
                            {row.attendance_rate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">
                          {getAttendanceBadge(row.attendance_rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Period</th>
                      <th className="text-left p-3 font-medium">Total Employees</th>
                      <th className="text-left p-3 font-medium">Present</th>
                      <th className="text-left p-3 font-medium">Absent</th>
                      <th className="text-left p-3 font-medium">Late</th>
                      <th className="text-left p-3 font-medium">On Leave</th>
                      <th className="text-left p-3 font-medium">Avg Hours</th>
                      <th className="text-left p-3 font-medium">Total Hours</th>
                      <th className="text-left p-3 font-medium">Attendance Rate</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{row.period}</td>
                        <td className="p-3">{row.totalEmployees}</td>
                        <td className="p-3">
                          <Badge variant="default">{row.presentCount}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="destructive">{row.absentCount}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary">{row.lateCount}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline">{row.onLeaveCount}</Badge>
                        </td>
                        <td className="p-3">{row.averageWorkHours.toFixed(1)}h</td>
                        <td className="p-3">{row.totalWorkHours.toFixed(1)}</td>
                        <td className="p-3">
                          <span className={`font-medium ${getAttendanceColor(row.attendanceRate)}`}>
                            {row.attendanceRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3">
                          {getAttendanceBadge(row.attendanceRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts Section (Placeholder) */}
        <div className="grid gap-6 md:grid-cols-2 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trend</CardTitle>
              <CardDescription>Attendance percentage over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Chart visualization would go here</p>
                  <p className="text-sm text-muted-foreground">Integration with chart library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Work Hours Distribution</CardTitle>
              <CardDescription>Distribution of daily work hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Chart visualization would go here</p>
                  <p className="text-sm text-muted-foreground">Integration with chart library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Dialog */}
        <PromotionProgressDialog
          open={showProgressDialog}
          onClose={() => setShowProgressDialog(false)}
          steps={progressSteps}
          currentStep={currentProgressStep}
          isComplete={isPromotionComplete}
        />
      </div>
    </div>
  );
}
