import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Filter, Eye, Settings, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { useAttendance } from '@/hooks/useAttendance';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';

const ATTENDANCE_CODES = {
  P: { label: 'Present', color: 'bg-green-100 text-green-800 border-green-200' },
  A: { label: 'Absent', color: 'bg-red-100 text-red-800 border-red-200' },
  WK: { label: 'Weekend', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  HL: { label: 'Holiday', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  L: { label: 'Late', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  O: { label: 'Overtime', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
};

export default function AttendanceCalendarView() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const { employees, loading: employeesLoading } = useEmployees();
  const { attendanceRecords, loading: attendanceLoading } = useAttendance();
  const { getAttendanceForDateRange } = useEnhancedAttendance();

  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  // Calculate the custom month period (26th to 25th)
  const getCustomMonthPeriod = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    if (day >= 26) {
      // If current day is 26th or later, period starts from 26th of current month
      return {
        startDate: new Date(year, month, 26),
        endDate: new Date(year, month + 1, 25),
        displayMonth: monthNames[month],
        displayYear: year
      };
    } else {
      // If current day is before 26th, period started from 26th of previous month
      return {
        startDate: new Date(year, month - 1, 26),
        endDate: new Date(year, month, 25),
        displayMonth: monthNames[month - 1] || monthNames[11],
        displayYear: month === 0 ? year - 1 : year
      };
    }
  };

  const customPeriod = getCustomMonthPeriod(currentDate);
  const currentMonth = customPeriod.displayMonth;
  const currentYear = customPeriod.displayYear;
  
  // Calculate days in the custom period
  const startDate = customPeriod.startDate;
  const endDate = customPeriod.endDate;
  const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getDayOfWeek = (dayOffset: number) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + dayOffset - 1);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  const getAttendanceForEmployeeDay = (employeeId: string, dayOffset: number) => {
    // Calculate the actual date for this day offset
    const actualDate = new Date(startDate);
    actualDate.setDate(startDate.getDate() + dayOffset - 1);
    
    // Friday is weekend in this system
    const isFriday = actualDate.getDay() === 5;
    if (isFriday) return 'WK';
    
    // Look for real attendance data
    const attendanceRecord = attendanceRecords?.find(record => {
      const recordDate = new Date(record.date);
      const recordEmployeeId = employees?.find(emp => emp.id === record.employee_id)?.id;
      return recordEmployeeId === employeeId && 
             recordDate.getFullYear() === actualDate.getFullYear() &&
             recordDate.getMonth() === actualDate.getMonth() &&
             recordDate.getDate() === actualDate.getDate();
    });

    if (attendanceRecord) {
      if (attendanceRecord.status === 'absent') return 'A';
      if (attendanceRecord.clock_in && attendanceRecord.clock_out) {
        // Check if late (after 9 AM)
        const clockInTime = new Date(attendanceRecord.clock_in);
        const isLate = clockInTime.getHours() > 9 || (clockInTime.getHours() === 9 && clockInTime.getMinutes() > 0);
        return isLate ? 'L' : 'P';
      }
      return 'P';
    }
    
    // Default to absent if no record found
    return 'A';
  };

  const getTimeDetails = (employeeId: string, day: number, status: string) => {
    if (status === 'P' || status === 'L') {
      return {
        timeIn: '09:30 AM',
        timeOut: status === 'L' ? '06:45 PM' : '06:30 PM',
        totalHours: status === 'L' ? '09H : 00M' : '09H : 00M',
        earlyOut: status === 'L' ? '01H:30M' : '',
        lateIn: status === 'L' ? '26H : 00M' : ''
      };
    }
    return null;
  };

  const filteredEmployees = employees?.filter(employee => {
    const matchesSearch = employee.english_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.arabic_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || !selectedDepartment || employee.category === selectedDepartment;
    const matchesLocation = selectedLocation === 'all' || !selectedLocation; // Location not available in current Employee interface
    return matchesSearch && matchesDepartment && matchesLocation;
  }) || [];

  const departments = employees ? [...new Set(employees.map(emp => emp.category).filter((cat): cat is string => Boolean(cat)))] : [];
  const locations: string[] = []; // Location not available in current Employee interface

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4 mb-4">
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
                <BreadcrumbPage>Calendar View</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900">Employee Attendance</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600 text-xs font-bold">3</span>
            </div>
            <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r h-screen overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-6">
              <Badge variant="secondary" className="text-lg font-semibold">
                {filteredEmployees.length} Employees
              </Badge>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-lg">
                {currentMonth} {currentYear}
              </span>
              <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Filters */}
            <div className="space-y-3 mb-6">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue placeholder="All Employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employee</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="inactive">Inactive Only</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Employee List */}
            <div className="space-y-2">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {employee.english_name?.split(' ')?.[0]?.[0]}{employee.english_name?.split(' ')?.[1]?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {employee.english_name}
                    </p>
                  </div>
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">10:22</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Calendar Content */}
        <div className="flex-1 overflow-x-auto">
          <div className="p-6">
            {/* Calendar Header */}
            <div className="flex gap-1 mb-2 sticky top-0 bg-gray-50 z-10">
              <div className="w-48"></div> {/* Employee name column */}
              {Array.from({ length: daysInPeriod }, (_, i) => i + 1).map(dayOffset => {
                const actualDate = new Date(startDate);
                actualDate.setDate(startDate.getDate() + dayOffset - 1);
                const day = actualDate.getDate();
                
                return (
                  <div key={dayOffset} className="text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {monthNames[actualDate.getMonth()].toLowerCase()}
                    </div>
                    <div className={`text-xs font-medium p-2 rounded ${
                      actualDate.toDateString() === new Date().toDateString() ? 'bg-blue-600 text-white' : 'text-gray-900'
                    }`}>
                      {String(day).padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {getDayOfWeek(dayOffset)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Rows */}
            <TooltipProvider>
              <div className="space-y-1">
                {filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex gap-1 items-center">
                    {/* Employee Name Column */}
                    <div className="w-48 flex items-center gap-3 p-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="text-xs">
                          {employee.english_name?.split(' ')?.[0]?.[0]}{employee.english_name?.split(' ')?.[1]?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employee.english_name}
                        </p>
                      </div>
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">10:22</span>
                      </div>
                    </div>

                     {/* Daily Attendance Cells */}
                     {Array.from({ length: daysInPeriod }, (_, i) => i + 1).map(dayOffset => {
                       const attendanceStatus = getAttendanceForEmployeeDay(employee.id, dayOffset);
                       const attendanceConfig = ATTENDANCE_CODES[attendanceStatus as keyof typeof ATTENDANCE_CODES];
                       
                       // Get real time details from attendance record
                       const actualDate = new Date(startDate);
                       actualDate.setDate(startDate.getDate() + dayOffset - 1);
                       
                       const attendanceRecord = attendanceRecords?.find(record => {
                         const recordDate = new Date(record.date);
                         const recordEmployeeId = employees?.find(emp => emp.id === record.employee_id)?.id;
                         return recordEmployeeId === employee.id && 
                                recordDate.getFullYear() === actualDate.getFullYear() &&
                                recordDate.getMonth() === actualDate.getMonth() &&
                                recordDate.getDate() === actualDate.getDate();
                       });

                       const timeDetails = attendanceRecord ? {
                         timeIn: attendanceRecord.clock_in ? new Date(attendanceRecord.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
                         timeOut: attendanceRecord.clock_out ? new Date(attendanceRecord.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
                         totalHours: attendanceRecord.total_hours ? `${Math.floor(Number(attendanceRecord.total_hours))}H : ${Math.round((Number(attendanceRecord.total_hours) % 1) * 60)}M` : '',
                         status: attendanceRecord.status
                       } : null;

                       return (
                         <Tooltip key={dayOffset}>
                           <TooltipTrigger asChild>
                             <div className={`h-8 w-8 rounded flex items-center justify-center text-xs font-medium border cursor-pointer hover:scale-105 transition-transform ${
                               attendanceConfig.color
                             }`}>
                               {attendanceStatus}
                             </div>
                           </TooltipTrigger>
                           {timeDetails && timeDetails.timeIn && (
                             <TooltipContent className="bg-gray-900 text-white p-3 rounded-lg">
                               <div className="space-y-1">
                                 <div className="flex justify-between gap-4">
                                   <span>• IN - {timeDetails.timeIn}</span>
                                 </div>
                                 {timeDetails.timeOut && (
                                   <div className="flex justify-between gap-4">
                                     <span>• OUT - {timeDetails.timeOut}</span>
                                   </div>
                                 )}
                                 {timeDetails.totalHours && (
                                   <div className="border-t border-gray-700 pt-1">
                                     <div>Total Working Hours : {timeDetails.totalHours}</div>
                                   </div>
                                 )}
                               </div>
                             </TooltipContent>
                           )}
                         </Tooltip>
                       );
                     })}
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}