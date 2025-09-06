import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEmployeeUpdates, type EmployeeUpdateData, type UploadProgress } from '@/hooks/useEmployeeUpdates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function BulkUploadDialog({ open, onOpenChange, onSuccess }: BulkUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<EmployeeUpdateData[] | null>(null);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; created: number; updated: number; errors: Array<{ row: number; employee_id: string; error: string }> } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  
  const { loading, progress, uploadEmployeeData } = useEmployeeUpdates();

  const downloadTemplate = () => {
    const template = [
      {
        employee_id: 'EMP001',
        english_name: 'John Doe',
        arabic_name: 'جون دو',
        status: 'active',
        position: 'Software Engineer',
        personal_email: 'john.doe@email.com',
        qualifications: 'Bachelor of Computer Science',
        nationality: 'American',
        gender: 'Male',
        marital_status: 'Single',
        id_number: '123456789',
        issuing_body: 'Government ID',
        birth_place: 'New York',
        work_phone: '+1234567890',
        home_phone: '+1234567891',
        nok_person: 'Emergency Contact',
        nok_name: 'Jane Doe',
        nok_phone_number: '+1234567892',
        category: 'Full Time',
        date_of_joining: '2024-01-01',
        date_of_leaving: '',
        issue_date: '2020-01-01',
        birth_date: '1990-01-01'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employee Data Template');
    XLSX.writeFile(wb, 'employee_data_template.xlsx');
  };

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setPreviewData(null);
    setUploadResult(null);
    setStep('upload');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.includes('sheet') || droppedFile.type.includes('csv'))) {
      handleFileChange(droppedFile);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet) as EmployeeUpdateData[];
      
      if (data.length === 0) {
        throw new Error('The file appears to be empty');
      }

      setPreviewData(data);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing file:', error);
      setUploadResult({
        success: false,
        created: 0,
        updated: 0,
        errors: [{ row: 0, employee_id: 'N/A', error: error instanceof Error ? error.message : 'Unknown error' }]
      });
      setStep('result');
    }
  };

  const handleConfirmUpload = async () => {
    if (!previewData) return;

    try {
      const result = await uploadEmployeeData(previewData, setUploadProgress);
      setUploadResult(result);
      setStep('result');
      
      if (result.success) {
        onSuccess?.();
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      setUploadResult({
        success: false,
        created: 0,
        updated: 0,
        errors: [{ row: 0, employee_id: 'N/A', error: error instanceof Error ? error.message : 'Unknown error' }]
      });
      setStep('result');
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreviewData(null);
    setUploadResult(null);
    setUploadProgress(null);
    setStep('upload');
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'preview') {
      setStep('upload');
    } else if (step === 'result') {
      setStep('upload');
      setUploadResult(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Data Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center space-x-4 text-sm">
            <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                step === 'upload' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
              }`}>
                1
              </div>
              <span>Upload File</span>
            </div>
            <div className="w-8 h-0.5 bg-muted"></div>
            <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                step === 'preview' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
              }`}>
                2
              </div>
              <span>Preview & Confirm</span>
            </div>
            <div className="w-8 h-0.5 bg-muted"></div>
            <div className={`flex items-center space-x-2 ${step === 'result' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                step === 'result' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
              }`}>
                3
              </div>
              <span>Results</span>
            </div>
          </div>

          {step === 'upload' && (
            <>
              {/* Instructions */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload an Excel file to create new employees or update existing ones based on Employee ID. 
                  If an Employee ID already exists, the record will be updated. Otherwise, a new employee will be created.
                </AlertDescription>
              </Alert>

              {/* Template Download */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Download Template</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Download a template file with the correct column headers and sample data.
                  </p>
                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <div className="space-y-2">
                      <p className="text-lg font-medium">
                        {file ? file.name : 'Choose a file or drag it here'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports Excel (.xlsx, .xls) and CSV files
                      </p>
                    </div>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                      className="hidden"
                      id="file-upload"
                    />
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      type="button"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      Select File
                    </Button>
                  </div>

                  {file && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm font-medium">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileChange(null)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {step === 'preview' && previewData && (
            <>
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  Review the data below and confirm the actions to be performed. This will show you what employees will be created or updated.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Preview & Actions Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 text-sm">
                      <Badge variant="secondary">
                        Total Records: {previewData.length}
                      </Badge>
                      <Badge variant="outline">
                        Will be processed on confirmation
                      </Badge>
                    </div>
                    
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-muted px-4 py-2 font-medium text-sm">
                        Sample Data Preview (First 5 records)
                      </div>
                      <div className="max-h-60 overflow-auto">
                        <div className="space-y-2 p-4">
                          {previewData.slice(0, 5).map((employee, index) => (
                            <div key={index} className="border rounded p-3 bg-background">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">Employee ID:</span>
                                  <span className="text-primary">{employee.employee_id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">Name:</span>
                                  <span>{employee.english_name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">Position:</span>
                                  <span>{employee.position || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">Status:</span>
                                  <Badge variant="outline" className="text-xs">
                                    {employee.status || 'active'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                          {previewData.length > 5 && (
                            <div className="text-center text-sm text-muted-foreground py-2">
                              ... and {previewData.length - 5} more records
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Actions to be performed:</strong>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li>• Existing employees (matching Employee ID) will be updated with new data</li>
                          <li>• New employees (non-matching Employee ID) will be created</li>
                          <li>• Empty fields will not overwrite existing data for updates</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Upload Progress */}
          {(loading || uploadProgress) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {uploadProgress && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Processing: {uploadProgress.currentEmployee}</span>
                        <span>{uploadProgress.current} of {uploadProgress.total}</span>
                      </div>
                      <Progress 
                        value={(uploadProgress.current / uploadProgress.total) * 100} 
                        className="w-full"
                      />
                      <div className="text-center text-sm text-muted-foreground">
                        {uploadProgress.current === uploadProgress.total 
                          ? 'Finalizing upload...' 
                          : `Processing employee ${uploadProgress.current} of ${uploadProgress.total}`
                        }
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Results */}
          {step === 'result' && uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  {uploadResult.success ? (
                    <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="mr-2 h-5 w-5 text-red-500" />
                  )}
                  Upload Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {uploadResult.created}
                      </div>
                      <div className="text-sm text-green-700">Created</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {uploadResult.updated}
                      </div>
                      <div className="text-sm text-blue-700">Updated</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {uploadResult.errors.length}
                      </div>
                      <div className="text-sm text-red-700">Errors</div>
                    </div>
                  </div>

                  {uploadResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-destructive">Errors:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {uploadResult.errors.map((error, index) => (
                          <div
                            key={index}
                            className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400"
                          >
                            <span className="font-medium">Row {error.row}:</span>{' '}
                            {error.employee_id && (
                              <span className="text-muted-foreground">
                                ({error.employee_id})
                              </span>
                            )}{' '}
                            {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div>
              {(step === 'preview' || step === 'result') && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {step === 'upload' && (
                <Button
                  onClick={handlePreview}
                  disabled={!file || loading}
                  className="min-w-24"
                >
                  {loading ? 'Processing...' : 'Preview Data'}
                </Button>
              )}
              {step === 'preview' && (
                <Button
                  onClick={handleConfirmUpload}
                  disabled={!previewData || loading}
                  className="min-w-24"
                >
                  {loading ? 'Uploading...' : 'Confirm & Upload'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}