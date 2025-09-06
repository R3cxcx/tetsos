import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Clock, Users, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedAttendance } from '@/hooks/useEnhancedAttendance';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProcessedAttendance {
  id: string;
  employee_id: string;
  employee_name: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
  has_anomaly: boolean;
  notes?: string;
}

export default function AttendanceReview() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { processRawAttendance } = useEnhancedAttendance();

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ProcessedAttendance[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchProcessedData();
    }
  }, [dateFrom, dateTo]);

  const fetchProcessedData = async () => {
    if (!dateFrom || !dateTo) return;

    setLoading(true);
    try {
      // First, run the processing to get preview data
      const result = await processRawAttendance(dateFrom, dateTo, false); // Don't mark as processed yet
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Fetch the processed data for review
      const { data: attendanceData, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          employee_id,
          date,
          clock_in,
          clock_out,
          total_hours,
          status,
          notes,
          employees!inner(english_name)
        `)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false })

      if (error) throw error;

      const formattedData: ProcessedAttendance[] = (attendanceData || []).map(record => ({
        id: record.id,
        employee_id: record.employee_id,
        employee_name: (record.employees as any)?.english_name || 'Unknown',
        work_date: record.date,
        clock_in: record.clock_in,
        clock_out: record.clock_out,
        total_hours: record.total_hours,
        status: record.status,
        has_anomaly: record.notes?.includes('anomaly') || false,
        notes: record.notes
      }));

      setProcessedData(formattedData);
      // Initially select all valid records (non-anomalies)
      const validRecords = new Set(
        formattedData.filter(record => !record.has_anomaly).map(record => record.id)
      );
      setSelectedRecords(validRecords);
    } catch (error) {
      console.error('Error fetching processed data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch processed attendance data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedRecords(new Set(processedData.map(record => record.id)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
    setSelectAll(newSelected.size === processedData.length);
  };

  const handleConfirmSelected = async () => {
    if (selectedRecords.size === 0) {
      toast({
        title: 'No Records Selected',
        description: 'Please select at least one record to confirm',
        variant: 'destructive'
      });
      return;
    }

    setProcessing(true);
    try {
      // Mark the raw data as processed for the selected records
      const result = await processRawAttendance(dateFrom!, dateTo!, true);
      
      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Success',
        description: `Confirmed ${selectedRecords.size} attendance records successfully`,
      });

      // Navigate back to raw records with success message
      navigate('/hr/attendance/raw-records?confirmed=true');
    } catch (error) {
      console.error('Error confirming attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm attendance records',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string, hasAnomaly: boolean) => {
    if (hasAnomaly) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        Anomaly
      </Badge>;
    }

    switch (status) {
      case 'present':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Present</Badge>;
      case 'late':
        return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600 text-white">Late</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--';
    return format(new Date(time), 'HH:mm');
  };

  const formatHours = (hours: number | null) => {
    if (!hours) return '--';
    return `${hours.toFixed(2)}h`;
  };

  const validRecords = processedData.filter(record => !record.has_anomaly);
  const anomalyRecords = processedData.filter(record => record.has_anomaly);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Processing attendance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/hr/attendance/raw-records')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Raw Records
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Review Processed Attendance</h1>
            <p className="text-muted-foreground">
              Review and confirm attendance records for {dateFrom} to {dateTo}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleConfirmSelected}
            disabled={processing || selectedRecords.size === 0}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            {processing ? 'Confirming...' : `Confirm Selected (${selectedRecords.size})`}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valid Records</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{validRecords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{anomalyRecords.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{selectedRecords.size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Valid Records Table */}
      {validRecords.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Valid Attendance Records</CardTitle>
                <CardDescription>
                  Records ready for confirmation to final attendance
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Select All
                </label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRecords.has(record.id)}
                          onCheckedChange={(checked) => 
                            handleSelectRecord(record.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>{format(new Date(record.work_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatTime(record.clock_in)}</TableCell>
                      <TableCell>{formatTime(record.clock_out)}</TableCell>
                      <TableCell>{formatHours(record.total_hours)}</TableCell>
                      <TableCell>{getStatusBadge(record.status, record.has_anomaly)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Anomaly Records Table */}
      {anomalyRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Anomaly Records</CardTitle>
            <CardDescription>
              Records with detected anomalies that require manual review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalyRecords.map((record) => (
                    <TableRow key={record.id} className="bg-red-50">
                      <TableCell className="font-medium">{record.employee_name}</TableCell>
                      <TableCell>{format(new Date(record.work_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{formatTime(record.clock_in)}</TableCell>
                      <TableCell>{formatTime(record.clock_out)}</TableCell>
                      <TableCell>{formatHours(record.total_hours)}</TableCell>
                      <TableCell>{getStatusBadge(record.status, record.has_anomaly)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {record.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {processedData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Processed Data</h3>
            <p className="text-muted-foreground mb-4">
              No attendance records found for the selected date range.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Make sure to process raw attendance data first before reviewing.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/hr/attendance/raw-records')}
            >
              Go to Raw Records
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}