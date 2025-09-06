import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAttendance } from '@/hooks/useAttendance';
import * as XLSX from 'xlsx';

interface FingerprintUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FingerprintRecord {
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  device_id?: string;
}

export function FingerprintUploadDialog({ open, onOpenChange }: FingerprintUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewData, setPreviewData] = useState<FingerprintRecord[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const { toast } = useToast();
  const { clockInOut } = useAttendance();

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
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel (.xlsx, .xls) or CSV file",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let workbook;
        
        if (file.type === 'text/csv') {
          workbook = XLSX.read(data, { type: 'string' });
        } else {
          workbook = XLSX.read(data, { type: 'binary' });
        }
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Parse the fingerprint data
        const fingerprintRecords: FingerprintRecord[] = jsonData.map((row: any) => ({
          employee_id: row['Employee ID'] || row['employee_id'] || '',
          date: formatDate(row['Date'] || row['date']),
          clock_in: row['Clock In'] || row['clock_in'] || row['Time In'],
          clock_out: row['Clock Out'] || row['clock_out'] || row['Time Out'],
          device_id: row['Device ID'] || row['device_id'] || ''
        })).filter(record => record.employee_id && record.date);

        setPreviewData(fingerprintRecords);
        
        if (fingerprintRecords.length === 0) {
          toast({
            title: "No Valid Data",
            description: "No valid attendance records found in the file",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "File Parsing Error",
          description: "Unable to parse the uploaded file",
          variant: "destructive"
        });
      }
    };

    if (file.type === 'text/csv') {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const formatDate = (dateValue: any): string => {
    if (!dateValue) return '';
    
    // Handle Excel date serial numbers
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }
    
    return '';
  };

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
      const totalRecords = previewData.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < previewData.length; i++) {
        const record = previewData[i];
        
        // Process clock in
        if (record.clock_in) {
          const result = await clockInOut({
            employee_id: record.employee_id,
            action: 'clock_in',
            timestamp: `${record.date}T${record.clock_in}:00`,
          });
          
          if (result.error) {
            errorCount++;
          } else {
            successCount++;
          }
        }

        // Process clock out
        if (record.clock_out) {
          const result = await clockInOut({
            employee_id: record.employee_id,
            action: 'clock_out',
            timestamp: `${record.date}T${record.clock_out}:00`,
          });
          
          if (result.error) {
            errorCount++;
          } else {
            successCount++;
          }
        }

        setUploadProgress(Math.round(((i + 1) / totalRecords) * 100));
        
        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({
        title: "Upload Complete",
        description: `Successfully processed ${successCount} records. ${errorCount} errors occurred.`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      if (successCount > 0) {
        setFile(null);
        setPreviewData([]);
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "An error occurred during upload",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setUploadProgress(0);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Fingerprint Data
              </CardTitle>
              <CardDescription>
                Import attendance data from fingerprint devices
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {!file && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse and select a file
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Format Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">File Format Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Supported Formats:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Excel files (.xlsx, .xls)</li>
                        <li>• CSV files (.csv)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Required Columns:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <code>Employee ID</code> - Employee identifier</li>
                        <li>• <code>Date</code> - Date of attendance</li>
                        <li>• <code>Clock In</code> - Clock in time (HH:MM format)</li>
                        <li>• <code>Clock Out</code> - Clock out time (HH:MM format)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {file && previewData.length > 0 && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {previewData.length} records found
                    </p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => {
                  setFile(null);
                  setPreviewData([]);
                }}>
                  Remove File
                </Button>
              </div>

              {/* Upload Progress */}
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading attendance records...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Preview Table */}
              <div className="border rounded-lg max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3">Employee ID</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Clock In</th>
                      <th className="text-left p-3">Clock Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((record, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{record.employee_id}</td>
                        <td className="p-3">{record.date}</td>
                        <td className="p-3">{record.clock_in || '-'}</td>
                        <td className="p-3">{record.clock_out || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">
                    ... and {previewData.length - 10} more records
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={loading || previewData.length === 0}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Upload {previewData.length} Records
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}