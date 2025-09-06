import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Users, MapPin, Clock, Database, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useRawAttendance } from '@/hooks/useRawAttendance';
import { useEnhancedRawAttendance, EmployeeMatchResult, EnhancedRawAttendanceRecord } from '@/hooks/useEnhancedRawAttendance';
import { SmartMatchingPreview } from './SmartMatchingPreview';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface RawDataUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RawAttendanceRecord {
  user_id: string;
  employee_id: string; // Now required since we parse it directly
  employee_uuid?: string; // Added for storing the UUID lookup
  name: string;
  clocking_time: string;
  terminal_description: string;
  processed: boolean;
}

interface UserIdMapping {
  user_id: string;
  employee_id: string;
  employee_name: string;
}

type DirectAttendanceRow = {
  employee_id: string;
  clock_in: string;
  clock_out?: string | null;
  in_terminal_id?: string | null;
  out_terminal_id?: string | null;
};

export function RawDataUploadDialog({ open, onOpenChange }: RawDataUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<EnhancedRawAttendanceRecord[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [userIdMappings, setUserIdMappings] = useState<UserIdMapping[]>([]);
  const [unmappedUsers, setUnmappedUsers] = useState<string[]>([]);
  const [mappingMode, setMappingMode] = useState(false);
  const [matchResults, setMatchResults] = useState<EmployeeMatchResult[]>([]);
  const [showSmartMatching, setShowSmartMatching] = useState(false);
  const [uploadMode, setUploadMode] = useState<'raw' | 'direct'>('raw');
  const [directRecords, setDirectRecords] = useState<DirectAttendanceRow[]>([]);
  const [rejectedRecords, setRejectedRecords] = useState<EnhancedRawAttendanceRecord[]>([]);

  const { toast } = useToast();
  const { uploadRawData, fetchUserIdMappings, processRawDataRPC } = useRawAttendance();
  const { processWithEnhancements } = useEnhancedRawAttendance();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    const allowedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a text (.txt), Excel (.xlsx, .xls) or CSV file",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    setLoading(true);
    setUploadProgress(0);

    const reader = new FileReader();

    reader.onerror = () => {
      console.error('File reading failed');
      toast({
        title: 'File Read Error',
        description: 'Could not read the selected file',
        variant: 'destructive',
      });
      setLoading(false);
      setUploadProgress(0);
    };

    reader.onload = async (e) => {
      try {
        setUploadProgress(10);
        const result = e.target?.result as string | ArrayBuffer | null;
        let rawData: EnhancedRawAttendanceRecord[] = [];

        const name = file.name.toLowerCase();
        const isTxt = file.type === 'text/plain' || name.endsWith('.txt');
        const isCsv = file.type === 'text/csv' || name.endsWith('.csv');
        const isExcel = !isTxt && !isCsv; // treat others (.xlsx/.xls) as excel

        if (isTxt || isCsv) {
          const text = String(result ?? '');
          if (!text) throw new Error('Empty text file');

          if (isTxt) {
            // Support two TXT formats:
            // A: <employeeID> <Name> <dd-mm-yyyy HH:MM:SS> <Terminal...>
            // B: <userID> <employeeID> <Name> <dd-mm-yyyy HH:MM:SS> <Terminal...>
            const lines = text.split(/\r?\n/);
            const patternTwoIds = /^(\S+)\s+(\S+)\s+(.+?)\s+(\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2})\s+(.+)$/;
            const patternOriginal = /^(\S+)\s+(.+?)\s+(\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2})\s+(.+)$/;

            rawData = lines
              .map(l => l.trim())
              .filter(l => l.length > 0)
              .map(line => {
                let match = patternTwoIds.exec(line);
                if (match) {
                  const [, userId, empId, name, clockStr, terminalDesc] = match;
                  return {
                    user_id: userId.trim(),
                    employee_id: empId.trim(),
                    name: name.trim(),
                    clocking_time: convertDateFormat(clockStr.trim()),
                    terminal_description: terminalDesc.trim(),
                    processed: false
                  } as EnhancedRawAttendanceRecord;
                }
                match = patternOriginal.exec(line);
                if (match) {
                  const [, empId, name, clockStr, terminalDesc] = match;
                  return {
                    user_id: empId.trim(),
                    employee_id: empId.trim(),
                    name: name.trim(),
                    clocking_time: convertDateFormat(clockStr.trim()),
                    terminal_description: terminalDesc.trim(),
                    processed: false
                  } as EnhancedRawAttendanceRecord;
                }
                return null;
              })
              .filter((r): r is EnhancedRawAttendanceRecord => r !== null);

            setUploadMode('raw');
            setDirectRecords([]);
          } else {
            // CSV
            const workbook = XLSX.read(text, { type: 'string' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            rawData = (jsonData as any[]).map((row: any) => {
              const employee_id = row['Employee ID'] || row['employee_id'] || row['Emp ID'] || row['employeeID'] || row['EMPLOYEEID'] || row['EMPLOYEE ID'] || '';
              const name = row['Name'] || row['name'] || row['NAME'] || row['Employee Name'] || row['employee_name'] || '';
              const clockRaw = row['Clocking Time'] || row['clocking_time'] || row['ClockingTime'] || row['CLOCKING TIME'] || row['Date'] || row['date'] || '';
              const terminal_description = row['Terminal ID'] || row['Terminal Description'] || row['terminal_id'] || row['terminal_description'] || row['Terminal'] || row['TerminalDescription'] || '';
              const user_id = row['User ID'] || row['user_id'] || row['USER ID'] || row['USERID'] || employee_id || '';

              const clocking_time =
                typeof clockRaw === 'string' && /^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2}$/.test(clockRaw)
                  ? convertDateFormat(clockRaw)
                  : formatDateTime(clockRaw);

              return {
                user_id,
                employee_id,
                name,
                clocking_time,
                terminal_description,
                processed: false
              } as EnhancedRawAttendanceRecord;
            }).filter(r => r.employee_id && r.name && r.clocking_time);
          }
        } else if (isExcel) {
          const buffer = result as ArrayBuffer;
          if (!buffer) throw new Error('Empty Excel file');
          // Use ArrayBuffer parsing for reliability and performance
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          rawData = (jsonData as any[]).map((row: any) => {
            const employee_id = row['Employee ID'] || row['employee_id'] || row['Emp ID'] || row['employeeID'] || row['EMPLOYEEID'] || row['EMPLOYEE ID'] || '';
            const name = row['Name'] || row['name'] || row['NAME'] || row['Employee Name'] || row['employee_name'] || '';
            const clockRaw = row['Clocking Time'] || row['clocking_time'] || row['ClockingTime'] || row['CLOCKING TIME'] || row['Date'] || row['date'] || '';
            const terminal_description = row['Terminal ID'] || row['Terminal Description'] || row['terminal_id'] || row['terminal_description'] || row['Terminal'] || row['TerminalDescription'] || '';
            const user_id = row['User ID'] || row['user_id'] || row['USER ID'] || row['USERID'] || employee_id || '';

            const clocking_time =
              typeof clockRaw === 'string' && /^\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2}$/.test(clockRaw)
                ? convertDateFormat(clockRaw)
                : formatDateTime(clockRaw);

            return {
              user_id,
              employee_id,
              name,
              clocking_time,
              terminal_description,
              processed: false
            } as EnhancedRawAttendanceRecord;
          }).filter(r => r.employee_id && r.name && r.clocking_time);
        }

        setUploadProgress(60);

        // Lookup employee UUIDs and filter out unregistered employees
        try {
          await processEmployeeLookup(rawData);
          setUploadProgress(90);
        } catch (lookupError) {
          console.error('Employee lookup failed:', lookupError);
          // Error already displayed by processEmployeeLookup, but we need to stop processing
          throw lookupError;
        }
        setUploadProgress(100);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast({
          title: 'File Parsing Error',
          description: 'Unable to parse the uploaded file',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
        setUploadProgress(0);
      }
    };

    // Choose the most reliable read method for each type
    const lower = file.name.toLowerCase();
    if (file.type === 'text/plain' || lower.endsWith('.txt') || file.type === 'text/csv' || lower.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      // xlsx/xls -> read as ArrayBuffer
      reader.readAsArrayBuffer(file);
    }
  };

  const processEmployeeLookup = async (rawData: EnhancedRawAttendanceRecord[]) => {
    if (rawData.length === 0) {
      setPreviewData([]);
      toast({
        title: "No Valid Data",
        description: "No valid attendance records found in the file",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get unique employee IDs
      const employeeIds = [...new Set(rawData.map(r => r.employee_id))];
      
      console.log('Starting optimized employee lookup for', employeeIds.length, 'unique employee IDs');
      setUploadProgress(70); // Progress update during lookup
      
      // Show user-friendly message for large datasets
      if (employeeIds.length > 50) {
        toast({
          title: "Verifying Employees",
          description: `Checking ${employeeIds.length} employee IDs in batches...`,
          variant: "default"
        });
      }
      
      // Use batch processing to verify employees in chunks
      const BATCH_SIZE = 100; // Process in batches of 100 IDs
      const employeeMap = new Map<string, string>();
      
      let processedCount = 0;
      
      // Process employee IDs in batches
      for (let i = 0; i < employeeIds.length; i += BATCH_SIZE) {
        const batch = employeeIds.slice(i, i + BATCH_SIZE);
        
        console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(employeeIds.length/BATCH_SIZE)}: ${batch.length} IDs`);
        
        try {
          // Query specific employee IDs only (much faster than loading all employees)
          const { data: batchEmployees, error: batchError } = await supabase
            .from('employees')
            .select('id, employee_id')
            .in('employee_id', batch)
            .is('deleted_at', null);
          
          if (batchError) {
            console.warn('Batch query failed, trying RPC fallback:', batchError);
            
            // Fallback to RPC but with timeout
            const timeoutPromise = new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('RPC timeout')), 10000) // Shorter 10s timeout
            );
            
            try {
              const rpcResult = await Promise.race([
                supabase.rpc('get_employees_basic_data'),
                timeoutPromise
              ]);
              
              if (rpcResult.data && !rpcResult.error) {
                // Filter RPC results to current batch
                const filteredEmployees = rpcResult.data.filter((emp: any) => 
                  batch.includes(emp.employee_id)
                );
                
                filteredEmployees.forEach((emp: any) => {
                  employeeMap.set(emp.employee_id, emp.id);
                });
              } else {
                throw new Error('RPC failed: ' + (rpcResult.error?.message || 'Unknown error'));
              }
            } catch (rpcError) {
              console.error('Both direct query and RPC failed for batch:', rpcError);
              // Continue with next batch - don't fail entire process
              continue;
            }
          } else if (batchEmployees) {
            // Success - add to employee map
            batchEmployees.forEach(emp => {
              employeeMap.set(emp.employee_id, emp.id);
            });
          }
          
          processedCount += batch.length;
          
          // Update progress based on batch completion
          const batchProgress = 70 + Math.floor((processedCount / employeeIds.length) * 15);
          setUploadProgress(batchProgress);
          
          // Small delay to prevent overwhelming the database
          if (i + BATCH_SIZE < employeeIds.length) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Reduced delay for faster processing
          }
          
        } catch (batchError) {
          console.error(`Error processing batch ${Math.floor(i/BATCH_SIZE) + 1}:`, batchError);
          // Continue with next batch instead of failing completely
          continue;
        }
      }

      console.log('Employee lookup completed. Found', employeeMap.size, 'registered employees out of', employeeIds.length);
      setUploadProgress(85); // Progress update after all batches

      // Process all records and assign match_status
      const allRecordsWithStatus: EnhancedRawAttendanceRecord[] = [];
      const rejectedRecords: EnhancedRawAttendanceRecord[] = [];
      
      rawData.forEach(record => {
        const employeeUuid = employeeMap.get(record.employee_id);
        if (employeeUuid) {
          // Employee found - mark as matched
          allRecordsWithStatus.push({
            ...record,
            employee_uuid: employeeUuid,
            match_status: 'matched'
          });
        } else {
          // Employee not found - mark as rejected
          const rejectedRecord = {
            ...record,
            match_status: 'rejected' as const
          };
          allRecordsWithStatus.push(rejectedRecord);
          rejectedRecords.push(rejectedRecord);
        }
      });

      const rejectedCount = rejectedRecords.length;
      const matchedCount = allRecordsWithStatus.length - rejectedCount;
      
      // Set preview data to show ALL records with their status
      setPreviewData(allRecordsWithStatus);
      setRejectedRecords(rejectedRecords);
      
      if (rejectedCount > 0) {
        const unregisteredIds = employeeIds.filter(id => !employeeMap.has(id));
        toast({
          title: "Employee Verification Complete",
          description: `${matchedCount} matched, ${rejectedCount} rejected. Unregistered IDs: ${unregisteredIds.slice(0, 10).join(', ')}${unregisteredIds.length > 10 ? '...' : ''}`,
          variant: rejectedCount === allRecordsWithStatus.length ? "destructive" : "default"
        });
      }
      
      if (matchedCount === 0) {
        toast({
          title: "No Matched Records",
          description: "All records contain unregistered employee IDs. All will be marked as rejected.",
          variant: "destructive"
        });
      } else {
        setUnmappedUsers([]);
        setShowSmartMatching(false);
        
        if (rejectedCount === 0) {
          toast({
            title: "All Employees Verified",
            description: `${matchedCount} records ready for upload`,
            variant: "default"
          });
        } else {
          toast({
            title: "Employee Verification Complete",
            description: `${matchedCount} matched records, ${rejectedCount} rejected records - all will be uploaded with status`,
            variant: "default"
          });
        }
      }
      setUploadProgress(90); // Final progress update
      
    } catch (error) {
      console.error('Error during employee lookup:', error);
      toast({
        title: "Lookup Error",
        description: `An error occurred while verifying employees: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      // Re-throw error to be handled by the main parsing try-catch
      throw error;
    }
  };

  const convertDateFormat = (dateTimeStr: string): string => {
    // Convert dd-mm-yyyy hh:mm:ss to ISO format
    const [datePart, timePart] = dateTimeStr.split(' ');
    const [day, month, year] = datePart.split('-');
    return `${year}-${month}-${day}T${timePart}`;
  };

  const formatDateTime = (dateValue: any): string => {
    if (!dateValue) return '';
    
    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString();
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? '' : date.toISOString();
    }
    
    return '';
  };

  const checkUnmappedUsers = async (userIds: string[]) => {
    try {
      const { data: mappings } = await fetchUserIdMappings();
      
      if (mappings) {
        const mappedUserIds = mappings.map(m => m.user_id);
        const unmapped = userIds.filter(id => !mappedUserIds.includes(id));
        
        setUnmappedUsers(unmapped);
        
        if (unmapped.length > 0) {
          toast({
            title: "Unmapped Users Found",
            description: `${unmapped.length} users need to be mapped to employee IDs before processing`,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Error checking user mappings:', error);
    }
  };

  const loadUserIdMappings = async () => {
    try {
      const { data: mappings } = await fetchUserIdMappings();
      
      if (mappings) {
        setUserIdMappings(mappings);
      }
    } catch (error) {
      console.error('Error fetching user ID mappings:', error);
    }
  };

  useEffect(() => {
    if (open) {
      loadUserIdMappings();
    }
  }, [open]);

  const handleUpload = async () => {
    if (!previewData.length) {
      toast({
        title: "No Data",
        description: "No valid records to upload",
        variant: "destructive"
      });
      return;
    }



    setLoading(true);
    setUploadProgress(0);

    try {
      if (uploadMode === 'direct' && directRecords.length > 0) {
        // Save confirmed attendance records via RPC
        for (let i = 0; i < directRecords.length; i++) {
          const rec = directRecords[i];
          const { error: rpcError } = await supabase.rpc('upsert_direct_attendance', {
            p_employee_code: rec.employee_id,
            p_clock_in: rec.clock_in,
            p_clock_out: rec.clock_out ?? null,
            p_in_terminal_id: rec.in_terminal_id ?? null,
            p_out_terminal_id: rec.out_terminal_id ?? null,
          });
          if (rpcError) throw rpcError;
          setUploadProgress(((i + 1) / directRecords.length) * 100);
        }

        toast({
          title: 'Upload Successful',
          description: `Saved ${directRecords.length} confirmed attendance records`,
        });

        // Reset
        setFile(null);
        setDirectRecords([]);
        setUploadMode('raw');
        onOpenChange(false);
      } else {
        // Raw scans: upload to raw_attendance_data
        const { data, error } = await uploadRawData(previewData);
        if (error) {
          toast({ title: 'Upload Failed', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Upload Successful', description: `Uploaded ${previewData.length} raw scans` });
          setFile(null);
          setPreviewData([]);
          setRejectedRecords([]);
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload Failed', description: 'An error occurred during upload', variant: 'destructive' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleProcessData = async () => {
    if (!previewData.length) return;

  setLoading(true);
  try {
    if (!previewData.length) return;
    const times = previewData.map(r => new Date(r.clocking_time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const dateFrom = new Date(minTime).toISOString().split('T')[0];
    const dateTo = new Date(maxTime).toISOString().split('T')[0];

    const result = await processRawDataRPC(dateFrom, dateTo, true);
    if (result.error) {
      toast({ title: 'Processing Failed', description: String(result.error), variant: 'destructive' });
    } else {
      const res: any = result.data || {};
      toast({
        title: 'Processing Complete',
        description: `Upserted ${res.upserted ?? 0}, marked processed ${res.raw_marked_processed ?? 0}, skipped unmatched ${res.skipped_unmatched ?? 0}`,
      });
      setFile(null);
      setPreviewData([]);
      setMatchResults([]);
      setShowSmartMatching(false);
      onOpenChange(false);
    }
  } catch (error) {
    console.error('Processing error:', error);
    toast({ title: 'Processing Failed', description: 'An error occurred during server processing', variant: 'destructive' });
  } finally {
    setLoading(false);
  }
  };

  const handleMatchingComplete = (results: EmployeeMatchResult[]) => {
    setMatchResults(results);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? 'block' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      
      <div className="relative bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Raw Data Upload</h2>
            <p className="text-sm text-muted-foreground">
              Upload and process raw attendance data from fingerprint devices
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Raw Data File
              </CardTitle>
              <CardDescription>
                Upload a text file (.txt) or Excel file containing raw attendance data. All records will be uploaded with match status: matched (valid employee ID), rejected (invalid employee ID), or unmatched.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">
                  {file ? file.name : 'Drop your file here or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports .txt, .xlsx, .xls, and .csv files
                </p>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".txt,.xlsx,.xls,.csv"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  Choose File
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Preview Section */}
          {previewData.length > 0 && !showSmartMatching && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Preview
                </CardTitle>
                <CardDescription>
                  {previewData.length} records found in the file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">{previewData.length}</div>
                      <div className="text-sm text-muted-foreground">Total Records</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {previewData.filter(r => r.match_status === 'matched').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Matched</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {previewData.filter(r => r.match_status === 'rejected').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Rejected</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {new Set(previewData.map(r => r.employee_id)).size}
                      </div>
                      <div className="text-sm text-muted-foreground">Unique Employees</div>
                    </div>
                  </div>

                  {/* Rejected Records Section */}
                  {rejectedRecords.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">Rejected Records ({rejectedRecords.length}):</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto border border-red-200 rounded-lg p-3">
                        {rejectedRecords.map((record, index) => (
                          <div key={index} className="p-2 bg-red-50 rounded-lg text-sm">
                            <div className="grid grid-cols-4 gap-4">
                              <span><strong>Emp ID:</strong> <span className="text-red-600">{record.employee_id}</span></span>
                              <span><strong>Name:</strong> {record.name}</span>
                              <span><strong>Time:</strong> {new Date(record.clocking_time).toLocaleString()}</span>
                              <span><strong>Terminal:</strong> {record.terminal_description}</span>
                            </div>
                            <div className="text-xs text-red-600 mt-1">Employee ID not found in system</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sample Records */}
                  <div>
                    <h4 className="font-medium mb-2">Sample Records (with Match Status):</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {previewData.slice(0, 5).map((record, index) => (
                        <div key={index} className={`p-3 rounded-lg text-sm border-l-4 ${
                          record.match_status === 'matched' 
                            ? 'bg-green-50 border-green-500' 
                            : record.match_status === 'rejected'
                            ? 'bg-red-50 border-red-500'
                            : 'bg-yellow-50 border-yellow-500'
                        }`}>
                          <div className="grid grid-cols-6 gap-3">
                            <span><strong>User ID:</strong> {record.user_id}</span>
                            <span><strong>Emp ID:</strong> {record.employee_id}</span>
                            <span><strong>Name:</strong> {record.name}</span>
                            <span><strong>Time:</strong> {new Date(record.clocking_time).toLocaleString()}</span>
                            <span><strong>Terminal:</strong> {record.terminal_description}</span>
                            <span>
                              <Badge variant={
                                record.match_status === 'matched' ? 'default' :
                                record.match_status === 'rejected' ? 'destructive' : 'secondary'
                              }>
                                {record.match_status?.toUpperCase() || 'UNKNOWN'}
                              </Badge>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Smart Matching Preview */}
          {showSmartMatching && previewData.length > 0 && (
            <SmartMatchingPreview 
              records={previewData}
              onMatchingComplete={handleMatchingComplete}
            />
          )}

          {/* User ID Mapping Section */}
          {userIdMappings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  User ID Mappings
                </CardTitle>
                <CardDescription>
                  Current mappings between fingerprint device IDs and employee IDs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 max-h-40 overflow-y-auto">
                  {userIdMappings.map((mapping) => (
                    <div key={mapping.user_id} className="p-3 bg-muted rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">{mapping.user_id}</span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="font-medium">{mapping.employee_id}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{mapping.employee_name}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {(previewData.length > 0 || directRecords.length > 0) && (
            <div className="flex gap-3 justify-end">
              {uploadMode === 'raw' && previewData.length > 0 && (
                <Button variant="outline" onClick={handleProcessData} disabled={loading}>
                  <Clock className="h-4 w-4 mr-2" />
                  Process Data
                </Button>
              )}
              <Button onClick={handleUpload} disabled={loading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploadMode === 'direct' ? 'Save Confirmed Records' : 'Upload All Records (with Status)'}
              </Button>
            </div>
          )}

          {/* Upload Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  {uploadProgress < 10 ? 'Reading file...' :
                   uploadProgress < 60 ? 'Parsing data...' :
                   uploadProgress < 90 ? 'Verifying employees...' :
                   uploadProgress < 100 ? 'Finalizing...' : 'Processing...'}
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
